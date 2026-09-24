// Formulário de produto — usado no cadastro (/produtos/novo) e na
// alteração (/produtos/[id]); o parâmetro `modo` diferencia os dois.

import CampoTexto from '../CampoTexto';
import Interruptor from '../Interruptor';
import SeletorSegmentado from '../SeletorSegmentado';
import TelaFormulario from '../TelaFormulario';
import { Legenda } from '../Texto';
import useFormularioCrud from '../../hooks/useFormularioCrud';
import {
  atualizarProduto,
  criarProduto,
  obterProdutoDoc,
} from '../../services/produtoService';
import { useTema } from '../../theme/AcessibilidadeContext';
import { espacamento } from '../../theme/espacamento';
import { numeroDeTexto, numeroParaTexto } from '../../utils/formatadores';
import { validarCampoObrigatorio } from '../../utils/validadores';

export const ESPECTROS = [
  { valor: 'full spectrum', rotulo: 'Full spectrum' },
  { valor: 'broad spectrum', rotulo: 'Broad spectrum' },
  { valor: 'isolado', rotulo: 'Isolado' },
];

const ESTADO_INICIAL = {
  nome: '',
  fabricante: '',
  teor_cbd: '',
  teor_thc: '',
  espectro: 'full spectrum',
  volume_ml: '',
  ativo: true,
};

function paraCampos(produto) {
  return {
    nome: produto.nome ?? '',
    fabricante: produto.fabricante ?? '',
    teor_cbd: numeroParaTexto(produto.teor_cbd),
    teor_thc: numeroParaTexto(produto.teor_thc),
    espectro: produto.espectro ?? 'full spectrum',
    volume_ml: numeroParaTexto(produto.volume_ml),
    ativo: produto.ativo !== false,
  };
}

function validar(c) {
  const erros = {};
  if (!validarCampoObrigatorio(c.nome)) erros.nome = 'Informe o nome do produto.';
  if (Number.isNaN(numeroDeTexto(c.teor_cbd)) || numeroDeTexto(c.teor_cbd) < 0) {
    erros.teor_cbd = 'Informe um número (ex.: 200 ou 0,5).';
  }
  if (Number.isNaN(numeroDeTexto(c.teor_thc)) || numeroDeTexto(c.teor_thc) < 0) {
    erros.teor_thc = 'Informe um número (ex.: 0,3).';
  }
  if (c.volume_ml.trim() && !(numeroDeTexto(c.volume_ml) > 0)) {
    erros.volume_ml = 'Informe um volume maior que zero.';
  }
  return erros;
}

function paraDocumento(c) {
  return {
    nome: c.nome,
    fabricante: c.fabricante,
    teor_cbd: numeroDeTexto(c.teor_cbd),
    teor_thc: numeroDeTexto(c.teor_thc),
    espectro: c.espectro,
    volume_ml: c.volume_ml.trim() ? numeroDeTexto(c.volume_ml) : null,
    ativo: c.ativo,
  };
}

export default function FormularioProduto({ modo, id }) {
  const { cores } = useTema();
  const { campos, erros, definir, propsTela } = useFormularioCrud({
    modo,
    id,
    estadoInicial: ESTADO_INICIAL,
    carregar: obterProdutoDoc,
    paraCampos,
    validar,
    salvar: (c, { modo: m, id: registroId }) =>
      m === 'editar' ? atualizarProduto(registroId, paraDocumento(c)) : criarProduto(paraDocumento(c)),
    rotaLista: '/produtos',
  });

  return (
    <TelaFormulario titulo={modo === 'editar' ? 'Alterar produto' : 'Cadastrar produto'} {...propsTela}>
      <CampoTexto
        rotulo="Nome"
        value={campos.nome}
        aoMudar={definir('nome')}
        erro={erros.nome}
        placeholder="Ex.: Óleo CBD 200mg/mL"
      />
      <CampoTexto
        rotulo="Fabricante"
        value={campos.fabricante}
        aoMudar={definir('fabricante')}
        placeholder="Nome do fabricante"
      />
      <CampoTexto
        rotulo="Teor de CBD (mg/mL)"
        value={campos.teor_cbd}
        aoMudar={definir('teor_cbd')}
        erro={erros.teor_cbd}
        keyboardType="decimal-pad"
        placeholder="200"
      />
      <CampoTexto
        rotulo="Teor de THC (mg/mL)"
        value={campos.teor_thc}
        aoMudar={definir('teor_thc')}
        erro={erros.teor_thc}
        keyboardType="decimal-pad"
        placeholder="0,3"
      />
      <Legenda style={{ color: cores.textoSecundario, marginBottom: -espacamento.sm }}>Espectro</Legenda>
      <SeletorSegmentado opcoes={ESPECTROS} valor={campos.espectro} aoMudar={definir('espectro')} />
      <CampoTexto
        rotulo="Volume (ml) — opcional"
        value={campos.volume_ml}
        aoMudar={definir('volume_ml')}
        erro={erros.volume_ml}
        keyboardType="decimal-pad"
        placeholder="30"
      />
      <Interruptor
        rotulo="Produto ativo"
        descricao="Produtos inativos não aparecem na hora de prescrever"
        valor={campos.ativo}
        aoMudar={definir('ativo')}
      />
    </TelaFormulario>
  );
}
