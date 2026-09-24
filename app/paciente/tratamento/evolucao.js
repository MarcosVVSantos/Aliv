// Evolução — ver CONTEXTO.md, seção 7.9.
//
// O react-native-chart-kit não tem um gráfico combinado linha+barra, então
// as doses tomadas aparecem como uma segunda linha mais clara, numa escala
// relativa (0–10: doses tomadas ÷ doses previstas do dia) por cima da mesma
// linha do tempo — a ideia de sobrepor as duas séries continua, só a forma
// visual (linha, não barra) muda pela limitação da lib escolhida.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import CabecalhoTela from '../../../src/components/CabecalhoTela';
import Cartao from '../../../src/components/Cartao';
import EstadoVazio from '../../../src/components/EstadoVazio';
import SeletorSegmentado from '../../../src/components/SeletorSegmentado';
import TelaCarregando from '../../../src/components/TelaCarregando';
import { Corpo, CorpoSecundario, Legenda, Subtitulo, TituloGrande } from '../../../src/components/Texto';
import useSessao from '../../../src/hooks/useSessao';
import { obterEvolucao } from '../../../src/services/diarioService';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../../src/theme/espacamento';
import { formatarData } from '../../../src/utils/formatadores';

const OPCOES_PERIODO = [
  { valor: 7, rotulo: '7 dias' },
  { valor: 30, rotulo: '30 dias' },
  { valor: 90, rotulo: '90 dias' },
];

function hexParaRgba(hex, opacidade) {
  const valor = hex.replace('#', '');
  const r = parseInt(valor.substring(0, 2), 16);
  const g = parseInt(valor.substring(2, 4), 16);
  const b = parseInt(valor.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacidade})`;
}

export default function Evolucao() {
  const { cores } = useTema();
  const { sessao } = useSessao();

  const [periodo, setPeriodo] = useState(30);
  const [evolucao, setEvolucao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (!sessao) return;
    setErro('');
    try {
      setEvolucao(await obterEvolucao(sessao.uid, periodo));
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [sessao, periodo]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const larguraTela = Dimensions.get('window').width;
  const pontos = evolucao?.pontos ?? [];
  const mostrarLabelACada = Math.max(1, Math.ceil(pontos.length / 6));

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo }}>
        <CabecalhoTela titulo="Minha evolução" />
        <TelaCarregando />
      </View>
    );
  }

  if (erro) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo }}>
        <CabecalhoTela titulo="Minha evolução" />
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
      <CabecalhoTela titulo="Minha evolução" />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <SeletorSegmentado opcoes={OPCOES_PERIODO} valor={periodo} aoMudar={setPeriodo} />

        {pontos.length > 0 ? (
          <Cartao semPadding>
            <LineChart
              data={{
                labels: pontos.map((p, i) => (i % mostrarLabelACada === 0 ? formatarData(p.data).slice(0, 5) : '')),
                datasets: [
                  {
                    data: pontos.map((p) => p.escalaSintoma),
                    color: () => cores.primaria,
                    strokeWidth: 3,
                  },
                  {
                    data: pontos.map((p) => (p.dosesPrevistas ? (p.dosesTomadas / p.dosesPrevistas) * 10 : 0)),
                    color: (opacidade = 1) => hexParaRgba(cores.terracota, 0.55 * opacidade),
                    strokeWidth: 2,
                  },
                ],
                legend: ['Intensidade do sintoma', 'Doses tomadas (escala relativa)'],
              }}
              width={larguraTela - espacamento.lg * 2 - espacamento.md * 2}
              height={220}
              fromZero
              segments={5}
              chartConfig={{
                backgroundColor: cores.card,
                backgroundGradientFrom: cores.card,
                backgroundGradientTo: cores.card,
                decimalPlaces: 0,
                color: () => cores.textoSecundario,
                labelColor: () => cores.textoSecundario,
                propsForDots: { r: '3' },
              }}
              bezier
              style={{ marginVertical: espacamento.sm, borderRadius: 16 }}
            />
          </Cartao>
        ) : (
          <Cartao>
            <CorpoSecundario>Ainda não há registros suficientes nesse período.</CorpoSecundario>
          </Cartao>
        )}

        <View style={estilos.linhaResumo}>
          <Cartao estilo={{ flex: 1 }}>
            <Legenda>Média do sintoma</Legenda>
            <TituloGrande style={{ marginTop: espacamento.xs }}>{evolucao?.mediaSintoma ?? '–'}</TituloGrande>
          </Cartao>
          <Cartao estilo={{ flex: 1 }}>
            <Legenda>Dias registrados</Legenda>
            <TituloGrande style={{ marginTop: espacamento.xs }}>{evolucao?.diasRegistrados ?? '–'}</TituloGrande>
          </Cartao>
          <Cartao estilo={{ flex: 1 }}>
            <Legenda>Adesão</Legenda>
            <TituloGrande style={{ marginTop: espacamento.xs }}>{evolucao ? `${evolucao.adesao}%` : '–'}</TituloGrande>
          </Cartao>
        </View>

        <Cartao>
          <Subtitulo>Efeitos colaterais mais relatados</Subtitulo>
          {evolucao?.efeitosMaisRelatados.length ? (
            <View style={{ marginTop: espacamento.sm, gap: espacamento.xs }}>
              {evolucao.efeitosMaisRelatados.map((efeito) => (
                <View
                  key={efeito.descricao}
                  style={{ flexDirection: 'row', justifyContent: 'space-between' }}
                >
                  <Corpo>{efeito.descricao}</Corpo>
                  <CorpoSecundario>{efeito.contagem}x</CorpoSecundario>
                </View>
              ))}
            </View>
          ) : (
            <CorpoSecundario style={{ marginTop: espacamento.sm }}>
              Nenhum efeito colateral relatado nesse período.
            </CorpoSecundario>
          )}
        </Cartao>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: espacamento.lg,
    gap: espacamento.md,
    paddingBottom: espacamento.xxl,
  },
  linhaResumo: {
    flexDirection: 'row',
    gap: espacamento.sm,
  },
});
