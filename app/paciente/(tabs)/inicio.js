// Início — ver CONTEXTO.md, seção 7.4.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import Avatar from '../../../src/components/Avatar';
import Botao from '../../../src/components/Botao';
import Cartao from '../../../src/components/Cartao';
import EstadoVazio from '../../../src/components/EstadoVazio';
import Selo from '../../../src/components/Selo';
import { Corpo, CorpoSecundario, Subtitulo, Titulo } from '../../../src/components/Texto';
import useSessao from '../../../src/hooks/useSessao';
import { obterUsuario } from '../../../src/services/usuarioService';
import { listarProximasConsultas } from '../../../src/services/consultaService';
import { listarDosesDoDia, marcarDoseTomada } from '../../../src/services/diarioService';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../../src/theme/espacamento';
import { avisar } from '../../../src/utils/dialogo';
import { formatarDataCurta, formatarHora } from '../../../src/utils/formatadores';

const ACESSOS_RAPIDOS = [
  { chave: 'evolucao', icone: 'trending-up-outline', titulo: 'Minha evolução', rota: '/paciente/tratamento/evolucao' },
  { chave: 'receita', icone: 'document-text-outline', titulo: 'Minha receita', rota: '/paciente/tratamento' },
  { chave: 'clinica', icone: 'chatbubbles-outline', titulo: 'Falar com a clínica', rota: '/paciente/perfil/contato' },
  // ⚠️ ícone de interrogação/balão, nunca relógio — ver seção 7.4 do contexto.
  { chave: 'ajuda', icone: 'help-circle-outline', titulo: 'Central de ajuda', rota: '/paciente/perfil/contato' },
];

export default function Inicio() {
  const router = useRouter();
  const { cores } = useTema();
  const { sessao } = useSessao();

  const [usuario, setUsuario] = useState(null);
  const [doses, setDoses] = useState([]);
  const [proximaConsulta, setProximaConsulta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [atualizandoDose, setAtualizandoDose] = useState(null);

  const carregar = useCallback(async () => {
    if (!sessao) return;
    setCarregando(true);
    setErro('');
    try {
      const [dadosUsuario, dosesHoje, consultas] = await Promise.all([
        obterUsuario(sessao.uid),
        listarDosesDoDia(sessao.uid),
        listarProximasConsultas(sessao.uid),
      ]);
      setUsuario(dadosUsuario);
      setDoses(dosesHoje);
      setProximaConsulta(consultas[0] ?? null);
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

  const primeiroNome = (usuario?.paciente?.nomeCompleto ?? '').split(' ')[0] || '';
  const proximaDosePendente = doses.find((d) => d.status === 'pendente');

  // Erro na primeira carga (nada pra mostrar ainda): tela cheia, como o resto
  // do app. Erro numa atualização puxada (pull-to-refresh) com dado antigo na
  // tela: um aviso compacto, sem esconder o que já carregou antes.
  if (erro && !usuario) {
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
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={cores.primaria} />}
      >
        {erro ? (
          <Cartao estilo={{ backgroundColor: cores.terracotaClara }}>
            <CorpoSecundario style={{ color: cores.terracotaEscura }}>{erro}</CorpoSecundario>
          </Cartao>
        ) : null}

        <View style={estilos.saudacao}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacamento.sm, flex: 1 }}>
            <Avatar nome={usuario?.paciente?.nomeCompleto ?? ''} />
            <View>
              <CorpoSecundario>Olá,</CorpoSecundario>
              <Titulo numberOfLines={1}>{primeiroNome || '...'}</Titulo>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Notificações" hitSlop={8}>
            <Ionicons name="notifications-outline" size={26} color={cores.textoPrincipal} />
          </Pressable>
        </View>

        <Cartao>
          <Subtitulo>Próxima dose</Subtitulo>
          {proximaDosePendente ? (
            <View style={{ marginTop: espacamento.sm, gap: espacamento.sm }}>
              <Selo texto={proximaDosePendente.horario} tom="atencao" />
              <Corpo>{proximaDosePendente.produtoNome}</Corpo>
              <CorpoSecundario>
                {proximaDosePendente.dose} {proximaDosePendente.unidade}
                {proximaDosePendente.via ? ` · via ${proximaDosePendente.via.toLowerCase()}` : ''}
              </CorpoSecundario>
              <Botao
                titulo="Marcar como tomada"
                onPress={() => lidarComMarcarTomada(proximaDosePendente)}
                carregando={atualizandoDose === proximaDosePendente.id}
              />
            </View>
          ) : (
            <CorpoSecundario style={{ marginTop: espacamento.sm }}>
              {doses.length > 0
                ? 'Todas as doses de hoje já foram registradas. 🎉'
                : 'Nenhuma dose prevista para hoje.'}
            </CorpoSecundario>
          )}
        </Cartao>

        <Pressable onPress={() => router.push('/paciente/consultas')}>
          <Cartao>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Subtitulo>Próxima consulta</Subtitulo>
                {proximaConsulta ? (
                  <View style={{ marginTop: espacamento.sm, gap: 2 }}>
                    <Corpo>{proximaConsulta.profissionalNome}</Corpo>
                    <CorpoSecundario>{proximaConsulta.especialidade}</CorpoSecundario>
                    <View style={{ flexDirection: 'row', gap: espacamento.sm, marginTop: espacamento.xs, alignItems: 'center' }}>
                      <Selo
                        texto={proximaConsulta.modalidade === 'teleconsulta' ? 'Teleconsulta' : 'Presencial'}
                        tom="sucesso"
                      />
                      <CorpoSecundario>
                        {formatarDataCurta(proximaConsulta.dataHora)} · {formatarHora(proximaConsulta.dataHora)}
                      </CorpoSecundario>
                    </View>
                  </View>
                ) : (
                  <CorpoSecundario style={{ marginTop: espacamento.sm }}>
                    Nenhuma consulta agendada.
                  </CorpoSecundario>
                )}
              </View>
              <Ionicons name="chevron-forward" size={22} color={cores.textoSecundario} />
            </View>
          </Cartao>
        </Pressable>

        <View>
          <Subtitulo style={{ marginBottom: espacamento.sm }}>Acesso rápido</Subtitulo>
          <View style={estilos.grade}>
            {ACESSOS_RAPIDOS.map((item) => (
              <Pressable
                key={item.chave}
                onPress={() => router.push(item.rota)}
                style={estilos.itemGrade}
              >
                <Cartao>
                  <Ionicons name={item.icone} size={26} color={cores.primaria} />
                  <Corpo style={{ marginTop: espacamento.sm }}>{item.titulo}</Corpo>
                </Cartao>
              </Pressable>
            ))}
          </View>
        </View>
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
  saudacao: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento.md,
  },
  itemGrade: {
    width: '47%',
  },
});
