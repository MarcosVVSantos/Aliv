// Selo (badge) colorido — status de prescrição, modalidade de consulta,
// autorização Anvisa etc. Nunca deixa o texto quebrar dentro do selo.

import { StyleSheet, Text, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { coresEstado } from '../theme/cores';
import { espacamento } from '../theme/espacamento';

// tom: 'sucesso' | 'atencao' | 'perigo' | 'neutro'
export default function Selo({ texto, tom = 'neutro', icone, estilo }) {
  const { tipografia } = useTema();
  const fundo = coresEstado[`${tom}Fundo`] ?? coresEstado.neutroFundo;
  const cor = coresEstado[tom] ?? coresEstado.neutro;

  return (
    <View style={[estilos.base, { backgroundColor: fundo }, estilo]}>
      {icone}
      <Text style={[tipografia.legenda, { color: cor }]} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.xs,
    paddingHorizontal: espacamento.sm,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
});
