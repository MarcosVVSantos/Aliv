// Checkbox — "Li e aceito" do termo de consentimento.

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { alvoToqueMinimo, espacamento } from '../theme/espacamento';
import { useTema } from '../theme/AcessibilidadeContext';
import { Corpo } from './Texto';

export default function CaixaSelecao({ rotulo, marcado, aoMudar }) {
  const { cores } = useTema();

  return (
    <Pressable
      onPress={() => aoMudar(!marcado)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcado }}
      style={estilos.base}
    >
      <View
        style={[
          estilos.caixa,
          {
            backgroundColor: marcado ? cores.primaria : 'transparent',
            borderColor: marcado ? cores.primaria : cores.borda,
          },
        ]}
      >
        {marcado ? <Ionicons name="checkmark" size={18} color={cores.branco} /> : null}
      </View>
      <Corpo style={{ flex: 1 }}>{rotulo}</Corpo>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: alvoToqueMinimo,
    gap: espacamento.sm,
  },
  caixa: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
