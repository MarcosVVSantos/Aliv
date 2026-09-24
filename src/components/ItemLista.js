import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { alvoToqueMinimo, espacamento } from '../theme/espacamento';
import { Corpo } from './Texto';

export default function ItemLista({ icone, titulo, onPress, cor, semSeta = false }) {
  const { cores } = useTema();
  const corTexto = cor ?? cores.textoPrincipal;

  return (
    <Pressable onPress={onPress} style={estilos.base} accessibilityRole="button">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacamento.sm, flex: 1 }}>
        {icone ? <Ionicons name={icone} size={22} color={corTexto} /> : null}
        <Corpo style={{ color: corTexto }}>{titulo}</Corpo>
      </View>
      {semSeta ? null : <Ionicons name="chevron-forward" size={20} color={cores.textoSecundario} />}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: alvoToqueMinimo,
    paddingVertical: espacamento.sm,
  },
});
