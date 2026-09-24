import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';

export default function TelaCarregando() {
  const { cores } = useTema();
  return (
    <View style={[estilos.base, { backgroundColor: cores.fundo }]}>
      <ActivityIndicator size="large" color={cores.primaria} />
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
