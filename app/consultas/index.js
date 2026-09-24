// Listagem de consultas (collection `consultas`), com filtro por status.

import TelaListagem from '../../src/components/TelaListagem';
import { STATUS_CONSULTA_OPCOES } from '../../src/components/formularios/FormularioConsulta';
import { listarConsultas, removerConsulta } from '../../src/services/consultaService';
import { formatarDataHora } from '../../src/utils/formatadores';

const FILTRO = {
  valorInicial: 'todas',
  opcoes: [{ valor: 'todas', rotulo: 'Todas' }, ...STATUS_CONSULTA_OPCOES],
};

const TOM_STATUS = {
  agendada: 'atencao',
  confirmada: 'sucesso',
  realizada: 'neutro',
  cancelada: 'perigo',
};

export default function ListaConsultas() {
  return (
    <TelaListagem
      titulo="Consultas"
      nomeSingular="consulta"
      filtro={FILTRO}
      carregar={listarConsultas}
      excluir={(consulta) => removerConsulta(consulta.id)}
      rotaNovo="/consultas/nova"
      rotaEditar={(consulta) => ({ pathname: '/consultas/[id]', params: { id: consulta.id } })}
      tituloItem={(consulta) => `${consulta.paciente_nome} — ${formatarDataHora(consulta.data_hora)}`}
      seloItem={(consulta) => ({
        texto: STATUS_CONSULTA_OPCOES.find((s) => s.valor === consulta.status)?.rotulo ?? consulta.status,
        tom: TOM_STATUS[consulta.status] ?? 'neutro',
      })}
      camposItem={(consulta) => [
        { rotulo: 'Paciente', valor: consulta.paciente_nome },
        { rotulo: 'Profissional', valor: consulta.profissional_nome },
        { rotulo: 'Modalidade', valor: consulta.modalidade === 'teleconsulta' ? 'Teleconsulta' : 'Presencial' },
        { rotulo: 'Retorno', valor: consulta.eh_retorno ? 'Sim' : 'Não' },
      ]}
      textoBusca={(consulta) =>
        `${consulta.paciente_nome} ${consulta.profissional_nome} ${consulta.modalidade} ${consulta.status}`
      }
    />
  );
}
