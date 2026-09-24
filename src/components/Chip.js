// Chip de seleção — mínimo 48dp de altura (ver CONTEXTO.md, seção 7.8).

import { Pressable, StyleSheet, Text } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { alvoToqueMinimo, espacamento } from '../theme/espacamento';

export default function Chip({ texto, selecionado, onPress }) {
  const { cores, tipografia } = useTema();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: selecionado }}
      onPress={onPress}
      style={[
        estilos.base,
        {
          backgroundColor: selecionado ? cores.primaria : cores.card,
          borderColor: selecionado ? cores.primaria : cores.borda,
        },
      ]}
    >
      <Text
        style={[
          tipografia.corpoMedio,
          { color: selecionado ? cores.branco : cores.textoPrincipal },
        ]}
      >
        {texto}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: alvoToqueMinimo,
    paddingHorizontal: espacamento.md,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
