// Formulário de consulta — usado no cadastro (/consultas/nova) e na
// alteração (/consultas/[id]). As cópias `paciente_nome` e
// `profissional_nome` não aparecem aqui: o serviço as preenche a partir dos
// ids escolhidos.

import { useRef } from 'react';
import { View } from 'react-native';

import CampoSelecao from '../CampoSelecao';
import CampoTexto from '../CampoTexto';
import Interruptor from '../Interruptor';
import SecaoRecolhivel from '../SecaoRecolhivel';
import SeletorSegmentado from '../SeletorSegmentado';
import TelaFormulario from '../TelaFormulario';
import { Legenda } from '../Texto';
import useFormularioCrud from '../../hooks/useFormularioCrud';
import useOpcoes from '../../hooks/useOpcoes';
import {
  atualizarConsulta,
  criarConsulta,
  obterConsultaDoc,
} from '../../services/consultaService';
import { listarUsuarios, nomeDoUsuario } from '../../services/usuarioService';
import { useTema } from '../../theme/AcessibilidadeContext';
import { espacamento } from '../../theme/espacamento';
import {
  dataHoraDeTextos,
  formatarCPF,
  formatarData,
  formatarDataDigitada,
  formatarHora,
  formatarHoraDigitada,
} from '../../utils/formatadores';

export const STATUS_CONSULTA_OPCOES = [
  { valor: 'agendada', rotulo: 'Agendada' },
  { valor: 'confirmada', rotulo: 'Confirmada' },
  { valor: 'realizada', rotulo: 'Realizada' },
  { valor: 'cancelada', rotulo: 'Cancelada' },
];

const MODALIDADES = [
  { valor: 'presencial', rotulo: 'Presencial' },
  { valor: 'teleconsulta', rotulo: 'Teleconsulta' },
];

const ESTADO_INICIAL = {
  paciente_id: '',
  profissional_id: '',
  data: '',
  hora: '',
  modalidade: 'presencial',
  status: 'agendada',
  eh_retorno: false,
  queixa_principal: '',
  cid: '',
  alternativas_terapeuticas_previas: '',
  conduta: '',
};

function paraCampos(consulta) {
  const ev = consulta.evolucao ?? {};
  return {
    paciente_id: consulta.paciente_id ?? '',
    profissional_id: consulta.profissional_id ?? '',
    data: consulta.data_hora ? formatarData(consulta.data_hora) : '',
    hora: consulta.data_hora ? formatarHora(consulta.data_hora) : '',
    modalidade: consulta.modalidade ?? 'presencial',
    status: consulta.status ?? 'agendada',
    eh_retorno: Boolean(consulta.eh_retorno),
    queixa_principal: ev.queixa_principal ?? '',
    cid: ev.cid ?? '',
    alternativas_terapeuticas_previas: ev.alternativas_terapeuticas_previas ?? '',
    conduta: ev.conduta ?? '',
  };
}

function validar(c) {
  const erros = {};
  if (!c.paciente_id) erros.paciente_id = 'Selecione o paciente.';
  if (!c.profissional_id) erros.profissional_id = 'Selecione o profissional.';
  if (!dataHoraDeTextos(c.data, '00:00')) erros.data = 'Informe uma data válida (dd/mm/aaaa).';
  if (!dataHoraDeTextos('01/01/2000', c.hora)) erros.hora = 'Informe um horário válido (hh:mm).';
  return erros;
}

function paraDocumento(c, dataRegistroEvolucao) {
  return {
    paciente_id: c.paciente_id,
    profissional_id: c.profissional_id,
    data_hora: dataHoraDeTextos(c.data, c.hora),
    modalidade: c.modalidade,
    status: c.status,
    eh_retorno: c.eh_retorno,
    evolucao: {
      queixa_principal: c.queixa_principal.trim(),
      cid: c.cid.trim(),
      alternativas_terapeuticas_previas: c.alternativas_terapeuticas_previas.trim(),
      conduta: c.conduta.trim(),
      // Mantém a data do primeiro registro da evolução, se já houver.
      data_registro: dataRegistroEvolucao,
    },
  };
}

export default function FormularioConsulta({ modo, id }) {
  const { cores } = useTema();
  const dataRegistroEvolucao = useRef(undefined);

  const pacientes = useOpcoes(
    () => listarUsuarios('paciente'),
    (u) => ({ valor: u.id, rotulo: nomeDoUsuario(u), descricao: formatarCPF(u.paciente?.cpf) })
  );
  const profissionais = useOpcoes(
    () => listarUsuarios('profissional'),
    (u) => ({ valor: u.id, rotulo: nomeDoUsuario(u), descricao: u.profissional?.especialidade })
  );

  const { campos, erros, definir, propsTela } = useFormularioCrud({
    modo,
    id,
    estadoInicial: ESTADO_INICIAL,
    carregar: async (registroId) => {
      const consulta = await obterConsultaDoc(registroId);
      dataRegistroEvolucao.current = consulta.evolucao?.data_registro;
      return consulta;
    },
    paraCampos,
    validar,
    salvar: (c, { modo: m, id: registroId }) =>
      m === 'editar'
        ? atualizarConsulta(registroId, paraDocumento(c, dataRegistroEvolucao.current))
        : criarConsulta(paraDocumento(c)),
    rotaLista: '/consultas',
  });

  const temEvolucao = Boolean(
    campos.queixa_principal || campos.cid || campos.alternativas_terapeuticas_previas || campos.conduta
  );

  return (
    <TelaFormulario titulo={modo === 'editar' ? 'Alterar consulta' : 'Cadastrar consulta'} {...propsTela}>
      <CampoSelecao
        rotulo="Paciente"
        valor={campos.paciente_id}
        opcoes={pacientes.opcoes}
        carregando={pacientes.carregando}
        aoMudar={definir('paciente_id')}
        erro={erros.paciente_id ?? (pacientes.erro || undefined)}
        textoVazio="Nenhum paciente cadastrado."
      />
      <CampoSelecao
        rotulo="Profissional"
        valor={campos.profissional_id}
        opcoes={profissionais.opcoes}
        carregando={profissionais.carregando}
        aoMudar={definir('profissional_id')}
        erro={erros.profissional_id ?? (profissionais.erro || undefined)}
        textoVazio="Nenhum profissional cadastrado."
      />
      <View style={{ flexDirection: 'row', gap: espacamento.md }}>
        <CampoTexto
          rotulo="Data"
          value={campos.data}
          aoMudar={definir('data')}
          formatar={formatarDataDigitada}
          erro={erros.data}
          keyboardType="number-pad"
          placeholder="dd/mm/aaaa"
          estiloContainer={{ flex: 3 }}
        />
        <CampoTexto
          rotulo="Hora"
          value={campos.hora}
          aoMudar={definir('hora')}
          formatar={formatarHoraDigitada}
          erro={erros.hora}
          keyboardType="number-pad"
          placeholder="hh:mm"
          estiloContainer={{ flex: 2 }}
        />
      </View>
      <View>
        <Legenda style={{ color: cores.textoSecundario, marginBottom: espacamento.xs }}>Modalidade</Legenda>
        <SeletorSegmentado opcoes={MODALIDADES} valor={campos.modalidade} aoMudar={definir('modalidade')} />
      </View>
      <CampoSelecao
        rotulo="Status"
        valor={campos.status}
        opcoes={STATUS_CONSULTA_OPCOES}
        aoMudar={definir('status')}
      />
      <Interruptor
        rotulo="É retorno?"
        descricao="Consulta de acompanhamento de um atendimento anterior"
        valor={campos.eh_retorno}
        aoMudar={definir('eh_retorno')}
      />

      <SecaoRecolhivel titulo="Evolução clínica" abertaInicialmente={modo === 'editar' && temEvolucao}>
        <CampoTexto
          rotulo="Queixa principal"
          value={campos.queixa_principal}
          aoMudar={definir('queixa_principal')}
          multiline
        />
        <CampoTexto
          rotulo="CID"
          value={campos.cid}
          aoMudar={definir('cid')}
          autoCapitalize="characters"
          placeholder="F41.1"
        />
        <CampoTexto
          rotulo="Alternativas terapêuticas prévias"
          value={campos.alternativas_terapeuticas_previas}
          aoMudar={definir('alternativas_terapeuticas_previas')}
          multiline
        />
        <CampoTexto rotulo="Conduta" value={campos.conduta} aoMudar={definir('conduta')} multiline />
      </SecaoRecolhivel>
    </TelaFormulario>
  );
}
