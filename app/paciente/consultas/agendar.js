// Agendamento — ver CONTEXTO.md, seção 7.7. Também cobre reagendamento: se
// a tela recebe `consultaId` por parâmetro, o profissional fica fixo e o
// rodapé chama reagendarConsulta() em vez de agendarConsulta().

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import Avatar from '../../../src/components/Avatar';
import Botao from '../../../src/components/Botao';
import CabecalhoTela from '../../../src/components/CabecalhoTela';
import Cartao from '../../../src/components/Cartao';
import EstadoVazio from '../../../src/components/EstadoVazio';
import SeletorSegmentado from '../../../src/components/SeletorSegmentado';
import { Corpo, CorpoSecundario, Legenda, Subtitulo } from '../../../src/components/Texto';
import useSessao from '../../../src/hooks/useSessao';
import { agendarConsulta, listarHorariosDisponiveis, reagendarConsulta } from '../../../src/services/consultaService';
import { listarProfissionais } from '../../../src/services/usuarioService';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { alvoToqueMinimo, espacamento } from '../../../src/theme/espacamento';
import { dataLocalISO } from '../../../src/utils/data';
import { avisar } from '../../../src/utils/dialogo';

const SIGLAS_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function gerarProximosDias(quantidade = 14) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Array.from({ length: quantidade }, (_, i) => {
    const dia = new Date(hoje);
    dia.setDate(hoje.getDate() + i);
    return dia;
  });
}

const OPCOES_MODALIDADE = [
  { valor: 'presencial', rotulo: 'Presencial' },
  { valor: 'teleconsulta', rotulo: 'Teleconsulta' },
];

export default function Agendar() {
  const router = useRouter();
  const { cores } = useTema();
  const { sessao } = useSessao();
  const { profissionalId, consultaId } = useLocalSearchParams();
  const reagendando = Boolean(consultaId);

  const [profissionais, setProfissionais] = useState([]);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState(profissionalId ?? null);
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [horarios, setHorarios] = useState([]);
  const [horarioSelecionado, setHorarioSelecionado] = useState(null);
  const [modalidade, setModalidade] = useState('teleconsulta');
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState('');
  const [erroHorarios, setErroHorarios] = useState('');

  const dias = gerarProximosDias();

  // `setState` só dentro do `.then`/`.catch` (nunca direto no corpo do efeito):
  // são callbacks assíncronos, não disparam o aviso de "cascading renders".
  const carregarProfissionais = useCallback(() => {
    listarProfissionais()
      .then((lista) => {
        setProfissionais(lista);
        setErro('');
      })
      .catch((e) => setErro(e.message));
  }, []);

  useEffect(() => {
    carregarProfissionais();
  }, [carregarProfissionais]);

  useEffect(() => {
    if (!profissionalSelecionado || !diaSelecionado) return undefined;
    let cancelado = false;
    listarHorariosDisponiveis(profissionalSelecionado, diaSelecionado)
      .then((lista) => {
        if (cancelado) return;
        setHorarios(lista);
        setErroHorarios('');
      })
      .catch((e) => {
        if (!cancelado) setErroHorarios(e.message);
      });
    return () => {
      cancelado = true;
    };
  }, [profissionalSelecionado, diaSelecionado]);

  const profissional = profissionais.find((p) => p.id === profissionalSelecionado);
  const podeConfirmar = profissionalSelecionado && diaSelecionado && horarioSelecionado;

  async function lidarComConfirmar() {
    const [hora, minuto] = horarioSelecionado.split(':').map(Number);
    const dataHora = new Date(diaSelecionado);
    dataHora.setHours(hora, minuto, 0, 0);

    setConfirmando(true);
    try {
      if (reagendando) {
        await reagendarConsulta(consultaId, dataHora);
      } else {
        await agendarConsulta({
          pacienteId: sessao.uid,
          profissionalId: profissionalSelecionado,
          dataHora,
          modalidade,
        });
      }
      avisar('Consulta confirmada', 'Sua consulta foi agendada com sucesso.', [
        { text: 'OK', onPress: () => router.replace('/paciente/consultas') },
      ]);
    } catch (e) {
      avisar('Não foi possível confirmar', e.message);
    } finally {
      setConfirmando(false);
    }
  }

  if (erro) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo }}>
        <CabecalhoTela titulo={reagendando ? 'Reagendar consulta' : 'Agendar consulta'} />
        <EstadoVazio
          icone="alert-circle-outline"
          titulo="Não foi possível carregar"
          texto={erro}
          tituloBotao="Tentar novamente"
          aoPressionarBotao={carregarProfissionais}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <CabecalhoTela titulo={reagendando ? 'Reagendar consulta' : 'Agendar consulta'} />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View>
          <Subtitulo style={{ marginBottom: espacamento.sm }}>Profissional</Subtitulo>
          {reagendando && profissional ? (
            <Cartao>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacamento.sm }}>
                <Avatar nome={profissional.nome} />
                <View>
                  <Corpo>{profissional.nome}</Corpo>
                  <CorpoSecundario>
                    {profissional.especialidade} · {profissional.conselho} {profissional.numRegistro}
                  </CorpoSecundario>
                </View>
              </View>
            </Cartao>
          ) : (
            <View style={{ gap: espacamento.sm }}>
              {profissionais.map((prof) => (
                <Pressable key={prof.id} onPress={() => {
                  setProfissionalSelecionado(prof.id);
                  setHorarioSelecionado(null);
                  setHorarios([]);
                }}>
                  <Cartao
                    estilo={
                      profissionalSelecionado === prof.id
                        ? { borderWidth: 2, borderColor: cores.primaria }
                        : undefined
                    }
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacamento.sm }}>
                      <Avatar nome={prof.nome} />
                      <View style={{ flex: 1 }}>
                        <Corpo>{prof.nome}</Corpo>
                        <CorpoSecundario>
                          {prof.especialidade} · {prof.conselho} {prof.numRegistro}
                        </CorpoSecundario>
                      </View>
                    </View>
                  </Cartao>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {profissionalSelecionado ? (
          <View>
            <Subtitulo style={{ marginBottom: espacamento.sm }}>Dia</Subtitulo>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espacamento.sm }}>
              {dias.map((dia) => {
                const fimDeSemana = dia.getDay() === 0 || dia.getDay() === 6;
                const selecionado = diaSelecionado && dia.getTime() === diaSelecionado.getTime();
                return (
                  <Pressable
                    key={dataLocalISO(dia)}
                    disabled={fimDeSemana}
                    onPress={() => {
                      setDiaSelecionado(dia);
                      setHorarioSelecionado(null);
                      setHorarios([]);
                    }}
                    style={[
                      estilos.diaChip,
                      {
                        backgroundColor: selecionado ? cores.primaria : cores.card,
                        opacity: fimDeSemana ? 0.4 : 1,
                      },
                    ]}
                  >
                    <Legenda style={{ color: selecionado ? cores.branco : cores.textoSecundario }}>
                      {SIGLAS_DIA[dia.getDay()]}
                    </Legenda>
                    <Corpo style={{ color: selecionado ? cores.branco : cores.textoPrincipal }}>
                      {dia.getDate()}
                    </Corpo>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {diaSelecionado ? (
          <View>
            <Subtitulo style={{ marginBottom: espacamento.sm }}>Horário</Subtitulo>
            {erroHorarios ? (
              <CorpoSecundario style={{ color: cores.terracotaEscura }}>{erroHorarios}</CorpoSecundario>
            ) : horarios.length === 0 ? (
              <CorpoSecundario>Sem horários disponíveis nesse dia.</CorpoSecundario>
            ) : (
              <View style={estilos.gradeHorarios}>
                {horarios.map((horario) => {
                  const selecionado = horario === horarioSelecionado;
                  return (
                    <Pressable
                      key={horario}
                      onPress={() => setHorarioSelecionado(horario)}
                      style={[
                        estilos.horarioChip,
                        {
                          backgroundColor: selecionado ? cores.primaria : cores.card,
                          borderColor: selecionado ? cores.primaria : cores.borda,
                        },
                      ]}
                    >
                      <Corpo style={{ color: selecionado ? cores.branco : cores.textoPrincipal }}>{horario}</Corpo>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {!reagendando && horarioSelecionado ? (
          <View>
            <Subtitulo style={{ marginBottom: espacamento.sm }}>Modalidade</Subtitulo>
            <SeletorSegmentado opcoes={OPCOES_MODALIDADE} valor={modalidade} aoMudar={setModalidade} />
          </View>
        ) : null}
      </ScrollView>

      <View style={[estilos.rodape, { borderTopColor: cores.borda, backgroundColor: cores.fundo }]}>
        <Botao titulo="Confirmar" desabilitado={!podeConfirmar} carregando={confirmando} onPress={lidarComConfirmar} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: espacamento.lg,
    gap: espacamento.lg,
    paddingBottom: espacamento.xxl,
  },
  diaChip: {
    width: 56,
    height: alvoToqueMinimo + 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  gradeHorarios: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento.sm,
  },
  horarioChip: {
    minWidth: 84,
    minHeight: alvoToqueMinimo,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rodape: {
    padding: espacamento.lg,
    borderTopWidth: 1,
  },
});
