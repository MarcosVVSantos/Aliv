// Avatar de iniciais — a cor de uma pessoa é sempre a mesma em qualquer
// tela, derivada de hash do nome (ver CONTEXTO.md, seção 7.6, ⚠️).

import { StyleSheet, Text, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { corDoAvatar, iniciaisDoNome } from '../utils/avatar';

export default function Avatar({ nome, tamanho = 48 }) {
  const { cores } = useTema();
  const cor = corDoAvatar(nome);

  return (
    <View
      style={[
        estilos.base,
        {
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
          backgroundColor: cor,
        },
      ]}
    >
      <Text
        style={{
          color: cores.branco,
          fontSize: tamanho * 0.38,
          fontFamily: 'PlusJakartaSans_700Bold',
        }}
      >
        {iniciaisDoNome(nome)}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
