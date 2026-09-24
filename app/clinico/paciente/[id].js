// Ficha do paciente — ver CONTEXTO.md, seção 7.12.

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import Botao from '../../../src/components/Botao';
import Cartao from '../../../src/components/Cartao';
import Chip from '../../../src/components/Chip';
import EstadoVazio from '../../../src/components/EstadoVazio';
import SeletorSegmentado from '../../../src/components/SeletorSegmentado';
import Selo from '../../../src/components/Selo';
import TelaCarregando from '../../../src/components/TelaCarregando';
import { Corpo, CorpoSecundario, Titulo } from '../../../src/components/Texto';
import { listarHistoricoConsultas } from '../../../src/services/consultaService';
import { listarRegistrosDiarios, obterEvolucao } from '../../../src/services/diarioService';
import { listarPrescricoes, obterPrescricaoAtiva } from '../../../src/services/prescricaoService';
import { obterUsuario } from '../../../src/services/usuarioService';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../../src/theme/espacamento';
import { calcularIdade, formatarData, formatarDataCurta } from '../../../src/utils/formatadores';

const ABAS = [
  { valor: 'diario', rotulo: 'Diário' },
  { valor: 'historico', rotulo: 'Histórico' },
  { valor: 'prescricoes', rotulo: 'Prescrições' },
];

const SELO_SITUACAO_PRESCRICAO = {
  rascunho: { texto: 'Rascunho', tom: 'neutro' },
  ativa: { texto: 'Vigente', tom: 'sucesso' },
  vence_em_breve: { texto: 'Vence em breve', tom: 'atencao' },
  vencida: { texto: 'Vencida', tom: 'perigo' },
  cancelada: { texto: 'Cancelada', tom: 'neutro' },
};

export default function FichaPaciente() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { cores } = useTema();

  const [aba, setAba] = useState('diario');
  const [usuario, setUsuario] = useState(null);
  const [prescricaoAtiva, setPrescricaoAtiva] = useState(null);
  const [evolucao, setEvolucao] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [prescricoes, setPrescricoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (!id) return;
    setErro('');
    try {
      const [dadosUsuario, presc, evol, regs, hist, prescs] = await Promise.all([
        obterUsuario(id),
        obterPrescricaoAtiva(id),
        obterEvolucao(id, 30),
        listarRegistrosDiarios(id, 30),
        listarHistoricoConsultas(id, 'todas'),
        listarPrescricoes(id),
      ]);
      setUsuario(dadosUsuario);
      setPrescricaoAtiva(presc);
      setEvolucao(evol);
      setRegistros(regs);
      setHistorico(hist);
      setPrescricoes(prescs);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const idade = usuario?.paciente?.dataNascimento ? calcularIdade(usuario.paciente.dataNascimento) : null;
  const larguraTela = Dimensions.get('window').width;
  const pontos = evolucao?.pontos ?? [];

  if (carregando) {
    return <TelaCarregando />;
  }

  if (erro) {
    return (
      <View style={{ flex: 1 }}>
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
    <View style={{ flex: 1 }}>
      <View style={[estilos.cabecalho, { borderBottomColor: cores.borda, backgroundColor: cores.card }]}>
        <View>
          <Titulo>{usuario?.paciente?.nomeCompleto ?? '...'}</Titulo>
          <CorpoSecundario>{idade ? `${idade} anos` : ''}</CorpoSecundario>
        </View>
        {prescricaoAtiva ? (
          <View style={{ alignItems: 'flex-end' }}>
            <CorpoSecundario>{prescricaoAtiva.itens[0]?.produtoNome}</CorpoSecundario>
            <Selo
              texto={SELO_SITUACAO_PRESCRICAO[prescricaoAtiva.situacao]?.texto}
              tom={SELO_SITUACAO_PRESCRICAO[prescricaoAtiva.situacao]?.tom}
            />
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={estilos.conteudo}>
        <SeletorSegmentado opcoes={ABAS} valor={aba} aoMudar={setAba} />

        {aba === 'diario' ? (
          <>
            {pontos.length > 0 ? (
              <Cartao semPadding>
                <LineChart
                  data={{
                    labels: pontos.map((p, i) => (i % 6 === 0 ? formatarData(p.data).slice(0, 5) : '')),
                    datasets: [
                      { data: pontos.map((p) => p.escalaSintoma), color: () => cores.primaria, strokeWidth: 3 },
                      { data: pontos.map((p) => p.dosesTomadas), color: () => cores.terracota, strokeWidth: 2 },
                    ],
                    legend: ['Intensidade do sintoma', 'Doses tomadas no dia'],
                  }}
                  width={larguraTela - espacamento.lg * 2 - espacamento.md * 2}
                  height={200}
                  fromZero
                  chartConfig={{
                    backgroundColor: cores.card,
                    backgroundGradientFrom: cores.card,
                    backgroundGradientTo: cores.card,
                    decimalPlaces: 0,
                    color: () => cores.textoSecundario,
                    labelColor: () => cores.textoSecundario,
                    propsForDots: { r: '2' },
                  }}
                  bezier
                  style={{ borderRadius: 16 }}
                />
              </Cartao>
            ) : null}

            <View style={{ gap: espacamento.sm }}>
              {registros.map((registro) => (
                <Cartao key={registro.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Corpo>{formatarDataCurta(registro.data)}</Corpo>
                    <Corpo style={{ color: cores.primaria }}>Sintoma: {registro.escalaSintoma}</Corpo>
                  </View>
                  <CorpoSecundario>
                    Doses tomadas: {registro.dosesTomadas} de {registro.dosesPrevistas}
                  </CorpoSecundario>
                  {registro.semEfeitosAdversos ? (
                    <CorpoSecundario>Sem efeitos adversos</CorpoSecundario>
                  ) : null}
                  {registro.efeitosAdversos.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacamento.xs, marginTop: espacamento.xs }}>
                      {registro.efeitosAdversos.map((efeito) => (
                        <Chip key={efeito} texto={efeito} selecionado={false} onPress={() => {}} />
                      ))}
                    </View>
                  ) : null}
                </Cartao>
              ))}
            </View>
          </>
        ) : null}

        {aba === 'historico' ? (
          <View style={{ gap: espacamento.sm }}>
            {historico.map((consulta) => (
              <Cartao key={consulta.id}>
                <Corpo>{formatarDataCurta(consulta.dataHora)}</Corpo>
                <CorpoSecundario>{consulta.resumo}</CorpoSecundario>
              </Cartao>
            ))}
          </View>
        ) : null}

        {aba === 'prescricoes' ? (
          <View style={{ gap: espacamento.sm }}>
            {prescricoes.map((presc) => {
              const selo = SELO_SITUACAO_PRESCRICAO[presc.situacao] ?? SELO_SITUACAO_PRESCRICAO.cancelada;
              return (
                <Cartao key={presc.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Corpo>{presc.itens[0]?.produtoNome}</Corpo>
                    <Selo texto={selo.texto} tom={selo.tom} />
                  </View>
                  <CorpoSecundario>
                    {presc.dataEmissao ? `Emitida em ${formatarData(presc.dataEmissao)}` : 'Não emitida'} · sintoma alvo:{' '}
                    {presc.sintomaAlvo}
                  </CorpoSecundario>
                </Cartao>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <View style={[estilos.rodape, { borderTopColor: cores.borda, backgroundColor: cores.fundo }]}>
        <Botao
          titulo="Nova prescrição"
          onPress={() => router.push({ pathname: '/clinico/prescricao/nova', params: { pacienteId: id } })}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: espacamento.lg,
    borderBottomWidth: 1,
  },
  conteudo: {
    padding: espacamento.lg,
    gap: espacamento.md,
    paddingBottom: espacamento.xxl,
  },
  rodape: {
    padding: espacamento.lg,
    borderTopWidth: 1,
  },
});
