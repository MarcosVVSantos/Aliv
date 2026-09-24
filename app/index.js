// Menu principal — uma opção por collection do Firestore, mais o acesso à
// área do paciente. A splash (app/splash.js) vem antes, uma vez por abertura
// do app.

import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import Cartao from '../src/components/Cartao';
import ContainerWeb from '../src/components/ContainerWeb';
import Logo from '../src/components/Logo';
import { Corpo, CorpoSecundario, Legenda, Subtitulo, TituloGrande } from '../src/components/Texto';
import { useTema } from '../src/theme/AcessibilidadeContext';
import { espacamento, raioCard } from '../src/theme/espacamento';
import { estadoApp } from '../src/utils/estadoApp';

const COLECOES_MENU = [
  {
    chave: 'usuarios',
    icone: 'people-outline',
    titulo: 'Usuários',
    descricao: 'Pacientes, profissionais e atendentes',
    rota: '/usuarios',
  },
  {
    chave: 'consultas',
    icone: 'calendar-outline',
    titulo: 'Consultas',
    descricao: 'Agendamentos e evolução clínica',
    rota: '/consultas',
  },
  {
    chave: 'prescricoes',
    icone: 'document-text-outline',
    titulo: 'Prescrições',
    descricao: 'Receitas emitidas e seus itens',
    rota: '/prescricoes',
  },
  {
    chave: 'produtos',
    icone: 'flask-outline',
    titulo: 'Produtos',
    descricao: 'Catálogo de óleos e derivados',
    rota: '/produtos',
  },
  {
    chave: 'registros',
    icone: 'clipboard-outline',
    titulo: 'Registros diários',
    descricao: 'Doses e sintomas informados pelos pacientes',
    rota: '/registros',
  },
];

export default function MenuPrincipal() {
  const router = useRouter();
  const { cores } = useTema();

  if (!estadoApp.splashVista) return <Redirect href="/splash" />;

  return (
    <ContainerWeb>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.cabecalho}>
          <Logo tamanho={72} />
          <TituloGrande style={{ color: cores.primaria, marginTop: espacamento.sm }}>Aliv</TituloGrande>
          <CorpoSecundario style={{ textAlign: 'center' }}>
            Cuidado que acompanha seu tratamento
          </CorpoSecundario>
        </View>

        <View style={{ gap: espacamento.md }}>
          {COLECOES_MENU.map((item) => (
            <Pressable
              key={item.chave}
              accessibilityRole="button"
              accessibilityLabel={item.titulo}
              onPress={() => router.push(item.rota)}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Cartao>
                <View style={estilos.linhaCartao}>
                  <View style={[estilos.icone, { backgroundColor: cores.verdeClaro }]}>
                    <Ionicons name={item.icone} size={30} color={cores.primaria} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Subtitulo>{item.titulo}</Subtitulo>
                    <CorpoSecundario>{item.descricao}</CorpoSecundario>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={cores.textoSecundario} />
                </View>
              </Cartao>
            </Pressable>
          ))}
        </View>

        <View style={estilos.divisor}>
          <View style={[estilos.linha, { backgroundColor: cores.borda }]} />
          <Legenda>aplicativo</Legenda>
          <View style={[estilos.linha, { backgroundColor: cores.borda }]} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Área do paciente"
          onPress={() => router.push('/paciente/inicio')}
          style={({ pressed }) => [
            estilos.areaPaciente,
            { backgroundColor: cores.primaria, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Ionicons name="person-circle-outline" size={40} color={cores.branco} />
          <View style={{ flex: 1 }}>
            <Subtitulo style={{ color: cores.branco }}>Área do paciente</Subtitulo>
            <Corpo style={{ color: cores.verdeClaro }}>Início, tratamento, consultas e diário</Corpo>
          </View>
          <Ionicons name="arrow-forward" size={24} color={cores.branco} />
        </Pressable>
      </ScrollView>
    </ContainerWeb>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: espacamento.lg,
    gap: espacamento.lg,
    paddingBottom: espacamento.xxl,
  },
  cabecalho: {
    alignItems: 'center',
    gap: espacamento.xs,
    paddingTop: espacamento.lg,
  },
  linhaCartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.md,
    minHeight: 64,
  },
  icone: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divisor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
  },
  linha: {
    flex: 1,
    height: 1,
  },
  areaPaciente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.md,
    minHeight: 72,
    padding: espacamento.md,
    borderRadius: raioCard,
  },
});
