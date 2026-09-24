import { StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { espacamento, raioCard } from '../theme/espacamento';

export default function Cartao({ children, estilo, semPadding = false }) {
  const { cores, altoContraste } = useTema();

  return (
    <View
      style={[
        estilos.base,
        {
          backgroundColor: cores.card,
          borderColor: altoContraste ? cores.borda : 'transparent',
          borderWidth: altoContraste ? 1.5 : 0,
          padding: semPadding ? 0 : espacamento.md,
        },
        estilo,
      ]}
    >
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    borderRadius: raioCard,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
