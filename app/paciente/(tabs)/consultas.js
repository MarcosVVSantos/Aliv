// Consultas — ver CONTEXTO.md, seção 7.6. Próximas e Histórico vivem na
// mesma tela, controladas por um seletor segmentado.

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import Avatar from '../../../src/components/Avatar';
import Botao from '../../../src/components/Botao';
import Cartao from '../../../src/components/Cartao';
import EstadoVazio from '../../../src/components/EstadoVazio';
import SeletorSegmentado from '../../../src/components/SeletorSegmentado';
import Selo from '../../../src/components/Selo';
import TelaCarregando from '../../../src/components/TelaCarregando';
import { Corpo, CorpoSecundario, Subtitulo, Titulo } from '../../../src/components/Texto';
import useSessao from '../../../src/hooks/useSessao';
import {
  confirmarPresenca,
  listarHistoricoConsultas,
  listarProximasConsultas,
} from '../../../src/services/consultaService';
import { listarProfissionais } from '../../../src/services/usuarioService';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../../src/theme/espacamento';
import { avisar } from '../../../src/utils/dialogo';
import { formatarDataCurta, formatarHora } from '../../../src/utils/formatadores';

const SELECAO_ABA = [
  { valor: 'proximas', rotulo: 'Próximas' },
  { valor: 'historico', rotulo: 'Histórico' },
];

const SELECAO_FILTRO = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'presencial', rotulo: 'Presenciais' },
  { valor: 'teleconsulta', rotulo: 'Teleconsultas' },
];

function SeloModalidade({ modalidade }) {
  return <Selo texto={modalidade === 'teleconsulta' ? 'Teleconsulta' : 'Presencial'} tom="sucesso" />;
}

export default function Consultas() {
  const router = useRouter();
  const { cores } = useTema();
  const { sessao } = useSessao();
  // app/paciente/consultas/historico.js redireciona pra cá com ?aba=historico —
  // é o mesmo atalho pedido na árvore de pastas da seção 4 do contexto,
  // sem duplicar a tela (a seção 7.6 pede as duas visões juntas).
  const { aba: abaInicial } = useLocalSearchParams();

  const [aba, setAba] = useState(abaInicial === 'historico' ? 'historico' : 'proximas');
  const [filtroHistorico, setFiltroHistorico] = useState('todas');
  const [proximas, setProximas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [confirmando, setConfirmando] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (!sessao) return;
    setErro('');
    try {
      const [proximasConsultas, todosProfissionais] = await Promise.all([
        listarProximasConsultas(sessao.uid),
        listarProfissionais(),
      ]);
      setProximas(proximasConsultas);
      setProfissionais(todosProfissionais);
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

  useFocusEffect(
    useCallback(() => {
      if (!sessao || aba !== 'historico') return;
      listarHistoricoConsultas(sessao.uid, filtroHistorico)
        .then(setHistorico)
        .catch((e) => setErro(e.message));
    }, [sessao, aba, filtroHistorico])
  );

  async function lidarComConfirmar(consultaId) {
    setConfirmando(consultaId);
    try {
      await confirmarPresenca(consultaId);
      await carregar();
    } catch (e) {
      avisar('Não foi possível confirmar a presença', e.message);
    } finally {
      setConfirmando(null);
    }
  }

  // ⚠️ Um profissional que já tem consulta agendada não aparece duplicado
  // na lista de "Agendar nova consulta".
  const idsComConsultaAgendada = new Set(proximas.map((c) => c.profissionalId));
  const profissionaisDisponiveis = profissionais.filter((p) => !idsComConsultaAgendada.has(p.id));

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
        <Titulo>Consultas</Titulo>
        <SeletorSegmentado opcoes={SELECAO_ABA} valor={aba} aoMudar={setAba} />

        {aba === 'proximas' ? (
          <>
            {proximas.length === 0 ? (
              <EstadoVazio
                icone="calendar-outline"
                titulo="Nenhuma consulta registrada ainda"
                texto="Agende sua primeira consulta com um dos nossos profissionais."
              />
            ) : (
              <View style={{ gap: espacamento.md }}>
                {proximas.map((consulta) => (
                  <Cartao key={consulta.id}>
                    <View style={{ flexDirection: 'row', gap: espacamento.sm }}>
                      <Avatar nome={consulta.profissionalNome} />
                      <View style={{ flex: 1 }}>
                        <Corpo>{consulta.profissionalNome}</Corpo>
                        <CorpoSecundario>{consulta.especialidade}</CorpoSecundario>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacamento.sm, marginTop: espacamento.xs }}>
                          <SeloModalidade modalidade={consulta.modalidade} />
                          <CorpoSecundario>
                            {formatarDataCurta(consulta.dataHora)} · {formatarHora(consulta.dataHora)}
                          </CorpoSecundario>
                        </View>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: espacamento.sm, marginTop: espacamento.md }}>
                      <Botao
                        titulo={consulta.status === 'confirmada' ? 'Presença confirmada' : 'Confirmar presença'}
                        variante={consulta.status === 'confirmada' ? 'secundario' : 'primario'}
                        desabilitado={consulta.status === 'confirmada'}
                        carregando={confirmando === consulta.id}
                        onPress={() => lidarComConfirmar(consulta.id)}
                        tamanhoCompleto={false}
                        estilo={{ flex: 1 }}
                      />
                      <Botao
                        titulo="Reagendar"
                        variante="secundario"
                        tamanhoCompleto={false}
                        estilo={{ flex: 1 }}
                        onPress={() =>
                          router.push({
                            pathname: '/paciente/consultas/agendar',
                            params: { consultaId: consulta.id, profissionalId: consulta.profissionalId },
                          })
                        }
                      />
                    </View>
                  </Cartao>
                ))}
              </View>
            )}

            <View>
              <Subtitulo style={{ marginBottom: espacamento.sm }}>Agendar nova consulta</Subtitulo>
              <View style={{ gap: espacamento.sm }}>
                {profissionaisDisponiveis.length === 0 ? (
                  <CorpoSecundario>Você já tem consultas agendadas com todos os profissionais.</CorpoSecundario>
                ) : (
                  profissionaisDisponiveis.map((prof) => (
                    <Cartao key={prof.id}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacamento.sm }}>
                        <Avatar nome={prof.nome} tamanho={40} />
                        <View style={{ flex: 1 }}>
                          <Corpo>{prof.nome}</Corpo>
                          <CorpoSecundario>{prof.especialidade}</CorpoSecundario>
                        </View>
                        <Botao
                          titulo="Agendar"
                          tamanhoCompleto={false}
                          onPress={() =>
                            router.push({ pathname: '/paciente/consultas/agendar', params: { profissionalId: prof.id } })
                          }
                        />
                      </View>
                    </Cartao>
                  ))
                )}
              </View>
            </View>
          </>
        ) : (
          <>
            <SeletorSegmentado opcoes={SELECAO_FILTRO} valor={filtroHistorico} aoMudar={setFiltroHistorico} />
            {historico.length === 0 ? (
              <EstadoVazio
                icone="time-outline"
                titulo="Nenhuma consulta no histórico"
                texto="Suas consultas realizadas vão aparecer aqui."
              />
            ) : (
              <View style={{ gap: espacamento.md }}>
                {historico.map((consulta) => (
                  <Cartao key={consulta.id}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <CorpoSecundario>{formatarDataCurta(consulta.dataHora)}</CorpoSecundario>
                      <SeloModalidade modalidade={consulta.modalidade} />
                    </View>
                    <Corpo style={{ marginTop: espacamento.xs }}>{consulta.profissionalNome}</Corpo>
                    <CorpoSecundario>{consulta.especialidade}</CorpoSecundario>
                    {consulta.resumo ? (
                      <CorpoSecundario style={{ marginTop: espacamento.xs }}>{consulta.resumo}</CorpoSecundario>
                    ) : null}
                  </Cartao>
                ))}
              </View>
            )}
          </>
        )}
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
});
