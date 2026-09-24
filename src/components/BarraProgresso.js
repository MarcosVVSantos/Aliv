// Barra de progresso do fluxo de cadastro — "Passo X de 4 · <nome do
// passo>" (ver CONTEXTO.md, seção 7.3).

import { StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { espacamento } from '../theme/espacamento';
import { Legenda } from './Texto';

export default function BarraProgresso({ passoAtual, totalPassos, nomePasso }) {
  const { cores } = useTema();

  return (
    <View style={{ gap: espacamento.sm }}>
      <View style={[estilos.trilha, { backgroundColor: cores.verdeClaro }]}>
        <View
          style={[
            estilos.preenchido,
            {
              backgroundColor: cores.primaria,
              width: `${(passoAtual / totalPassos) * 100}%`,
            },
          ]}
        />
      </View>
      <Legenda>
        Passo {passoAtual} de {totalPassos} · {nomePasso}
      </Legenda>
    </View>
  );
}

const estilos = StyleSheet.create({
  trilha: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  preenchido: {
    height: '100%',
    borderRadius: 999,
  },
});
