// Agenda de consultas — telas nunca importam `firebase/firestore`
// diretamente, só este arquivo (ver CONTEXTO.md, seção 3). Assinaturas
// exatas e formato de retorno na seção 8.
//
// As funções do paciente / agenda devolvem o formato de tela (camelCase).
// As de gestão (listarConsultas, criarConsulta...) trabalham com o próprio
// documento (snake_case), que é o que o formulário do CRUD edita.

import { COLECOES, atualizar, criar, listar, obter, remover } from './crudService';
import { nomeDoUsuario } from './usuarioService';

function paraData(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor.toDate === 'function') return valor.toDate();
  return new Date(valor);
}

function paraConsultaTela(consulta, especialidades) {
  return {
    id: consulta.id,
    profissionalId: consulta.profissional_id,
    profissionalNome: consulta.profissional_nome,
    especialidade: especialidades.get(consulta.profissional_id) ?? '',
    pacienteId: consulta.paciente_id,
    pacienteNome: consulta.paciente_nome,
    dataHora: paraData(consulta.data_hora),
    modalidade: consulta.modalidade,
    status: consulta.status,
    ehRetorno: consulta.eh_retorno,
    resumo: consulta.evolucao?.conduta ?? consulta.evolucao?.queixa_principal ?? '',
  };
}

// Mapa profissionalId → especialidade. Uma leitura só por chamada, em vez de
// uma por consulta (a consulta guarda só o nome do profissional).
async function mapaDeEspecialidades() {
  const profissionais = await listar(COLECOES.usuarios, {
    filtros: [['tipo', '==', 'profissional']],
  });
  return new Map(profissionais.map((p) => [p.id, p.profissional?.especialidade ?? '']));
}

async function consultasParaTela(consultas) {
  const especialidades = await mapaDeEspecialidades();
  return consultas.map((c) => paraConsultaTela(c, especialidades));
}

function mesmoDia(dataA, dataB) {
  const a = paraData(dataA);
  const b = paraData(dataB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const STATUS_FUTUROS = ['agendada', 'confirmada'];
const STATUS_HISTORICO = ['realizada', 'cancelada'];

export const STATUS_CONSULTA = ['agendada', 'confirmada', 'realizada', 'cancelada'];
export const MODALIDADES_CONSULTA = ['presencial', 'teleconsulta'];

async function consultasDoPaciente(pacienteId) {
  return listar(COLECOES.consultas, { filtros: [['paciente_id', '==', pacienteId]] });
}

export async function listarProximasConsultas(pacienteId) {
  const consultas = (await consultasDoPaciente(pacienteId))
    .filter((c) => STATUS_FUTUROS.includes(c.status))
    .sort((a, b) => paraData(a.data_hora) - paraData(b.data_hora));
  return consultasParaTela(consultas);
}

export async function listarHistoricoConsultas(pacienteId, filtro = 'todas') {
  const consultas = (await consultasDoPaciente(pacienteId))
    .filter((c) => STATUS_HISTORICO.includes(c.status))
    .filter((c) => filtro === 'todas' || c.modalidade === filtro)
    .sort((a, b) => paraData(b.data_hora) - paraData(a.data_hora));
  return consultasParaTela(consultas);
}

export async function agendarConsulta({ pacienteId, profissionalId, dataHora, modalidade }) {
  const anteriores = await consultasDoPaciente(pacienteId);
  const jaTeveConsulta = anteriores.some(
    (c) => c.profissional_id === profissionalId && c.status === 'realizada'
  );

  const { id } = await criarConsulta({
    paciente_id: pacienteId,
    profissional_id: profissionalId,
    data_hora: paraData(dataHora),
    modalidade,
    status: 'agendada',
    eh_retorno: jaTeveConsulta,
  });

  const [nova] = await consultasParaTela([await obterConsultaDoc(id)]);
  return nova;
}

export async function confirmarPresenca(consultaId) {
  await obterConsultaDoc(consultaId);
  await atualizar(COLECOES.consultas, consultaId, { status: 'confirmada' });
}

export async function reagendarConsulta(consultaId, novaDataHora) {
  await obterConsultaDoc(consultaId);
  await atualizar(COLECOES.consultas, consultaId, {
    data_hora: paraData(novaDataHora),
    status: 'agendada',
  });
  const [reagendada] = await consultasParaTela([await obterConsultaDoc(consultaId)]);
  return reagendada;
}

// Grade fixa de horários comerciais, de 30 em 30 minutos, menos os que já
// estão ocupados pelo profissional naquele dia. Sem atendimento aos fins de
// semana.
export async function listarHorariosDisponiveis(profissionalId, data) {
  const diaDaSemana = paraData(data).getDay();
  if (diaDaSemana === 0 || diaDaSemana === 6) return [];

  const doProfissional = await listar(COLECOES.consultas, {
    filtros: [['profissional_id', '==', profissionalId]],
  });
  const ocupados = new Set(
    doProfissional
      .filter((c) => STATUS_FUTUROS.includes(c.status) && mesmoDia(c.data_hora, data))
      .map((c) => {
        const d = paraData(c.data_hora);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      })
  );

  const horarios = [];
  for (let hora = 9; hora < 18; hora += 1) {
    for (const minuto of [0, 30]) {
      if (hora === 12) continue; // almoço
      const horario = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
      if (!ocupados.has(horario)) horarios.push(horario);
    }
  }
  return horarios;
}

export async function listarAgendaProfissional(profissionalId, data) {
  const doProfissional = await listar(COLECOES.consultas, {
    filtros: [['profissional_id', '==', profissionalId]],
  });
  const doDia = doProfissional
    .filter((c) => c.status !== 'cancelada' && mesmoDia(c.data_hora, data))
    .sort((a, b) => paraData(a.data_hora) - paraData(b.data_hora));
  return consultasParaTela(doDia);
}

export async function registrarEvolucao(consultaId, evolucao) {
  await obterConsultaDoc(consultaId);
  await atualizar(COLECOES.consultas, consultaId, {
    status: 'realizada',
    evolucao: {
      queixa_principal: evolucao.queixaPrincipal ?? '',
      cid: evolucao.cid ?? '',
      alternativas_terapeuticas_previas: evolucao.alternativasTerapeuticasPrevias ?? '',
      conduta: evolucao.conduta ?? '',
      data_registro: new Date(),
    },
  });
}

// --- Gestão (CRUD) ---------------------------------------------------------------

// filtro: 'todas' | 'agendada' | 'confirmada' | 'realizada' | 'cancelada'
export async function listarConsultas(filtro = 'todas') {
  const filtros = filtro === 'todas' ? [] : [['status', '==', filtro]];
  return listar(COLECOES.consultas, { filtros, ordenarPor: 'data_hora', direcao: 'desc' });
}

export async function obterConsultaDoc(id) {
  const consulta = await obter(COLECOES.consultas, id);
  if (!consulta) throw new Error('Consulta não encontrada.');
  return consulta;
}

function validarConsulta(dados) {
  if (!dados.paciente_id) throw new Error('Selecione o paciente.');
  if (!dados.profissional_id) throw new Error('Selecione o profissional.');
  if (!(dados.data_hora instanceof Date) || Number.isNaN(dados.data_hora.getTime())) {
    throw new Error('Informe uma data e hora válidas.');
  }
  if (!MODALIDADES_CONSULTA.includes(dados.modalidade)) throw new Error('Selecione a modalidade.');
  if (!STATUS_CONSULTA.includes(dados.status)) throw new Error('Selecione o status.');
}

// Preenche as cópias (`paciente_nome`, `profissional_nome`) buscando os
// documentos referenciados — a tela envia só os ids.
async function paraDocumentoConsulta(dados) {
  const [paciente, profissional] = await Promise.all([
    obter(COLECOES.usuarios, dados.paciente_id),
    obter(COLECOES.usuarios, dados.profissional_id),
  ]);
  if (!paciente || paciente.tipo !== 'paciente') throw new Error('Paciente não encontrado.');
  if (!profissional || profissional.tipo !== 'profissional') {
    throw new Error('Profissional não encontrado.');
  }

  const documento = {
    paciente_id: dados.paciente_id,
    paciente_nome: nomeDoUsuario(paciente),
    profissional_id: dados.profissional_id,
    profissional_nome: nomeDoUsuario(profissional),
    data_hora: dados.data_hora,
    modalidade: dados.modalidade,
    status: dados.status,
    eh_retorno: Boolean(dados.eh_retorno),
  };

  const ev = dados.evolucao;
  const evolucaoPreenchida =
    ev && (ev.queixa_principal || ev.cid || ev.alternativas_terapeuticas_previas || ev.conduta);
  if (evolucaoPreenchida) {
    documento.evolucao = {
      queixa_principal: ev.queixa_principal ?? '',
      cid: ev.cid ?? '',
      alternativas_terapeuticas_previas: ev.alternativas_terapeuticas_previas ?? '',
      conduta: ev.conduta ?? '',
      data_registro: ev.data_registro ?? new Date(),
    };
  } else {
    documento.evolucao = null;
  }

  return documento;
}

export async function criarConsulta(dados) {
  validarConsulta(dados);
  return criar(COLECOES.consultas, await paraDocumentoConsulta(dados));
}

export async function atualizarConsulta(id, dados) {
  validarConsulta(dados);
  await atualizar(COLECOES.consultas, id, await paraDocumentoConsulta(dados));
}

export async function removerConsulta(id) {
  await remover(COLECOES.consultas, id);
}
