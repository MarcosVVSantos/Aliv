// CRUD da collection raiz `registros_diarios` (ver CONTEXTO.md, seção 6).
// Era subcoleção de `usuarios`; agora cada registro aponta para o paciente
// em `paciente_id`, com `paciente_nome` copiado (a listagem não precisa
// buscar cada paciente). Telas nunca importam `firebase/firestore`.
//
// Modelo v2:
//   - `data` é a string de calendário 'AAAA-MM-DD' (sem hora);
//   - o ID do documento é `{paciente_id}_{AAAA-MM-DD}`: um registro por
//     paciente por dia, e salvar de novo atualiza em vez de duplicar;
//   - `dose_administrada` saiu: as doses vivem na coleção `doses`;
//   - `sem_efeitos_adversos` distingue "marcou Nenhum" de "não preencheu".
//
// Trabalha com o documento cru (snake_case); o diarioService converte para o
// formato de tela do Diário do paciente.

import { COLECOES, atualizar, criarComIdRemovendo, listar, obter, remover } from './crudService';
import { nomeDoUsuario } from './usuarioService';
import { dataDeChave, dataLocalISO } from '../utils/data';

export function idDoRegistro(pacienteId, data) {
  return `${pacienteId}_${data}`;
}

async function buscarPaciente(pacienteId) {
  const paciente = await obter(COLECOES.usuarios, pacienteId);
  if (!paciente || paciente.tipo !== 'paciente') {
    throw new Error('Paciente não encontrado.');
  }
  return paciente;
}

// Registros do modelo v1 guardam `data` como Timestamp (o crudService já o
// entrega como Date) e não têm `sem_efeitos_adversos`; aqui tudo sai no formato
// v2, com `data` em 'AAAA-MM-DD' local.
function normalizarRegistro(registro) {
  return {
    ...registro,
    data: registro.data instanceof Date ? dataLocalISO(registro.data) : registro.data,
    sem_efeitos_adversos: registro.sem_efeitos_adversos ?? false,
  };
}

// Os três estados de efeitos adversos:
//   sem_efeitos_adversos true  + lista vazia    → o paciente marcou "Nenhum"
//   sem_efeitos_adversos false + lista com itens → relatou efeitos
//   sem_efeitos_adversos false + lista vazia     → não preenchido
// Marcar "Nenhum" com efeitos na lista é contraditório e não é aceito.
function validarRegistro(dados) {
  if (!dados.paciente_id) throw new Error('Selecione o paciente.');
  if (!dataDeChave(dados.data)) throw new Error('Informe uma data válida.');
  // escala_sintoma é sempre Int (nunca texto): é ela que vira média e gráfico.
  if (!Number.isInteger(dados.escala_sintoma) || dados.escala_sintoma < 0 || dados.escala_sintoma > 10) {
    throw new Error('A escala do sintoma precisa ser um número inteiro entre 0 e 10.');
  }
  if (dados.sem_efeitos_adversos && (dados.efeitos_adversos ?? []).length > 0) {
    throw new Error('Não é possível marcar "Nenhum efeito adverso" e informar efeitos ao mesmo tempo.');
  }
}

async function paraDocumentoRegistro(dados) {
  const paciente = await buscarPaciente(dados.paciente_id);
  return {
    paciente_id: dados.paciente_id,
    paciente_nome: nomeDoUsuario(paciente),
    data: dados.data,
    escala_sintoma: dados.escala_sintoma,
    efeitos_adversos: (dados.efeitos_adversos ?? []).map(({ descricao }) => ({ descricao })),
    sem_efeitos_adversos: Boolean(dados.sem_efeitos_adversos),
    observacao: dados.observacao ?? '',
    humor: dados.humor ?? '',
    qualidade_sono: dados.qualidade_sono ?? '',
  };
}

export async function listarRegistros(pacienteId) {
  const filtros = pacienteId ? [['paciente_id', '==', pacienteId]] : [];
  const registros = await listar(COLECOES.registros, { filtros });
  // A data é texto 'AAAA-MM-DD': ordenar como texto já é ordenar por data.
  return registros.map(normalizarRegistro).sort((a, b) => b.data.localeCompare(a.data));
}

export async function obterRegistro(id) {
  const registro = await obter(COLECOES.registros, id);
  if (!registro) throw new Error('Registro não encontrado.');
  return normalizarRegistro(registro);
}

// IDs de registros do mesmo paciente e dia que NÃO seguem o ID do modelo v2 (ex.:
// registros antigos com ID automático). Sem isto, salvar o dia no ID novo
// deixaria dois documentos para a mesma data.
async function idsAntigosDoDia(pacienteId, data, idNovo) {
  const registros = await listarRegistros(pacienteId);
  return registros.filter((r) => r.data === data && r.id !== idNovo).map((r) => r.id);
}

// Grava (ou substitui) o registro do paciente naquele dia. Se já existir um
// registro antigo desse dia em outro ID, ele é apagado na mesma operação.
export async function criarRegistro(dados) {
  validarRegistro(dados);
  const documento = await paraDocumentoRegistro(dados);
  const novoId = idDoRegistro(documento.paciente_id, documento.data);
  const antigos = await idsAntigosDoDia(documento.paciente_id, documento.data, novoId);
  return criarComIdRemovendo(COLECOES.registros, novoId, documento, antigos);
}

export async function atualizarRegistro(id, dados) {
  validarRegistro(dados);
  const documento = await paraDocumentoRegistro(dados);
  const novoId = idDoRegistro(documento.paciente_id, documento.data);

  // Mudou o paciente ou a data, ou é um registro antigo com ID automático: o
  // documento passa a viver no ID que o modelo define, e o antigo é apagado no
  // mesmo lote (writeBatch) — nunca sobram dois documentos para o mesmo dia.
  const antigos = new Set(await idsAntigosDoDia(documento.paciente_id, documento.data, novoId));
  if (id !== novoId) antigos.add(id);

  if (antigos.size === 0) {
    await atualizar(COLECOES.registros, id, documento);
    return;
  }
  await criarComIdRemovendo(COLECOES.registros, novoId, documento, [...antigos]);
}

export async function removerRegistro(id) {
  await remover(COLECOES.registros, id);
}
