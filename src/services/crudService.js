// CRUD genérico das 6 collections (usuarios, consultas, prescricoes,
// produtos, registros_diarios, doses). Todos os serviços por collection se apoiam
// aqui — telas nunca importam `firebase/firestore` (ver CONTEXTO.md, seção 3).
//
// Contrato:
//   listar(colecao, { ordenarPor, direcao, filtros })  → [{ id, ...dados }]
//   obter(colecao, id)                                 → { id, ...dados } | null
//   criar(colecao, dados)                              → { id }
//   criarComId(colecao, id, dados)                     → { id }   (grava ou substitui)
//   criarComIdRemovendo(colecao, id, dados, idsAntigos) → { id }   (grava e apaga, em lote)
//   atualizar(colecao, id, dados)                      → void
//   remover(colecao, id)                               → void
//
// - Datas entram e saem como `Date`; a conversão de/para `Timestamp` acontece
//   aqui dentro, nenhuma tela vê `Timestamp`.
// - Campos de referência (paciente_id, consulta_id...) são gravados como
//   Reference do Firestore e voltam como string (o id), para o app inteiro
//   continuar tratando ids como texto.
// - `USAR_MOCK` troca o Firestore por arrays em memória (src/services/mocks).
// - Erros viram `Error` com mensagem em português.

import {
  DocumentReference,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { USAR_MOCK, aguardar } from './config';
import { db } from './firebase';
import { consultasMock } from './mocks/consultas';
import { dosesMock } from './mocks/doses';
import { prescricoesMock } from './mocks/prescricoes';
import { produtosMock } from './mocks/produtos';
import { registrosMock } from './mocks/registrosDiarios';
import { usuariosMock } from './mocks/usuarios';

export const COLECOES = {
  usuarios: 'usuarios',
  consultas: 'consultas',
  prescricoes: 'prescricoes',
  produtos: 'produtos',
  registros: 'registros_diarios',
  doses: 'doses',
};

// Collections que guardam a data de criação do documento (modelo, seção 6).
const COM_DATA_CADASTRO = [COLECOES.usuarios];

// Campo → collection referenciada. Fora daqui, string continua string.
const REFERENCIAS = {
  [COLECOES.consultas]: {
    paciente_id: COLECOES.usuarios,
    profissional_id: COLECOES.usuarios,
  },
  [COLECOES.prescricoes]: {
    consulta_id: COLECOES.consultas,
    paciente_id: COLECOES.usuarios,
    profissional_id: COLECOES.usuarios,
  },
  [COLECOES.registros]: {
    paciente_id: COLECOES.usuarios,
  },
  [COLECOES.doses]: {
    paciente_id: COLECOES.usuarios,
    prescricao_id: COLECOES.prescricoes,
    produto_id: COLECOES.produtos,
  },
};

// A lista `itens` da prescrição carrega uma referência por item.
const REFERENCIAS_DOS_ITENS = {
  [COLECOES.prescricoes]: { produto_id: COLECOES.produtos },
};

const BANCO_MOCK = {
  [COLECOES.usuarios]: usuariosMock,
  [COLECOES.consultas]: consultasMock,
  [COLECOES.prescricoes]: prescricoesMock,
  [COLECOES.produtos]: produtosMock,
  [COLECOES.registros]: registrosMock,
  [COLECOES.doses]: dosesMock,
};

// --- Erros --------------------------------------------------------------

const MENSAGENS_FIRESTORE = {
  'permission-denied':
    'Sem permissão para acessar o banco de dados. Verifique se o Firestore está habilitado e as regras de acesso.',
  unavailable: 'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
  'deadline-exceeded': 'O servidor demorou para responder. Tente novamente.',
  'not-found': 'Registro não encontrado.',
  'already-exists': 'Já existe um registro com esse identificador.',
  'failed-precondition': 'A operação não pôde ser concluída no estado atual dos dados.',
  unauthenticated: 'Você precisa entrar para realizar essa operação.',
  'resource-exhausted': 'Limite de uso do banco de dados atingido. Tente mais tarde.',
};

class ErroCrud extends Error {}

function traduzirErro(erro, acao) {
  if (erro instanceof ErroCrud) return erro;
  const mensagem = MENSAGENS_FIRESTORE[erro?.code] ?? `Não foi possível ${acao}. Tente novamente.`;
  return new ErroCrud(mensagem);
}

function exigirColecao(colecao) {
  if (!Object.values(COLECOES).includes(colecao)) {
    throw new ErroCrud(`Collection desconhecida: ${colecao}.`);
  }
}

// --- Conversões de/para o Firestore ---------------------------------------

function ehObjetoSimples(valor) {
  return (
    valor !== null &&
    typeof valor === 'object' &&
    !(valor instanceof Date) &&
    !(valor instanceof Timestamp) &&
    !(valor instanceof DocumentReference) &&
    !Array.isArray(valor)
  );
}

// Firestore → app: Timestamp vira Date, Reference vira o id (string).
function deFirestore(valor) {
  if (valor instanceof Timestamp) return valor.toDate();
  if (valor instanceof DocumentReference) return valor.id;
  if (Array.isArray(valor)) return valor.map(deFirestore);
  if (ehObjetoSimples(valor)) {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, deFirestore(v)]));
  }
  return valor;
}

function comReferencias(objeto, mapa) {
  if (!mapa) return objeto;
  const resultado = { ...objeto };
  Object.entries(mapa).forEach(([campo, colecaoAlvo]) => {
    const valor = resultado[campo];
    if (typeof valor === 'string' && valor) resultado[campo] = doc(db, colecaoAlvo, valor);
  });
  return resultado;
}

// App → Firestore: remove `undefined` (o Firestore rejeita), Date vira
// Timestamp e ids de referência viram Reference.
// Exportada só para scripts/seed-firestore.js, que grava `usuarios` com
// `setDoc(..., { merge: true })` direto (fora do `criar`/`criarComId`, para
// nunca sobrescrever campos que o próprio usuário já alterou) e por isso
// precisa da mesma conversão Date → Timestamp que o resto do crudService usa.
export function limparParaFirestore(valor) {
  if (valor instanceof Date) return Timestamp.fromDate(valor);
  if (Array.isArray(valor)) {
    return valor.filter((v) => v !== undefined).map(limparParaFirestore);
  }
  if (ehObjetoSimples(valor)) {
    return Object.fromEntries(
      Object.entries(valor)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, limparParaFirestore(v)])
    );
  }
  return valor;
}

function paraFirestore(colecao, dados) {
  let resultado = comReferencias(dados, REFERENCIAS[colecao]);
  const mapaItens = REFERENCIAS_DOS_ITENS[colecao];
  if (mapaItens && Array.isArray(resultado.itens)) {
    resultado = {
      ...resultado,
      itens: resultado.itens.map((item) => comReferencias(item, mapaItens)),
    };
  }
  return limparParaFirestore(resultado);
}

function valorDoFiltro(colecao, campo, valor) {
  const alvo = REFERENCIAS[colecao]?.[campo];
  return alvo && typeof valor === 'string' ? doc(db, alvo, valor) : valor;
}

// --- Ordenação em memória --------------------------------------------------
// Sempre em memória: filtro por um campo + ordenação por outro exigiria
// índice composto no Firestore, e o volume aqui é pequeno.

function comparar(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' });
}

function ordenar(lista, ordenarPor, direcao = 'asc') {
  if (!ordenarPor) return lista;
  const sinal = direcao === 'desc' ? -1 : 1;
  return [...lista].sort((a, b) => sinal * comparar(a[ordenarPor], b[ordenarPor]));
}

// --- Backend mock -------------------------------------------------------------

// Cópia profunda que preserva Date (JSON.parse/stringify transformaria em
// texto, e `structuredClone` não existe em todo runtime do React Native).
function copiar(valor) {
  if (valor instanceof Date) return new Date(valor.getTime());
  if (Array.isArray(valor)) return valor.map(copiar);
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, copiar(v)]));
  }
  return valor;
}

let contadorMock = 0;
function novoIdMock(colecao) {
  contadorMock += 1;
  return `${colecao}-${Date.now()}-${contadorMock}`;
}

function aplicarFiltrosMock(lista, filtros = []) {
  return lista.filter((item) =>
    filtros.every(([campo, operador, valor]) => {
      if (operador === '==') return item[campo] === valor;
      if (operador === 'in') return valor.includes(item[campo]);
      if (operador === '>=') return item[campo] >= valor;
      if (operador === '<=') return item[campo] <= valor;
      if (operador === '>') return item[campo] > valor;
      if (operador === '<') return item[campo] < valor;
      throw new ErroCrud(`Operador de filtro não suportado: ${operador}.`);
    })
  );
}

// --- API pública --------------------------------------------------------------

export async function listar(colecao, { ordenarPor, direcao = 'asc', filtros = [] } = {}) {
  exigirColecao(colecao);

  if (USAR_MOCK) {
    await aguardar(250);
    const lista = aplicarFiltrosMock(BANCO_MOCK[colecao], filtros).map(copiar);
    return ordenar(lista, ordenarPor, direcao);
  }

  try {
    const restricoes = filtros.map(([campo, operador, valor]) =>
      where(campo, operador, valorDoFiltro(colecao, campo, valor))
    );
    const consulta = query(collection(db, colecao), ...restricoes);
    const resultado = await getDocs(consulta);
    const lista = resultado.docs.map((d) => ({ id: d.id, ...deFirestore(d.data()) }));
    return ordenar(lista, ordenarPor, direcao);
  } catch (erro) {
    throw traduzirErro(erro, 'carregar os registros');
  }
}

export async function obter(colecao, id) {
  exigirColecao(colecao);
  if (!id) return null;

  if (USAR_MOCK) {
    await aguardar(200);
    const encontrado = BANCO_MOCK[colecao].find((item) => item.id === id);
    return encontrado ? copiar(encontrado) : null;
  }

  try {
    const snapshot = await getDoc(doc(db, colecao, id));
    return snapshot.exists() ? { id: snapshot.id, ...deFirestore(snapshot.data()) } : null;
  } catch (erro) {
    throw traduzirErro(erro, 'carregar o registro');
  }
}

export async function criar(colecao, dados) {
  exigirColecao(colecao);

  if (USAR_MOCK) {
    await aguardar();
    const id = novoIdMock(colecao);
    const novo = { id, ...copiar(dados) };
    if (COM_DATA_CADASTRO.includes(colecao)) novo.data_cadastro = new Date();
    BANCO_MOCK[colecao].push(novo);
    return { id };
  }

  try {
    const completo = COM_DATA_CADASTRO.includes(colecao)
      ? { ...paraFirestore(colecao, dados), data_cadastro: serverTimestamp() }
      : paraFirestore(colecao, dados);
    const referencia = await addDoc(collection(db, colecao), completo);
    return { id: referencia.id };
  } catch (erro) {
    throw traduzirErro(erro, 'salvar o registro');
  }
}

// Para o caso em que o id do documento já é conhecido — `usuarios` usa o
// UID gerado pelo Firebase Auth.
export async function criarComId(colecao, id, dados) {
  exigirColecao(colecao);

  if (USAR_MOCK) {
    await aguardar();
    const novo = { id, ...copiar(dados) };
    if (COM_DATA_CADASTRO.includes(colecao)) novo.data_cadastro = new Date();
    // Como o `setDoc` do Firestore: ID já existente é substituído, não duplicado.
    const indice = BANCO_MOCK[colecao].findIndex((item) => item.id === id);
    if (indice >= 0) BANCO_MOCK[colecao][indice] = novo;
    else BANCO_MOCK[colecao].push(novo);
    return { id };
  }

  try {
    const completo = COM_DATA_CADASTRO.includes(colecao)
      ? { ...paraFirestore(colecao, dados), data_cadastro: serverTimestamp() }
      : paraFirestore(colecao, dados);
    await setDoc(doc(db, colecao, id), completo);
    return { id };
  } catch (erro) {
    throw traduzirErro(erro, 'salvar o registro');
  }
}

// Grava `dados` em `id` e apaga `idsRemovidos` na MESMA operação (`writeBatch`):
// ou acontece tudo, ou nada. Usado para mover um documento de um ID antigo para
// o ID que o modelo define, sem deixar duplicata nem perder o dado no meio.
// Apagar um ID que não existe é ignorado, como no `deleteDoc` do Firestore.
export async function criarComIdRemovendo(colecao, id, dados, idsRemovidos = []) {
  exigirColecao(colecao);
  const apagar = idsRemovidos.filter((antigo) => antigo !== id);

  if (USAR_MOCK) {
    await aguardar();
    const banco = BANCO_MOCK[colecao];
    apagar.forEach((antigo) => {
      const indiceAntigo = banco.findIndex((item) => item.id === antigo);
      if (indiceAntigo >= 0) banco.splice(indiceAntigo, 1);
    });
    const novo = { id, ...copiar(dados) };
    if (COM_DATA_CADASTRO.includes(colecao)) novo.data_cadastro = new Date();
    const indice = banco.findIndex((item) => item.id === id);
    if (indice >= 0) banco[indice] = novo;
    else banco.push(novo);
    return { id };
  }

  try {
    const completo = COM_DATA_CADASTRO.includes(colecao)
      ? { ...paraFirestore(colecao, dados), data_cadastro: serverTimestamp() }
      : paraFirestore(colecao, dados);
    const lote = writeBatch(db);
    lote.set(doc(db, colecao, id), completo);
    apagar.forEach((antigo) => lote.delete(doc(db, colecao, antigo)));
    await lote.commit();
    return { id };
  } catch (erro) {
    throw traduzirErro(erro, 'salvar o registro');
  }
}

export async function atualizar(colecao, id, dados) {
  exigirColecao(colecao);

  if (USAR_MOCK) {
    await aguardar();
    const existente = BANCO_MOCK[colecao].find((item) => item.id === id);
    if (!existente) throw new ErroCrud('Registro não encontrado.');
    Object.assign(existente, copiar(dados));
    return;
  }

  try {
    await updateDoc(doc(db, colecao, id), paraFirestore(colecao, dados));
  } catch (erro) {
    throw traduzirErro(erro, 'salvar as alterações');
  }
}

export async function remover(colecao, id) {
  exigirColecao(colecao);

  if (USAR_MOCK) {
    await aguardar();
    const indice = BANCO_MOCK[colecao].findIndex((item) => item.id === id);
    if (indice < 0) throw new ErroCrud('Registro não encontrado.');
    BANCO_MOCK[colecao].splice(indice, 1);
    return;
  }

  try {
    await deleteDoc(doc(db, colecao, id));
  } catch (erro) {
    throw traduzirErro(erro, 'excluir o registro');
  }
}
