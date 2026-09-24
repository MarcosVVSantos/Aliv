// Janela centralizada sobre um fundo escurecido. Base do modal de
// confirmação, do seletor e do aviso global. Usa o <Modal> do React Native,
// que também funciona no react-native-web (ao contrário de Alert.alert).

import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { espacamento, raioCard } from '../theme/espacamento';

export default function Sobreposicao({ visivel, aoFechar, children, larguraMaxima = 480 }) {
  const { cores } = useTema();

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <View style={estilos.fundo}>
        <Pressable
          accessibilityLabel="Fechar"
          style={StyleSheet.absoluteFill}
          onPress={aoFechar}
        />
        <View
          style={[
            estilos.janela,
            { backgroundColor: cores.card, maxWidth: larguraMaxima },
          ]}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacamento.md,
  },
  janela: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: raioCard,
    padding: espacamento.lg,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
