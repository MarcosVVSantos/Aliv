// Switch (chave liga/desliga) — usado no toggle de responsável legal e nas
// duas chaves de acessibilidade do Perfil.

import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { alvoToqueMinimo, espacamento } from '../theme/espacamento';
import { useTema } from '../theme/AcessibilidadeContext';
import { Corpo, CorpoSecundario } from './Texto';

export default function Interruptor({ rotulo, descricao, valor, aoMudar }) {
  const { cores } = useTema();

  return (
    <Pressable
      onPress={() => aoMudar(!valor)}
      accessibilityRole="switch"
      accessibilityState={{ checked: valor }}
      style={estilos.base}
    >
      <View style={{ flex: 1, paddingRight: espacamento.sm }}>
        <Corpo>{rotulo}</Corpo>
        {descricao ? <CorpoSecundario>{descricao}</CorpoSecundario> : null}
      </View>
      <Switch
        value={valor}
        onValueChange={aoMudar}
        trackColor={{ false: cores.borda, true: cores.primaria }}
        thumbColor={cores.branco}
      />
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
