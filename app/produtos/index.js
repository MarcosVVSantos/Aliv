// Listagem de produtos (collection `produtos`).

import TelaListagem from '../../src/components/TelaListagem';
import { listarTodosProdutos, removerProduto } from '../../src/services/produtoService';
import { numeroParaTexto } from '../../src/utils/formatadores';

export default function ListaProdutos() {
  return (
    <TelaListagem
      titulo="Produtos"
      nomeSingular="produto"
      carregar={listarTodosProdutos}
      excluir={(produto) => removerProduto(produto.id)}
      rotaNovo="/produtos/novo"
      rotaEditar={(produto) => ({ pathname: '/produtos/[id]', params: { id: produto.id } })}
      tituloItem={(produto) => produto.nome}
      seloItem={(produto) =>
        produto.ativo === false ? { texto: 'Inativo', tom: 'neutro' } : { texto: 'Ativo', tom: 'sucesso' }
      }
      camposItem={(produto) => [
        { rotulo: 'Fabricante', valor: produto.fabricante },
        {
          rotulo: 'Teores',
          valor: `CBD ${numeroParaTexto(produto.teor_cbd)} · THC ${numeroParaTexto(produto.teor_thc)} mg/mL`,
        },
        { rotulo: 'Espectro', valor: produto.espectro },
        { rotulo: 'Volume', valor: produto.volume_ml ? `${numeroParaTexto(produto.volume_ml)} ml` : '' },
      ]}
      textoBusca={(produto) => `${produto.nome} ${produto.fabricante} ${produto.espectro}`}
    />
  );
}
