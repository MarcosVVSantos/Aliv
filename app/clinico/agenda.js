// Agenda do profissional — ver CONTEXTO.md, seção 7.11. Layout denso:
// linha do tempo vertical, borda colorida por status, mais itens visíveis
// por tela do que no lado do paciente.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import EstadoVazio from '../../src/components/EstadoVazio';
import { Corpo, CorpoSecundario, Legenda, Titulo } from '../../src/components/Texto';
import useSessao from '../../src/hooks/useSessao';
import { listarAgendaProfissional } from '../../src/services/consultaService';
import { useTema } from '../../src/theme/AcessibilidadeContext';
import { alvoToqueMinimo, espacamento } from '../../src/theme/espacamento';
import { formatarDataExtenso, formatarHora } from '../../src/utils/formatadores';
import { avisar } from '../../src/utils/dialogo';

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function AgendaProfissional() {
  const router = useRouter();
  const { cores } = useTema();
  const { sessao } = useSessao();

  const [data, setData] = useState(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return hoje;
  });
  const [consultas, setConsultas] = useState([]);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (!sessao) return;
    setErro('');
    try {
      setConsultas(await listarAgendaProfissional(sessao.uid, data));
    } catch (e) {
      setErro(e.message);
    }
  }, [sessao, data]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  function mudarDia(delta) {
    setData((atual) => {
      const nova = new Date(atual);
      nova.setDate(atual.getDate() + delta);
      return nova;
    });
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={[estilos.navegacaoData, { borderBottomColor: cores.borda }]}>
        <Pressable onPress={() => mudarDia(-1)} hitSlop={8} style={estilos.botaoSeta}>
          <Ionicons name="chevron-back" size={22} color={cores.textoPrincipal} />
        </Pressable>
        <Titulo style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>
          {capitalizar(formatarDataExtenso(data))}
        </Titulo>
        <Pressable onPress={() => mudarDia(1)} hitSlop={8} style={estilos.botaoSeta}>
          <Ionicons name="chevron-forward" size={22} color={cores.textoPrincipal} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={estilos.lista}>
        {erro ? (
          <EstadoVazio
            icone="alert-circle-outline"
            titulo="Não foi possível carregar"
            texto={erro}
            tituloBotao="Tentar novamente"
            aoPressionarBotao={carregar}
          />
        ) : consultas.length === 0 ? (
          <CorpoSecundario style={{ padding: espacamento.lg }}>Nenhuma consulta nesse dia.</CorpoSecundario>
        ) : (
          consultas.map((consulta) => (
            <View
              key={consulta.id}
              style={[
                estilos.linha,
                {
                  borderLeftColor:
                    consulta.status === 'cancelada'
                      ? cores.terracotaEscura
                      : consulta.status === 'confirmada'
                        ? cores.primaria
                        : cores.borda,
                  backgroundColor: cores.card,
                },
              ]}
            >
              <View style={estilos.horario}>
                <Corpo>{formatarHora(consulta.dataHora)}</Corpo>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacamento.xs }}>
                  <Corpo numberOfLines={1} style={{ flex: 1 }}>
                    {consulta.pacienteNome}
                  </Corpo>
                  {consulta.ehRetorno ? <Legenda style={{ color: cores.primaria }}>Retorno</Legenda> : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacamento.xs, marginTop: 2 }}>
                  <Ionicons
                    name={consulta.modalidade === 'teleconsulta' ? 'videocam-outline' : 'business-outline'}
                    size={14}
                    color={cores.textoSecundario}
                  />
                  <Legenda>
                    {consulta.modalidade === 'teleconsulta' ? 'Teleconsulta' : 'Presencial'} · {consulta.status}
                  </Legenda>
                </View>
              </View>
              <Pressable
                onPress={() => router.push({ pathname: '/clinico/paciente/[id]', params: { id: consulta.pacienteId } })}
                hitSlop={8}
              >
                <Ionicons name="chevron-forward" size={20} color={cores.textoSecundario} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable
        style={[estilos.botaoFlutuante, { backgroundColor: cores.primaria }]}
        onPress={() => avisar('Novo agendamento', 'Agendamento manual pela agenda ainda não está disponível nesta demonstração.')}
        accessibilityRole="button"
        accessibilityLabel="Adicionar consulta"
      >
        <Ionicons name="add" size={28} color={cores.branco} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  navegacaoData: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacamento.sm,
    paddingVertical: espacamento.sm,
    borderBottomWidth: 1,
  },
  botaoSeta: {
    width: alvoToqueMinimo,
    height: alvoToqueMinimo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lista: {
    padding: espacamento.md,
    gap: espacamento.sm,
    paddingBottom: 96,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: espacamento.sm,
  },
  horario: {
    width: 56,
  },
  botaoFlutuante: {
    position: 'absolute',
    right: espacamento.lg,
    bottom: espacamento.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
