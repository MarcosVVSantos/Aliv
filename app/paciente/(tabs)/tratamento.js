// Tratamento — ver CONTEXTO.md, seção 7.5.
// ⚠️ Nome do produto sempre com concentração e volume ("Óleo CBD 200 mg/mL ·
// 30 mL"), adesão contada por dose (não por dia), selo da receita e card de
// renovação sempre a partir da `situacao` calculada (nunca do status gravado).

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import Botao from '../../../src/components/Botao';
import Cartao from '../../../src/components/Cartao';
import EstadoVazio from '../../../src/components/EstadoVazio';
import Selo from '../../../src/components/Selo';
import TelaCarregando from '../../../src/components/TelaCarregando';
import { Corpo, CorpoSecundario, Legenda, Subtitulo, Titulo } from '../../../src/components/Texto';
import useSessao from '../../../src/hooks/useSessao';
import { obterPrescricaoAtiva, solicitarRenovacao } from '../../../src/services/prescricaoService';
import { obterProduto } from '../../../src/services/produtoService';
import { obterAdesaoSemana } from '../../../src/services/diarioService';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../../src/theme/espacamento';
import { rotulosDaAdesao } from '../../../src/utils/adesao';
import { formatarData } from '../../../src/utils/formatadores';
import { avisar } from '../../../src/utils/dialogo';
import { textoHorarios } from '../../../src/utils/prescricao';
import { nomeExibicaoProduto } from '../../../src/utils/produto';

const SELO_SITUACAO = {
  rascunho: { texto: 'Rascunho', tom: 'neutro' },
  ativa: { texto: 'Vigente', tom: 'sucesso' },
  vence_em_breve: { texto: 'Vence em breve', tom: 'atencao' },
  vencida: { texto: 'Vencida', tom: 'perigo' },
  cancelada: { texto: 'Cancelada', tom: 'neutro' },
};

export default function Tratamento() {
  const { cores } = useTema();
  const { sessao } = useSessao();

  const [prescricao, setPrescricao] = useState(null);
  const [produto, setProduto] = useState(null);
  const [adesao, setAdesao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [solicitandoRenovacao, setSolicitandoRenovacao] = useState(false);

  const carregar = useCallback(async () => {
    if (!sessao) return;
    setErro('');
    try {
      const [presc, adesaoSemana] = await Promise.all([
        obterPrescricaoAtiva(sessao.uid),
        obterAdesaoSemana(sessao.uid),
      ]);
      setPrescricao(presc);
      setAdesao(adesaoSemana);
      if (presc?.itens?.[0]?.produtoId) {
        setProduto(await obterProduto(presc.itens[0].produtoId));
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

  async function lidarComRenovacao() {
    setSolicitandoRenovacao(true);
    try {
      await solicitarRenovacao(sessao.uid, prescricao.id);
      avisar('Renovação solicitada', 'A clínica foi avisada e vai entrar em contato para renovar sua receita.');
    } catch (e) {
      avisar('Não foi possível solicitar a renovação', e.message);
    } finally {
      setSolicitandoRenovacao(false);
    }
  }

  if (carregando) {
    return <TelaCarregando />;
  }

  if (erro) {
    return (
      <View style={[estilos.tela, { backgroundColor: cores.fundo }]}>
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

  if (!prescricao) {
    return (
      <View style={[estilos.tela, { backgroundColor: cores.fundo, alignItems: 'center', justifyContent: 'center' }]}>
        <CorpoSecundario>Nenhum tratamento ativo no momento.</CorpoSecundario>
      </View>
    );
  }

  const item = prescricao.itens[0];
  const rotulos = adesao ? rotulosDaAdesao(adesao.dias) : [];
  const selo = SELO_SITUACAO[prescricao.situacao] ?? SELO_SITUACAO.cancelada;
  const mostrarBannerRenovacao =
    prescricao.situacao === 'vence_em_breve' || prescricao.situacao === 'vencida';
  // Prefere o cadastro do produto (traz o volume mesmo em receitas antigas).
  const nomeProduto = produto
    ? nomeExibicaoProduto(produto.nome, produto.teorCbd, produto.volumeMl)
    : item.produtoNome;

  return (
    <ScrollView style={{ backgroundColor: cores.fundo }} contentContainerStyle={estilos.conteudo}>
      <Titulo>Tratamento</Titulo>

      <Cartao>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Subtitulo>{nomeProduto}</Subtitulo>
            {produto ? (
              <CorpoSecundario>
                {produto.espectro === 'full spectrum' ? 'Full spectrum' : produto.espectro === 'broad spectrum' ? 'Broad spectrum' : 'Isolado'}
              </CorpoSecundario>
            ) : null}
          </View>
          <Selo texto={selo.texto} tom={selo.tom} />
        </View>

        <View style={{ marginTop: espacamento.md, gap: 2 }}>
          <Corpo>{item.posologia}</Corpo>
          <CorpoSecundario>{textoHorarios(item.horarios)}</CorpoSecundario>
          {item.instrucoesUso ? <CorpoSecundario>{item.instrucoesUso}</CorpoSecundario> : null}
        </View>

        <CorpoSecundario style={{ marginTop: espacamento.md }}>
          Prescrito por {prescricao.profissionalNome} · emitida em {formatarData(prescricao.dataEmissao)}
        </CorpoSecundario>
      </Cartao>

      {adesao ? (
        <Cartao>
          <Subtitulo>Últimos 7 dias</Subtitulo>
          <View style={estilos.linhaCirculos}>
            {adesao.dias.map((dia, indice) => (
              <View key={indice} style={{ alignItems: 'center', gap: espacamento.xs }}>
                <View style={[estilos.circulo, estiloCirculo(dia.situacao, cores)]} />
                <Legenda>{rotulos[indice]}</Legenda>
              </View>
            ))}
          </View>
          <CorpoSecundario style={{ marginTop: espacamento.sm }}>
            {adesao.tomadas} de {adesao.previstas} doses tomadas nos últimos 7 dias
          </CorpoSecundario>
        </Cartao>
      ) : null}

      <Cartao>
        <Subtitulo>Receita médica</Subtitulo>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: espacamento.sm }}>
          <View>
            <CorpoSecundario>Válida até {formatarData(prescricao.dataValidade)}</CorpoSecundario>
            <CorpoSecundario>
              {prescricao.diasRestantes >= 0
                ? `${prescricao.diasRestantes} dias restantes`
                : `Vencida há ${Math.abs(prescricao.diasRestantes)} dias`}
            </CorpoSecundario>
          </View>
          <Selo texto={selo.texto} tom={selo.tom} />
        </View>
        <Botao
          titulo="Baixar receita"
          variante="secundario"
          estilo={{ marginTop: espacamento.md }}
          onPress={() =>
            avisar('Baixar receita', 'Recurso de download ainda não disponível nesta demonstração.')
          }
        />
      </Cartao>

      {mostrarBannerRenovacao ? (
        <Cartao estilo={{ backgroundColor: cores.terracotaClara }}>
          <Subtitulo>Sua receita está perto de vencer</Subtitulo>
          <CorpoSecundario style={{ marginTop: espacamento.xs }}>
            Solicite a renovação com antecedência para não ficar sem o tratamento.
          </CorpoSecundario>
          <Botao
            titulo="Solicitar renovação"
            variante="secundario"
            estilo={{ marginTop: espacamento.md }}
            carregando={solicitandoRenovacao}
            onPress={lidarComRenovacao}
          />
        </Cartao>
      ) : null}
    </ScrollView>
  );
}

// completo: todas as doses do dia · parcial: algumas · perdido: nenhuma · futuro: ainda não há o que julgar.
function estiloCirculo(situacao, cores) {
  if (situacao === 'completo') return { backgroundColor: cores.primaria };
  if (situacao === 'parcial') {
    return { backgroundColor: cores.terracotaClara, borderWidth: 2, borderColor: cores.terracota };
  }
  if (situacao === 'perdido') return { backgroundColor: cores.terracota };
  return { backgroundColor: cores.borda };
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: {
    padding: espacamento.lg,
    gap: espacamento.md,
    paddingBottom: espacamento.xxl,
  },
  linhaCirculos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: espacamento.md,
  },
  circulo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});
