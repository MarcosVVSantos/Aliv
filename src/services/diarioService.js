// Diário de sintomas e doses — a tela mais importante do app (ver CONTEXTO.md,
// seção 7.8). Telas nunca importam `firebase/firestore` diretamente, só
// este arquivo. Assinaturas exatas e formato de retorno na seção 8.
//
// Duas coleções raiz, ambas filtradas por `paciente_id`:
//   - `registros_diarios`: o registro do dia (sintoma, efeitos, humor, sono);
//   - `doses`: uma dose só existe como documento quando o paciente age
//     ("tomada" ou "pulada"). As doses esperadas do dia vêm dos `horarios`
//     das prescrições vigentes, e o status de cada uma é calculado
//     (tomada / pendente / perdida) — nunca gravado.

import { COLECOES, criarComId, listar } from './crudService';
import { listarPrescricoesVigentes, obterPrescricaoDoc } from './prescricaoService';
import { criarRegistro, listarRegistros } from './registroService';
import { idDaDose, statusDaDose } from '../utils/dose';
import { dataDeChave, dataLocalISO } from '../utils/data';
import { periodoDoHorario } from '../utils/prescricao';

// --- Datas de calendário ('AAAA-MM-DD') ---------------------------------------

function paraChave(data) {
  return typeof data === 'string' ? data : dataLocalISO(data ?? new Date());
}

function somarDias(chave, dias) {
  const data = dataDeChave(chave);
  data.setDate(data.getDate() + dias);
  return dataLocalISO(data);
}

// Primeiro dia de uma janela de `dias` dias que termina em `hoje` (inclusive).
function inicioDaJanela(dias, hoje) {
  return somarDias(dataLocalISO(hoje), -(dias - 1));
}

// --- Doses esperadas e doses gravadas -----------------------------------------

// Um "horário de dose" por (produto, horário) das prescrições vigentes. São os
// mesmos todo dia enquanto a prescrição valer.
function horariosDeDose(prescricoes) {
  const porChave = new Map();
  prescricoes.forEach((prescricao) => {
    prescricao.itens.forEach((item) => {
      (item.horarios ?? []).forEach((horario) => {
        const chave = `${horario}|${item.produtoId}`;
        if (porChave.has(chave)) return;
        porChave.set(chave, {
          prescricaoId: prescricao.id,
          produtoId: item.produtoId,
          produtoNome: item.produtoNome,
          dose: Number(item.doseInicial) || 0,
          unidade: item.unidadeDose || '',
          via: item.viaAdministracao || '',
          horario,
          periodo: periodoDoHorario(horario),
        });
      });
    });
  });
  return [...porChave.values()].sort(
    (a, b) => a.horario.localeCompare(b.horario) || a.produtoNome.localeCompare(b.produtoNome)
  );
}

// Documentos de `doses` do paciente entre duas datas (inclusive), por ID.
// Consulta única (`paciente_id` + faixa de `data`): exige o índice composto
// `doses (paciente_id ASC, data ASC)` no Firestore.
async function listarDocsDeDoses(pacienteId, de, ate) {
  const docs = await listar(COLECOES.doses, {
    filtros: [
      ['paciente_id', '==', pacienteId],
      ['data', '>=', de],
      ['data', '<=', ate],
    ],
  });
  return new Map(docs.map((d) => [d.id, d]));
}

// Cruza os horários esperados com o que foi gravado e calcula o status.
function montarDosesDoDia(horarios, docs, pacienteId, data, agora) {
  return horarios.map((h) => {
    const id = idDaDose(pacienteId, data, h.horario, h.produtoId);
    const registro = docs.get(id);
    return {
      id,
      prescricaoId: h.prescricaoId,
      produtoId: h.produtoId,
      produtoNome: h.produtoNome,
      data,
      periodo: h.periodo,
      horario: h.horario,
      // Se o paciente ajustou a quantidade ao marcar, vale a que ele gravou.
      dose: registro?.quantidade ?? h.dose,
      unidade: registro?.unidade ?? h.unidade,
      via: h.via,
      status: statusDaDose(registro, data, h.horario, agora),
    };
  });
}

// [{ id, prescricaoId, produtoId, produtoNome, data, periodo, horario, dose,
//    unidade, via, status: 'tomada' | 'pendente' | 'perdida' }]
export async function listarDosesDoDia(pacienteId, data = new Date()) {
  const chave = paraChave(data);
  const agora = new Date();
  const [prescricoes, docs] = await Promise.all([
    listarPrescricoesVigentes(pacienteId, agora),
    listarDocsDeDoses(pacienteId, chave, chave),
  ]);
  return montarDosesDoDia(horariosDeDose(prescricoes), docs, pacienteId, chave, agora);
}

// Grava a dose com ID fixo: tocar duas vezes atualiza o mesmo documento.
// `opcoes.quantidade` / `opcoes.unidade` permitem ajustar o que foi tomado; sem
// eles vale a dose prescrita.
async function registrarDose(status, pacienteId, prescricaoId, produtoId, data, horario, opcoes = {}) {
  const chave = paraChave(data);
  if (!dataDeChave(chave)) throw new Error('Data inválida.');

  const prescricao = await obterPrescricaoDoc(prescricaoId);
  const item = (prescricao.itens ?? []).find((i) => i.produto_id === produtoId);
  if (prescricao.paciente_id !== pacienteId || !(item?.horarios ?? []).includes(horario)) {
    throw new Error('Dose não encontrada.');
  }

  const { quantidade, unidade } = opcoes;
  const id = idDaDose(pacienteId, chave, horario, produtoId);
  await criarComId(COLECOES.doses, id, {
    paciente_id: pacienteId,
    prescricao_id: prescricaoId,
    produto_id: produtoId,
    data: chave,
    horario_previsto: horario,
    quantidade: Number.isFinite(quantidade) && quantidade > 0 ? quantidade : item.dose_inicial,
    unidade: unidade || item.unidade_dose,
    status,
    registrado_em: new Date(),
  });
  return { id, status };
}

export function marcarDoseTomada(pacienteId, prescricaoId, produtoId, data, horario, opcoes) {
  return registrarDose('tomada', pacienteId, prescricaoId, produtoId, data, horario, opcoes);
}

export function marcarDosePulada(pacienteId, prescricaoId, produtoId, data, horario, opcoes) {
  return registrarDose('pulada', pacienteId, prescricaoId, produtoId, data, horario, opcoes);
}

// Situação do dia: 'completo' (todas tomadas), 'parcial' (algumas tomadas),
// 'perdido' (nenhuma tomada e já há dose perdida) ou 'futuro' (nada a julgar
// ainda: dia sem doses esperadas, ou dia em andamento sem nenhuma tomada).
function situacaoDoDia(doses) {
  if (doses.length === 0) return 'futuro';
  const tomadas = doses.filter((d) => d.status === 'tomada').length;
  if (tomadas === doses.length) return 'completo';
  const haPerdida = doses.some((d) => d.status === 'perdida');
  if (!haPerdida) return tomadas > 0 ? 'parcial' : 'futuro';
  return tomadas > 0 ? 'parcial' : 'perdido';
}

// "X de N doses": N é o total previsto no período (2 horários × 7 dias = 14),
// não o número de dias. A janela são os últimos 7 dias terminando em `hoje`.
//
// { tomadas, previstas, dias: [{ data: 'AAAA-MM-DD', situacao }] }
export async function obterAdesaoSemana(pacienteId, hoje = new Date()) {
  const fim = dataLocalISO(hoje);
  const inicio = somarDias(fim, -6);
  const [prescricoes, docs] = await Promise.all([
    listarPrescricoesVigentes(pacienteId, hoje),
    listarDocsDeDoses(pacienteId, inicio, fim),
  ]);
  const horarios = horariosDeDose(prescricoes);

  let tomadas = 0;
  let previstas = 0;
  const dias = [];
  for (let i = 0; i < 7; i += 1) {
    const data = somarDias(inicio, i);
    if (data > fim) {
      dias.push({ data, situacao: 'futuro' });
      continue;
    }
    const doses = montarDosesDoDia(horarios, docs, pacienteId, data, hoje);
    previstas += doses.length;
    tomadas += doses.filter((d) => d.status === 'tomada').length;
    dias.push({ data, situacao: situacaoDoDia(doses) });
  }

  return { tomadas, previstas, dias };
}

// --- Registro diário --------------------------------------------------------------

function paraRegistroTela(registro) {
  if (!registro) return null;
  return {
    id: registro.id,
    data: dataDeChave(registro.data),
    escalaSintoma: registro.escala_sintoma,
    observacao: registro.observacao,
    humor: registro.humor,
    qualidadeSono: registro.qualidade_sono,
    efeitosAdversos: (registro.efeitos_adversos ?? []).map((e) => e.descricao),
    semEfeitosAdversos: registro.sem_efeitos_adversos,
  };
}

export async function obterRegistroDoDia(pacienteId, data = new Date()) {
  const chave = paraChave(data);
  const registro = (await listarRegistros(pacienteId)).find((r) => r.data === chave);
  return paraRegistroTela(registro);
}

// Um registro por paciente por dia: salvar de novo o mesmo dia atualiza. Os três
// estados de efeitos adversos: `semEfeitosAdversos` true com lista vazia (marcou
// "Nenhum"), false com itens (relatou) ou false com lista vazia (não preencheu).
export async function salvarRegistroDiario(
  pacienteId,
  { escalaSintoma, efeitosAdversos = [], semEfeitosAdversos = false, humor, qualidadeSono, observacao = '' }
) {
  await criarRegistro({
    paciente_id: pacienteId,
    data: dataLocalISO(new Date()),
    escala_sintoma: escalaSintoma,
    efeitos_adversos: efeitosAdversos.map((descricao) => ({ descricao })),
    sem_efeitos_adversos: semEfeitosAdversos,
    observacao,
    humor: humor ?? '',
    qualidade_sono: qualidadeSono ?? '',
  });
}

async function registrosDosUltimosDias(pacienteId, dias, hoje) {
  const inicio = inicioDaJanela(dias, hoje);
  const fim = dataLocalISO(hoje);
  return (await listarRegistros(pacienteId)).filter((r) => r.data >= inicio && r.data <= fim);
}

// Registros mais recentes primeiro, cada um com as doses tomadas naquele dia.
export async function listarRegistrosDiarios(pacienteId, dias = 30) {
  const hoje = new Date();
  const [registros, prescricoes, docs] = await Promise.all([
    registrosDosUltimosDias(pacienteId, dias, hoje),
    listarPrescricoesVigentes(pacienteId, hoje),
    listarDocsDeDoses(pacienteId, inicioDaJanela(dias, hoje), dataLocalISO(hoje)),
  ]);
  const dosesPrevistas = horariosDeDose(prescricoes).length;
  const tomadasPorDia = contarTomadasPorDia(docs);

  return registros.map((registro) => ({
    ...paraRegistroTela(registro),
    dosesTomadas: tomadasPorDia.get(registro.data) ?? 0,
    dosesPrevistas,
  }));
}

function contarTomadasPorDia(docs) {
  const contagem = new Map();
  docs.forEach((d) => {
    if (d.status === 'tomada') contagem.set(d.data, (contagem.get(d.data) ?? 0) + 1);
  });
  return contagem;
}

export async function obterEvolucao(pacienteId, periodoDias = 30) {
  const hoje = new Date();
  const [registros, prescricoes, docs] = await Promise.all([
    registrosDosUltimosDias(pacienteId, periodoDias, hoje),
    listarPrescricoesVigentes(pacienteId, hoje),
    listarDocsDeDoses(pacienteId, inicioDaJanela(periodoDias, hoje), dataLocalISO(hoje)),
  ]);
  const completos = [...registros].sort((a, b) => a.data.localeCompare(b.data));
  const dosesPrevistasPorDia = horariosDeDose(prescricoes).length;
  const tomadasPorDia = contarTomadasPorDia(docs);

  const pontos = completos.map((r) => ({
    data: dataDeChave(r.data),
    escalaSintoma: r.escala_sintoma,
    dosesTomadas: tomadasPorDia.get(r.data) ?? 0,
    dosesPrevistas: dosesPrevistasPorDia,
  }));

  const diasRegistrados = completos.length;
  const mediaSintoma = diasRegistrados
    ? Number((completos.reduce((s, r) => s + r.escala_sintoma, 0) / diasRegistrados).toFixed(1))
    : 0;

  const dosesTomadasNoPeriodo = [...tomadasPorDia.values()].reduce((s, n) => s + n, 0);
  const dosesPrevistasNoPeriodo = dosesPrevistasPorDia * periodoDias;
  const adesao = dosesPrevistasNoPeriodo
    ? Math.min(100, Math.round((dosesTomadasNoPeriodo / dosesPrevistasNoPeriodo) * 100))
    : 0;

  const contagemEfeitos = new Map();
  completos.forEach((r) => {
    (r.efeitos_adversos ?? []).forEach(({ descricao }) => {
      contagemEfeitos.set(descricao, (contagemEfeitos.get(descricao) ?? 0) + 1);
    });
  });
  const efeitosMaisRelatados = [...contagemEfeitos.entries()]
    .map(([descricao, contagem]) => ({ descricao, contagem }))
    .sort((a, b) => b.contagem - a.contagem);

  return { pontos, mediaSintoma, diasRegistrados, adesao, efeitosMaisRelatados };
}
