// Listagem de prescrições (collection `prescricoes`). O selo é a `situacao`
// calculada pelo serviço a partir do status gravado e da validade, nunca o
// `status` cru do documento.

import TelaListagem from '../../src/components/TelaListagem';
import { listarPrescricoes, removerPrescricao } from '../../src/services/prescricaoService';
import { formatarData } from '../../src/utils/formatadores';

const SELO_SITUACAO = {
  rascunho: { texto: 'Rascunho', tom: 'neutro' },
  ativa: { texto: 'Vigente', tom: 'sucesso' },
  vence_em_breve: { texto: 'Vence em breve', tom: 'atencao' },
  vencida: { texto: 'Vencida', tom: 'perigo' },
  cancelada: { texto: 'Cancelada', tom: 'neutro' },
};

function textoData(data) {
  return data ? formatarData(data) : '—';
}

export default function ListaPrescricoes() {
  return (
    <TelaListagem
      titulo="Prescrições"
      nomeSingular="prescrição"
      carregar={() => listarPrescricoes()}
      excluir={(prescricao) => removerPrescricao(prescricao.id)}
      rotaNovo="/prescricoes/nova"
      rotaEditar={(prescricao) => ({ pathname: '/prescricoes/[id]', params: { id: prescricao.id } })}
      tituloItem={(prescricao) =>
        `${prescricao.pacienteNome} — ${prescricao.dataEmissao ? formatarData(prescricao.dataEmissao) : 'rascunho'}`
      }
      seloItem={(prescricao) => SELO_SITUACAO[prescricao.situacao]}
      camposItem={(prescricao) => [
        { rotulo: 'Profissional', valor: prescricao.profissionalNome },
        { rotulo: 'Validade', valor: textoData(prescricao.dataValidade) },
        { rotulo: 'CID', valor: prescricao.cid ?? '—' },
        { rotulo: 'Sintoma alvo', valor: prescricao.sintomaAlvo },
        { rotulo: 'Itens', valor: prescricao.itens.map((item) => item.produtoNome).join(', ') },
      ]}
      textoBusca={(prescricao) =>
        `${prescricao.pacienteNome} ${prescricao.profissionalNome} ${prescricao.sintomaAlvo} ${prescricao.cid ?? ''} ${prescricao.itens
          .map((item) => item.produtoNome)
          .join(' ')}`
      }
    />
  );
}
