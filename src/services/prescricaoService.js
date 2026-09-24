// Prescrições — telas nunca importam `firebase/firestore` diretamente, só
// este arquivo (ver CONTEXTO.md, seção 3). Assinaturas exatas e formato de
// retorno na seção 8.
//
// ⚠️ O documento só grava `status: 'rascunho' | 'ativa' | 'cancelada'`. A
// situação mostrada na tela (`ativa` / `vence_em_breve` / `vencida`...) nunca
// é lida do documento: vem de `situacaoPrescricao` (src/utils/prescricao.js),
// calculada de `data_validade`. Idem a posologia em texto, montada de dose,
// unidade, via e `horarios`.

import { COLECOES, atualizar, criar, listar, obter, remover } from './crudService';
import { nomeDoUsuario } from './usuarioService';
import { diasEntre } from '../utils/formatadores';
import { nomeExibicaoProduto } from '../utils/produto';
import {
  normalizarHorarios,
  prescricaoEstaVigente,
  situacaoPrescricao,
  textoFrequencia,
  textoPosologia,
} from '../utils/prescricao';

export const STATUS_PRESCRICAO = ['rascunho', 'ativa', 'cancelada'];

const DIAS_VALIDADE_PADRAO = 365;

function paraData(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor.toDate === 'function') return valor.toDate();
  return new Date(valor);
}

// Mapa profissionalId → { nome, conselho, numRegistro }. Uma leitura por
// chamada em vez de uma por prescrição.
async function mapaDeProfissionais() {
  const profissionais = await listar(COLECOES.usuarios, {
    filtros: [['tipo', '==', 'profissional']],
  });
  return new Map(
    profissionais.map((p) => [
      p.id,
      {
        nome: p.profissional?.nome_completo ?? '',
        conselho: p.profissional?.conselho ?? '',
        numRegistro: p.profissional?.num_registro ?? '',
      },
    ])
  );
}

function paraPrescricaoTela(prescricao, profissionais, hoje = new Date()) {
  const profissional = profissionais.get(prescricao.profissional_id);
  const validade = paraData(prescricao.data_validade);
  return {
    id: prescricao.id,
    consultaId: prescricao.consulta_id,
    pacienteId: prescricao.paciente_id,
    pacienteNome: prescricao.paciente_nome ?? '',
    dataEmissao: paraData(prescricao.data_emissao),
    dataValidade: validade,
    diasRestantes: validade ? diasEntre(hoje, validade) : null,
    // `status` é o valor gravado; `situacao` é o calculado — as telas usam só ela.
    status: prescricao.status,
    situacao: situacaoPrescricao(prescricao, hoje),
    cid: prescricao.cid ?? null,
    tipoReceituario: prescricao.tipo_receituario,
    justificativaClinica: prescricao.justificativa_clinica,
    profissionalNome: profissional?.nome ?? prescricao.profissional_nome ?? '',
    conselho: profissional?.conselho ?? '',
    numRegistro: profissional?.numRegistro ?? '',
    sintomaAlvo: prescricao.sintoma_alvo,
    itens: (prescricao.itens ?? []).map((item) => ({
      produtoId: item.produto_id,
      produtoNome: nomeExibicaoProduto(item.produto_nome, item.teor_cbd, item.volume_ml),
      teorCbd: item.teor_cbd,
      teorThc: item.teor_thc,
      doseInicial: item.dose_inicial,
      unidadeDose: item.unidade_dose,
      viaAdministracao: item.via_administracao,
      horarios: item.horarios ?? [],
      duracaoDias: item.duracao_dias,
      instrucoesUso: item.instrucoes_uso ?? '',
      // Calculados na exibição, nunca gravados.
      frequencia: textoFrequencia(item.horarios),
      posologia: textoPosologia(item),
    })),
  };
}

async function prescricoesParaTela(prescricoes) {
  const profissionais = await mapaDeProfissionais();
  return prescricoes.map((p) => paraPrescricaoTela(p, profissionais));
}

async function prescricoesDoPaciente(pacienteId) {
  const filtros = pacienteId ? [['paciente_id', '==', pacienteId]] : [];
  return listar(COLECOES.prescricoes, { filtros, ordenarPor: 'data_emissao', direcao: 'desc' });
}

// Rascunho e cancelada nunca contam como "a receita do paciente". Um
// `status: 'vencida'` legado (modelo v1) continua contando: a situação real
// vem da validade.
function contaComoReceita(prescricao) {
  return prescricao.status !== 'rascunho' && prescricao.status !== 'cancelada';
}

export async function obterPrescricaoAtiva(pacienteId) {
  const doPaciente = (await prescricoesDoPaciente(pacienteId)).filter(contaComoReceita);
  if (doPaciente.length === 0) return null;

  // Devolve a mais recente mesmo se estiver vencida — é ela que a tela de
  // Tratamento precisa pra mostrar o selo "vencida" e o banner de renovação.
  const [tela] = await prescricoesParaTela([doPaciente[0]]);
  return tela;
}

// Prescrições em que o paciente ainda toma a medicação (ativa ou perto de
// vencer): são as que geram as doses esperadas do dia.
export async function listarPrescricoesVigentes(pacienteId, hoje = new Date()) {
  const vigentes = (await prescricoesDoPaciente(pacienteId))
    .filter(contaComoReceita)
    .filter((p) => prescricaoEstaVigente(p, hoje));
  const profissionais = await mapaDeProfissionais();
  return vigentes.map((p) => paraPrescricaoTela(p, profissionais, hoje));
}

// Sem `pacienteId`, lista as prescrições de todos os pacientes (gestão).
export async function listarPrescricoes(pacienteId) {
  return prescricoesParaTela(await prescricoesDoPaciente(pacienteId));
}

// --- Emissão e rascunho ---------------------------------------------------------

// Converte os dados do formulário de emissão (camelCase) para o documento
// (snake_case) que `paraDocumentoPrescricao` sabe gravar.
function deFormularioParaDoc({
  consultaId,
  pacienteId,
  profissionalId,
  justificativa,
  tipoReceituario,
  cid,
  sintomaAlvo,
  itens,
}) {
  return {
    consulta_id: consultaId ?? null,
    paciente_id: pacienteId,
    profissional_id: profissionalId,
    tipo_receituario: tipoReceituario,
    justificativa_clinica: justificativa ?? '',
    sintoma_alvo: sintomaAlvo,
    cid,
    itens: (itens ?? []).map((item) => ({
      produto_id: item.produtoId,
      dose_inicial: item.doseInicial,
      unidade_dose: item.unidadeDose,
      via_administracao: item.viaAdministracao,
      horarios: item.horarios,
      duracao_dias: item.duracaoDias,
      instrucoes_uso: item.instrucoesUso,
    })),
  };
}

// Emissão: exige CID, justificativa clínica (alternativas terapêuticas
// prévias) e pelo menos 1 item completo. Ao emitir grava `data_emissao = agora`,
// `data_validade` e `status = 'ativa'`.
//
// `idOuDados`:
//   - string → id de um rascunho já salvo, que passa a ser emitido;
//   - objeto → dados do formulário (camelCase). Com `id`, emite aquele
//     rascunho com os dados novos; sem `id`, cria a prescrição já emitida.
//     `diasValidade` (padrão 365) define a validade.
export async function emitirPrescricao(idOuDados) {
  const dados = typeof idOuDados === 'string' ? { id: idOuDados } : idOuDados;

  const existente = dados.id ? await obterPrescricaoDoc(dados.id) : null;
  if (existente && existente.status !== 'rascunho') {
    throw new Error('Só é possível emitir uma prescrição em rascunho.');
  }

  // Emitir só pelo id usa o que já está no rascunho; com dados novos, vale o formulário.
  const base = typeof idOuDados === 'string' ? existente : deFormularioParaDoc(dados);
  const dataEmissao = new Date();
  const dataValidade = new Date(dataEmissao);
  dataValidade.setDate(dataValidade.getDate() + (dados.diasValidade || DIAS_VALIDADE_PADRAO));

  const doc = { ...base, status: 'ativa', data_emissao: dataEmissao, data_validade: dataValidade };
  validarPrescricao(doc);

  let id = dados.id;
  if (id) {
    await atualizar(COLECOES.prescricoes, id, await paraDocumentoPrescricao(doc, existente));
  } else {
    ({ id } = await criar(COLECOES.prescricoes, await paraDocumentoPrescricao(doc)));
  }

  const [emitida] = await prescricoesParaTela([await obterPrescricaoDoc(id)]);
  return emitida;
}

// Rascunho: só `paciente_id` e `profissional_id` são exigidos; todo o resto
// pode estar incompleto. Com `dados.id`, atualiza o rascunho existente.
export async function salvarRascunhoPrescricao(dados) {
  const doc = {
    ...deFormularioParaDoc(dados),
    status: 'rascunho',
    data_emissao: null,
    data_validade: null,
  };
  validarPrescricao(doc);

  if (dados.id) {
    const existente = await obterPrescricaoDoc(dados.id);
    if (existente.status !== 'rascunho') {
      throw new Error('Só é possível editar uma prescrição em rascunho.');
    }
    await atualizar(COLECOES.prescricoes, dados.id, await paraDocumentoPrescricao(doc, existente));
    return { id: dados.id };
  }
  return criar(COLECOES.prescricoes, await paraDocumentoPrescricao(doc));
}

// Cancelar só muda o `status`. Nunca apaga o documento.
export async function cancelarPrescricao(id) {
  await obterPrescricaoDoc(id);
  await atualizar(COLECOES.prescricoes, id, { status: 'cancelada' });
}

export async function solicitarRenovacao(pacienteId, prescricaoId) {
  const prescricao = await obter(COLECOES.prescricoes, prescricaoId);
  if (!prescricao || prescricao.paciente_id !== pacienteId) {
    throw new Error('Prescrição não encontrada.');
  }
  await atualizar(COLECOES.prescricoes, prescricaoId, { renovacao_solicitada: true });
}

// --- Gestão (CRUD) ---------------------------------------------------------------

// Documento cru (snake_case) — é o que o formulário de gestão edita.
export async function obterPrescricaoDoc(id) {
  const prescricao = await obter(COLECOES.prescricoes, id);
  if (!prescricao) throw new Error('Prescrição não encontrada.');
  return prescricao;
}

function dataValida(data) {
  return data instanceof Date && !Number.isNaN(data.getTime());
}

// Item pronto para emitir: produto, dose, unidade, via, pelo menos um horário
// e duração.
function itemCompleto(item) {
  const numerosValidos =
    typeof item.dose_inicial === 'number' && item.dose_inicial > 0 &&
    typeof item.duracao_dias === 'number' && item.duracao_dias > 0;
  const horarios = normalizarHorarios(item.horarios);
  return Boolean(
    item.produto_id && numerosValidos && item.unidade_dose && item.via_administracao && horarios?.length
  );
}

// Regras por status:
//   rascunho  → só paciente e profissional.
//   ativa     → tudo o que a emissão exige (CID, justificativa, itens completos)
//               e datas de emissão/validade coerentes.
//   cancelada → só paciente e profissional (cancelar só muda o status).
function validarPrescricao(dados) {
  if (!dados.paciente_id) throw new Error('Selecione o paciente.');
  if (!dados.profissional_id) throw new Error('Selecione o profissional.');
  if (!STATUS_PRESCRICAO.includes(dados.status)) throw new Error('Selecione o status.');
  if (dados.status !== 'ativa') return;

  if (!dataValida(dados.data_emissao)) throw new Error('Informe uma data de emissão válida.');
  if (!dataValida(dados.data_validade)) throw new Error('Informe uma data de validade válida.');
  if (dados.data_validade < dados.data_emissao) {
    throw new Error('A validade não pode ser anterior à data de emissão.');
  }
  if (!dados.cid?.trim()) throw new Error('Informe o CID.');
  if (!dados.justificativa_clinica?.trim()) {
    throw new Error('A justificativa clínica (alternativas terapêuticas prévias) é obrigatória.');
  }

  // Cardinalidade 1,n — uma prescrição emitida nunca fica sem itens.
  if (!Array.isArray(dados.itens) || dados.itens.length === 0) {
    throw new Error('A prescrição precisa de pelo menos um item.');
  }
  if (!dados.itens.every(itemCompleto)) {
    throw new Error(
      'Preencha produto, dose, unidade, via, pelo menos um horário e a duração de cada item da prescrição.'
    );
  }
}

// Monta o documento a gravar. Preenche as cópias (`paciente_nome`,
// `profissional_nome`, `produto_nome`, `teor_cbd`, `teor_thc`, `volume_ml`) a
// partir dos documentos referenciados — e `cid` é o snapshot do CID no momento
// da emissão. Os itens já existentes mantêm o snapshot do produto: a receita é
// documento sanitário e não muda se o cadastro do produto for corrigido depois.
async function paraDocumentoPrescricao(dados, existente = null) {
  const [paciente, profissional] = await Promise.all([
    obter(COLECOES.usuarios, dados.paciente_id),
    obter(COLECOES.usuarios, dados.profissional_id),
  ]);
  if (!paciente || paciente.tipo !== 'paciente') throw new Error('Paciente não encontrado.');
  if (!profissional || profissional.tipo !== 'profissional') {
    throw new Error('Profissional não encontrado.');
  }

  const snapshotsExistentes = new Map(
    (existente?.itens ?? []).map((item) => [item.produto_id, item])
  );

  const itens = [];
  for (const item of dados.itens ?? []) {
    // Rascunho pode ter item sem produto escolhido ainda: fica sem cópia.
    let copia = {};
    const congelado = item.produto_id ? snapshotsExistentes.get(item.produto_id) : null;
    if (congelado) {
      copia = {
        produto_nome: congelado.produto_nome,
        teor_cbd: congelado.teor_cbd,
        teor_thc: congelado.teor_thc,
        volume_ml: congelado.volume_ml ?? null,
      };
    } else if (item.produto_id) {
      const produto = await obter(COLECOES.produtos, item.produto_id);
      if (!produto) throw new Error('Produto não encontrado.');
      copia = {
        produto_nome: produto.nome,
        teor_cbd: produto.teor_cbd,
        teor_thc: produto.teor_thc,
        volume_ml: produto.volume_ml ?? null,
      };
    }

    itens.push({
      produto_id: item.produto_id || null,
      ...copia,
      dose_inicial: item.dose_inicial ?? null,
      unidade_dose: item.unidade_dose ?? '',
      via_administracao: item.via_administracao ?? '',
      horarios: normalizarHorarios(item.horarios) ?? [],
      duracao_dias: item.duracao_dias ?? null,
      instrucoes_uso: (item.instrucoes_uso ?? '').trim(),
    });
  }

  return {
    consulta_id: dados.consulta_id ?? null,
    paciente_id: dados.paciente_id,
    paciente_nome: nomeDoUsuario(paciente),
    profissional_id: dados.profissional_id,
    profissional_nome: nomeDoUsuario(profissional),
    data_emissao: dados.data_emissao ?? null,
    data_validade: dados.data_validade ?? null,
    tipo_receituario: dados.tipo_receituario ?? '',
    justificativa_clinica: (dados.justificativa_clinica ?? '').trim(),
    status: dados.status,
    sintoma_alvo: dados.sintoma_alvo ?? '',
    cid: dados.cid?.trim() || null,
    itens,
  };
}

export async function criarPrescricao(dados) {
  validarPrescricao(dados);
  return criar(COLECOES.prescricoes, await paraDocumentoPrescricao(dados));
}

export async function atualizarPrescricao(id, dados) {
  validarPrescricao(dados);
  const existente = await obterPrescricaoDoc(id);
  await atualizar(COLECOES.prescricoes, id, await paraDocumentoPrescricao(dados, existente));
}

export async function removerPrescricao(id) {
  await remover(COLECOES.prescricoes, id);
}
