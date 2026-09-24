// Diário — a tela mais importante do app (ver CONTEXTO.md, seção 7.8).

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import Botao from '../../../src/components/Botao';
import CampoTexto from '../../../src/components/CampoTexto';
import Cartao from '../../../src/components/Cartao';
import Chip from '../../../src/components/Chip';
import EstadoVazio from '../../../src/components/EstadoVazio';
import SeletorSegmentado from '../../../src/components/SeletorSegmentado';
import Selo from '../../../src/components/Selo';
import SliderSintoma from '../../../src/components/SliderSintoma';
import TelaCarregando from '../../../src/components/TelaCarregando';
import { Corpo, CorpoSecundario, Legenda, Subtitulo, Titulo } from '../../../src/components/Texto';
import useSessao from '../../../src/hooks/useSessao';
import {
  listarDosesDoDia,
  marcarDosePulada,
  marcarDoseTomada,
  obterRegistroDoDia,
  salvarRegistroDiario,
} from '../../../src/services/diarioService';
import { obterPrescricaoAtiva } from '../../../src/services/prescricaoService';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../../src/theme/espacamento';
import { formatarDataExtenso } from '../../../src/utils/formatadores';
import { avisar } from '../../../src/utils/dialogo';

const EFEITOS_PADRAO = ['Nenhum', 'Sonolência', 'Boca seca', 'Tontura', 'Náusea', 'Aumento de apetite', 'Outro'];
const OPCOES_HUMOR = ['Muito mal', 'Mal', 'Neutro', 'Bem', 'Muito bem'];
const OPCOES_SONO = [
  { valor: 'Ruim', rotulo: 'Ruim' },
  { valor: 'Regular', rotulo: 'Regular' },
  { valor: 'Boa', rotulo: 'Boa' },
];
const UNIDADES_DOSE = [
  { valor: 'gotas', rotulo: 'Gotas' },
  { valor: 'mg', rotulo: 'mg' },
  { valor: 'ml', rotulo: 'ml' },
];

// `pendente` e `perdida` são calculados; só `tomada` e `pulada` viram documento.
const ICONE_DOSE = {
  tomada: 'checkmark-circle',
  pendente: 'time-outline',
  perdida: 'alert-circle-outline',
};
const TEXTO_DOSE = {
  tomada: 'Tomada',
  pendente: 'Pendente',
  perdida: 'Perdida',
};

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function Diario() {
  const { cores } = useTema();
  const { sessao } = useSessao();

  const [doses, setDoses] = useState([]);
  const [sintomaAlvo, setSintomaAlvo] = useState('');
  const [escalaSintoma, setEscalaSintoma] = useState(5);
  const [efeitosSelecionados, setEfeitosSelecionados] = useState([]);
  const [outroTexto, setOutroTexto] = useState('');
  const [humor, setHumor] = useState(null);
  const [qualidadeSono, setQualidadeSono] = useState(null);
  const [observacao, setObservacao] = useState('');
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [doseEmAjuste, setDoseEmAjuste] = useState(null);
  const [ajusteValor, setAjusteValor] = useState('');
  const [ajusteUnidade, setAjusteUnidade] = useState('gotas');
  const [salvando, setSalvando] = useState(false);
  const [atualizandoDose, setAtualizandoDose] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (!sessao) return;
    setErro('');
    try {
      const [dosesHoje, prescricao, registro] = await Promise.all([
        listarDosesDoDia(sessao.uid),
        obterPrescricaoAtiva(sessao.uid),
        obterRegistroDoDia(sessao.uid),
      ]);
      setDoses(dosesHoje);
      setSintomaAlvo(prescricao?.sintomaAlvo ?? '');

      if (registro) {
        setEscalaSintoma(registro.escalaSintoma);
        // Os três estados: "Nenhum" marcado, efeitos relatados ou nada preenchido.
        if (registro.semEfeitosAdversos) {
          setEfeitosSelecionados(['Nenhum']);
        } else {
          setEfeitosSelecionados(registro.efeitosAdversos.filter((e) => EFEITOS_PADRAO.includes(e)));
          const efeitoLivre = registro.efeitosAdversos.find((e) => !EFEITOS_PADRAO.includes(e));
          if (efeitoLivre) {
            setEfeitosSelecionados((atual) => [...atual, 'Outro']);
            setOutroTexto(efeitoLivre);
          }
        }
        setHumor(registro.humor);
        setQualidadeSono(registro.qualidadeSono);
        setObservacao(registro.observacao ?? '');
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [sessao]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  async function lidarComMarcarTomada(dose) {
    setAtualizandoDose(dose.id);
    try {
      await marcarDoseTomada(sessao.uid, dose.prescricaoId, dose.produtoId, dose.data, dose.horario);
      setDoses(await listarDosesDoDia(sessao.uid));
    } catch (e) {
      avisar('Não foi possível marcar a dose', e.message);
    } finally {
      setAtualizandoDose(null);
    }
  }

  async function lidarComPularDose(dose) {
    setAtualizandoDose(dose.id);
    try {
      await marcarDosePulada(sessao.uid, dose.prescricaoId, dose.produtoId, dose.data, dose.horario);
      setDoses(await listarDosesDoDia(sessao.uid));
    } catch (e) {
      avisar('Não foi possível pular a dose', e.message);
    } finally {
      setAtualizandoDose(null);
    }
  }

  function abrirAjuste(dose) {
    setDoseEmAjuste(dose.id);
    setAjusteValor(String(dose.dose));
    setAjusteUnidade(dose.unidade);
  }

  async function salvarAjuste(dose) {
    try {
      await marcarDoseTomada(sessao.uid, dose.prescricaoId, dose.produtoId, dose.data, dose.horario, {
        quantidade: Number(String(ajusteValor).replace(',', '.')) || dose.dose,
        unidade: ajusteUnidade,
      });
      setDoseEmAjuste(null);
      setDoses(await listarDosesDoDia(sessao.uid));
    } catch (e) {
      avisar('Não foi possível salvar o ajuste', e.message);
    }
  }

  function alternarEfeito(efeito) {
    setEfeitosSelecionados((atual) => {
      if (efeito === 'Nenhum') return atual.includes('Nenhum') ? [] : ['Nenhum'];
      const semNenhum = atual.filter((e) => e !== 'Nenhum');
      return semNenhum.includes(efeito) ? semNenhum.filter((e) => e !== efeito) : [...semNenhum, efeito];
    });
  }

  async function lidarComSalvarRegistro() {
    setSalvando(true);
    try {
      const efeitosAdversos = efeitosSelecionados
        .filter((e) => e !== 'Nenhum' && e !== 'Outro')
        .concat(efeitosSelecionados.includes('Outro') && outroTexto.trim() ? [outroTexto.trim()] : []);

      await salvarRegistroDiario(sessao.uid, {
        escalaSintoma,
        efeitosAdversos,
        semEfeitosAdversos: efeitosSelecionados.includes('Nenhum'),
        humor,
        qualidadeSono,
        observacao,
      });
      avisar('Registro salvo', 'Seu diário de hoje foi salvo com sucesso.');
    } catch (e) {
      avisar('Não foi possível salvar', e.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <TelaCarregando />;
  }

  if (erro) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo }}>
        <EstadoVazio
          icone="alert-circle-outline"
          titulo="Não foi possível carregar"
          texto={erro}
          tituloBotao="Tentar novamente"
          aoPressionarBotao={carregar}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Titulo>Diário de sintomas</Titulo>
        <CorpoSecundario>Registro de hoje · {capitalizar(formatarDataExtenso(new Date()))}</CorpoSecundario>

        <View>
          <Subtitulo style={{ marginBottom: espacamento.sm }}>Doses de hoje</Subtitulo>
          <View style={{ gap: espacamento.sm }}>
            {doses.map((dose) => (
              <Cartao key={dose.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name={ICONE_DOSE[dose.status]}
                    size={26}
                    color={dose.status === 'tomada' ? cores.primaria : cores.terracota}
                  />
                  <View style={{ flex: 1, marginLeft: espacamento.sm }}>
                    <Corpo>
                      {dose.periodo} · {dose.horario}
                    </Corpo>
                    <CorpoSecundario>
                      {dose.produtoNome ? `${dose.produtoNome} · ` : ''}
                      {dose.dose} {dose.unidade} · {TEXTO_DOSE[dose.status]}
                    </CorpoSecundario>
                  </View>
                  <Pressable onPress={() => abrirAjuste(dose)} hitSlop={8}>
                    <Legenda style={{ color: cores.primaria }}>Ajustar</Legenda>
                  </Pressable>
                </View>

                {dose.status !== 'tomada' ? (
                  <View style={{ marginTop: espacamento.sm, gap: espacamento.xs }}>
                    <Botao
                      titulo="Marcar como tomada"
                      variante="secundario"
                      carregando={atualizandoDose === dose.id}
                      onPress={() => lidarComMarcarTomada(dose)}
                    />
                    {dose.status === 'pendente' ? (
                      <Botao
                        titulo="Pular esta dose"
                        variante="texto"
                        desabilitado={atualizandoDose === dose.id}
                        onPress={() => lidarComPularDose(dose)}
                      />
                    ) : null}
                  </View>
                ) : null}

                {doseEmAjuste === dose.id ? (
                  <View style={{ marginTop: espacamento.sm, gap: espacamento.sm }}>
                    <View style={{ flexDirection: 'row', gap: espacamento.sm }}>
                      <CampoTexto
                        value={ajusteValor}
                        aoMudar={setAjusteValor}
                        keyboardType="decimal-pad"
                        estiloContainer={{ flex: 1 }}
                      />
                      <View style={{ flex: 2 }}>
                        <SeletorSegmentado opcoes={UNIDADES_DOSE} valor={ajusteUnidade} aoMudar={setAjusteUnidade} />
                      </View>
                    </View>
                    <Botao titulo="Salvar ajuste" tamanhoCompleto={false} onPress={() => salvarAjuste(dose)} />
                  </View>
                ) : null}
              </Cartao>
            ))}
          </View>
        </View>

        <Cartao>
          <Subtitulo>Intensidade do sintoma</Subtitulo>
          {sintomaAlvo ? (
            <Selo texto={`Sintoma acompanhado: ${sintomaAlvo}`} tom="neutro" estilo={{ marginTop: espacamento.sm }} />
          ) : null}
          <SliderSintoma valor={escalaSintoma} aoMudar={setEscalaSintoma} />
        </Cartao>

        <Cartao>
          <Subtitulo>Efeitos colaterais</Subtitulo>
          <View style={estilos.grupoChips}>
            {EFEITOS_PADRAO.map((efeito) => (
              <Chip
                key={efeito}
                texto={efeito}
                selecionado={efeitosSelecionados.includes(efeito)}
                onPress={() => alternarEfeito(efeito)}
              />
            ))}
          </View>
          {efeitosSelecionados.includes('Outro') ? (
            <CampoTexto
              rotulo="Qual outro efeito?"
              value={outroTexto}
              aoMudar={setOutroTexto}
              estiloContainer={{ marginTop: espacamento.sm }}
            />
          ) : null}
        </Cartao>

        <Cartao>
          <Pressable
            onPress={() => setDetalhesAbertos((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Subtitulo>Mais detalhes (opcional)</Subtitulo>
            <Ionicons
              name={detalhesAbertos ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={cores.textoSecundario}
            />
          </Pressable>

          {detalhesAbertos ? (
            <View style={{ marginTop: espacamento.md, gap: espacamento.md }}>
              <View>
                <Legenda style={{ marginBottom: espacamento.xs }}>Humor</Legenda>
                <View style={estilos.grupoChips}>
                  {OPCOES_HUMOR.map((opcao) => (
                    <Chip
                      key={opcao}
                      texto={opcao}
                      selecionado={humor === opcao}
                      onPress={() => setHumor(opcao)}
                    />
                  ))}
                </View>
              </View>
              <View>
                <Legenda style={{ marginBottom: espacamento.xs }}>Qualidade do sono</Legenda>
                <SeletorSegmentado opcoes={OPCOES_SONO} valor={qualidadeSono} aoMudar={setQualidadeSono} />
              </View>
              <CampoTexto
                rotulo="Observações"
                value={observacao}
                aoMudar={setObservacao}
                placeholder="Como você está se sentindo hoje?"
                multiline
              />
            </View>
          ) : null}
        </Cartao>
      </ScrollView>

      <View style={[estilos.rodape, { borderTopColor: cores.borda, backgroundColor: cores.fundo }]}>
        <Botao titulo="Salvar registro" onPress={lidarComSalvarRegistro} carregando={salvando} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: espacamento.lg,
    gap: espacamento.md,
    paddingBottom: espacamento.xl,
  },
  grupoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento.sm,
    marginTop: espacamento.sm,
  },
  rodape: {
    padding: espacamento.lg,
    borderTopWidth: 1,
  },
});
