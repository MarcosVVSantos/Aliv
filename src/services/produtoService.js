// Catálogo de produtos — telas nunca importam `firebase/firestore`
// diretamente, só este arquivo (ver CONTEXTO.md, seção 3). Assinaturas
// exatas na seção 8.
//
// `listarProdutos` / `obterProduto` devolvem o formato de tela (camelCase);
// as funções de gestão (listarTodosProdutos, obterProdutoDoc, criar...)
// trabalham com o documento (snake_case), que é o que o formulário edita.

import { COLECOES, atualizar, criar, listar, obter, remover } from './crudService';

function paraProdutoTela(produto) {
  return {
    id: produto.id,
    nome: produto.nome,
    fabricante: produto.fabricante,
    teorCbd: produto.teor_cbd,
    teorThc: produto.teor_thc,
    espectro: produto.espectro,
    volumeMl: produto.volume_ml,
    ativo: produto.ativo,
  };
}

export async function listarProdutos(termoBusca = '') {
  const termo = termoBusca.trim().toLowerCase();
  const produtos = await listar(COLECOES.produtos, { ordenarPor: 'nome' });
  return produtos
    .filter((p) => p.ativo !== false)
    .filter((p) => !termo || p.nome.toLowerCase().includes(termo))
    .map(paraProdutoTela);
}

export async function obterProduto(produtoId) {
  const produto = await obter(COLECOES.produtos, produtoId);
  if (!produto) throw new Error('Produto não encontrado.');
  return paraProdutoTela(produto);
}

// --- Gestão (CRUD) ---------------------------------------------------------------

// Todos os produtos, inclusive os inativos.
export async function listarTodosProdutos() {
  return listar(COLECOES.produtos, { ordenarPor: 'nome' });
}

export async function obterProdutoDoc(id) {
  const produto = await obter(COLECOES.produtos, id);
  if (!produto) throw new Error('Produto não encontrado.');
  return produto;
}

function validarProduto(dados) {
  if (!dados.nome?.trim()) throw new Error('Informe o nome do produto.');
  for (const campo of ['teor_cbd', 'teor_thc']) {
    if (typeof dados[campo] !== 'number' || Number.isNaN(dados[campo]) || dados[campo] < 0) {
      throw new Error('Os teores de CBD e THC precisam ser números maiores ou iguais a zero.');
    }
  }
}

function paraDocumentoProduto(dados) {
  return {
    nome: dados.nome.trim(),
    fabricante: dados.fabricante?.trim() ?? '',
    teor_cbd: dados.teor_cbd,
    teor_thc: dados.teor_thc,
    espectro: dados.espectro,
    volume_ml: dados.volume_ml ?? null,
    ativo: dados.ativo ?? true,
  };
}

export async function criarProduto(dados) {
  validarProduto(dados);
  return criar(COLECOES.produtos, paraDocumentoProduto(dados));
}

export async function atualizarProduto(id, dados) {
  validarProduto(dados);
  await atualizar(COLECOES.produtos, id, paraDocumentoProduto(dados));
}

export async function removerProduto(id) {
  await remover(COLECOES.produtos, id);
}
