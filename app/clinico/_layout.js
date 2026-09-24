// Área do profissional — layout bem mais denso que o do paciente (ver
// CONTEXTO.md, seção 3 e 7.11 a 7.13). Cabeçalho fixo "Aliv Clínico" com o
// profissional logado, e um Stack por baixo para agenda / ficha / prescrição.

import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import Avatar from '../../src/components/Avatar';
import Logo from '../../src/components/Logo';
import { CorpoSecundario, Subtitulo } from '../../src/components/Texto';
import useSessao from '../../src/hooks/useSessao';
import { useTema } from '../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../src/theme/espacamento';

export default function LayoutClinico() {
  const { cores } = useTema();
  const { sessao } = useSessao();

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <View style={[estilos.cabecalho, { borderBottomColor: cores.borda, backgroundColor: cores.card }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacamento.sm }}>
          <Logo tamanho={32} />
          <Subtitulo>Aliv Clínico</Subtitulo>
        </View>
        {sessao ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacamento.sm }}>
            <View style={{ alignItems: 'flex-end' }}>
              <CorpoSecundario numberOfLines={1}>{sessao.nome}</CorpoSecundario>
            </View>
            <Avatar nome={sessao.nome} tamanho={36} />
          </View>
        ) : null}
      </View>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="agenda" />
        <Stack.Screen name="paciente/[id]" />
        <Stack.Screen name="prescricao/nova" />
      </Stack>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacamento.lg,
    paddingVertical: espacamento.sm,
    borderBottomWidth: 1,
  },
});
