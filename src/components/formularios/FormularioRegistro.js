// Formulário de registro diário — usado no cadastro (/registros/novo) e na
// alteração (/registros/[id]). `paciente_nome` não aparece: o serviço copia
// do paciente escolhido. As doses tomadas não fazem parte do registro: vivem na
// coleção `doses`.

import { StyleSheet, View } from 'react-native';

import CampoSelecao from '../CampoSelecao';
import CampoTexto from '../CampoTexto';
import Chip from '../Chip';
import SeletorSegmentado from '../SeletorSegmentado';
import SliderSintoma from '../SliderSintoma';
import TelaFormulario from '../TelaFormulario';
import { Legenda } from '../Texto';
import useFormularioCrud from '../../hooks/useFormularioCrud';
import useOpcoes from '../../hooks/useOpcoes';
import {
  atualizarRegistro,
  criarRegistro,
  obterRegistro,
} from '../../services/registroService';
import { listarUsuarios, nomeDoUsuario } from '../../services/usuarioService';
import { useTema } from '../../theme/AcessibilidadeContext';
import { espacamento } from '../../theme/espacamento';
import { dataLocalISO } from '../../utils/data';
import {
  dataDeTextoBR,
  formatarCPF,
  formatarData,
  formatarDataDigitada,
} from '../../utils/formatadores';

export const EFEITOS_ADVERSOS = ['Sonolência', 'Boca seca', 'Tontura', 'Náusea', 'Aumento de apetite'];

const HUMORES = ['Muito mal', 'Mal', 'Neutro', 'Bem', 'Muito bem'].map((h) => ({ valor: h, rotulo: h }));

const SONO = [
  { valor: 'Ruim', rotulo: 'Ruim' },
  { valor: 'Regular', rotulo: 'Regular' },
  { valor: 'Boa', rotulo: 'Boa' },
];

const ESTADO_INICIAL = {
  paciente_id: '',
  data: '',
  escala_sintoma: 5,
  sem_efeitos_adversos: false,
  efeitos_padrao: [],
  efeitos_outros: '',
  observacao: '',
  humor: '',
  qualidade_sono: '',
};

function paraCampos(registro) {
  const efeitos = (registro.efeitos_adversos ?? []).map((e) => e.descricao);
  return {
    paciente_id: registro.paciente_id ?? '',
    data: registro.data ? formatarData(registro.data) : '',
    escala_sintoma: Number.isInteger(registro.escala_sintoma) ? registro.escala_sintoma : 5,
    sem_efeitos_adversos: Boolean(registro.sem_efeitos_adversos),
    efeitos_padrao: efeitos.filter((e) => EFEITOS_ADVERSOS.includes(e)),
    // Efeitos que não estão na lista padrão voltam no campo de texto livre.
    efeitos_outros: efeitos.filter((e) => !EFEITOS_ADVERSOS.includes(e)).join(', '),
    observacao: registro.observacao ?? '',
    humor: registro.humor ?? '',
    qualidade_sono: registro.qualidade_sono ?? '',
  };
}

function validar(c) {
  const erros = {};
  if (!c.paciente_id) erros.paciente_id = 'Selecione o paciente.';
  if (!dataDeTextoBR(c.data)) erros.data = 'Informe uma data válida (dd/mm/aaaa).';
  return erros;
}

function paraDocumento(c) {
  const outros = c.efeitos_outros
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  return {
    paciente_id: c.paciente_id,
    // Data de calendário: string 'AAAA-MM-DD', sem hora.
    data: dataLocalISO(dataDeTextoBR(c.data)),
    // Sempre inteiro — é ela que vira média e gráfico.
    escala_sintoma: Math.round(c.escala_sintoma),
    efeitos_adversos: [...c.efeitos_padrao, ...outros].map((descricao) => ({ descricao })),
    // "Nenhum" só vale com a lista vazia (o formulário já garante isso).
    sem_efeitos_adversos: c.sem_efeitos_adversos && c.efeitos_padrao.length === 0 && !outros.length,
    observacao: c.observacao.trim(),
    humor: c.humor,
    qualidade_sono: c.qualidade_sono,
  };
}

export default function FormularioRegistro({ modo, id }) {
  const { cores } = useTema();

  const pacientes = useOpcoes(
    () => listarUsuarios('paciente'),
    (u) => ({ valor: u.id, rotulo: nomeDoUsuario(u), descricao: formatarCPF(u.paciente?.cpf) })
  );

  const { campos, setCampos, erros, definir, propsTela } = useFormularioCrud({
    modo,
    id,
    estadoInicial: ESTADO_INICIAL,
    carregar: obterRegistro,
    paraCampos,
    validar,
    salvar: (c, { modo: m, id: registroId }) =>
      m === 'editar' ? atualizarRegistro(registroId, paraDocumento(c)) : criarRegistro(paraDocumento(c)),
    rotaLista: '/registros',
  });

  // Marcar "Nenhum" limpa a lista; adicionar um efeito desmarca "Nenhum".
  function alternarNenhum() {
    setCampos((atual) =>
      atual.sem_efeitos_adversos
        ? { ...atual, sem_efeitos_adversos: false }
        : { ...atual, sem_efeitos_adversos: true, efeitos_padrao: [], efeitos_outros: '' }
    );
  }

  function alternarEfeito(efeito) {
    setCampos((atual) => ({
      ...atual,
      sem_efeitos_adversos: false,
      efeitos_padrao: atual.efeitos_padrao.includes(efeito)
        ? atual.efeitos_padrao.filter((e) => e !== efeito)
        : [...atual.efeitos_padrao, efeito],
    }));
  }

  function mudarOutrosEfeitos(texto) {
    setCampos((atual) => ({
      ...atual,
      efeitos_outros: texto,
      sem_efeitos_adversos: texto.trim() ? false : atual.sem_efeitos_adversos,
    }));
  }

  return (
    <TelaFormulario titulo={modo === 'editar' ? 'Alterar registro' : 'Cadastrar registro'} {...propsTela}>
      <CampoSelecao
        rotulo="Paciente"
        valor={campos.paciente_id}
        opcoes={pacientes.opcoes}
        carregando={pacientes.carregando}
        aoMudar={definir('paciente_id')}
        erro={erros.paciente_id ?? (pacientes.erro || undefined)}
        textoVazio="Nenhum paciente cadastrado."
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
          estiloContainer={{ flex: 1 }}
        />
      </View>

      <View>
        <Legenda style={{ color: cores.textoSecundario, marginBottom: espacamento.xs }}>
          Escala do sintoma (0 a 10)
        </Legenda>
        <SliderSintoma valor={campos.escala_sintoma} aoMudar={definir('escala_sintoma')} />
      </View>

      <View>
        <Legenda style={{ color: cores.textoSecundario, marginBottom: espacamento.xs }}>Efeitos adversos</Legenda>
        <View style={estilos.chips}>
          <Chip texto="Nenhum" selecionado={campos.sem_efeitos_adversos} onPress={alternarNenhum} />
          {EFEITOS_ADVERSOS.map((efeito) => (
            <Chip
              key={efeito}
              texto={efeito}
              selecionado={campos.efeitos_padrao.includes(efeito)}
              onPress={() => alternarEfeito(efeito)}
            />
          ))}
        </View>
      </View>
      <CampoTexto
        rotulo="Outros efeitos (separe por vírgula)"
        value={campos.efeitos_outros}
        aoMudar={mudarOutrosEfeitos}
        placeholder="Opcional"
      />

      <CampoTexto
        rotulo="Observação"
        value={campos.observacao}
        aoMudar={definir('observacao')}
        multiline
        placeholder="Como o paciente se sentiu?"
      />
      <CampoSelecao
        rotulo="Humor"
        valor={campos.humor}
        opcoes={HUMORES}
        aoMudar={definir('humor')}
        placeholder="Não informado"
      />
      <View>
        <Legenda style={{ color: cores.textoSecundario, marginBottom: espacamento.xs }}>Qualidade do sono</Legenda>
        <SeletorSegmentado opcoes={SONO} valor={campos.qualidade_sono} aoMudar={definir('qualidade_sono')} />
      </View>
    </TelaFormulario>
  );
}

const estilos = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento.sm,
  },
});
