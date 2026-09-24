// Controle segmentado — usado em Consultas (Próximas|Histórico), filtros de
// histórico, Evolução (7|30|90 dias) e no passo "sexo" do cadastro.

import { Pressable, StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { alvoToqueMinimo, espacamento } from '../theme/espacamento';
import { Legenda } from './Texto';

export default function SeletorSegmentado({ opcoes, valor, aoMudar }) {
  const { cores, tipografia } = useTema();

  return (
    <View style={[estilos.base, { backgroundColor: cores.verdeClaro }]}>
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === valor;
        return (
          <Pressable
            key={opcao.valor}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
            onPress={() => aoMudar(opcao.valor)}
            style={[estilos.item, ativo && { backgroundColor: cores.card }]}
          >
            <Legenda
              style={[
                tipografia.corpoMedio,
                { color: ativo ? cores.primaria : cores.textoSecundario, textAlign: 'center' },
              ]}
              numberOfLines={1}
            >
              {opcao.rotulo}
            </Legenda>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  item: {
    flex: 1,
    minHeight: alvoToqueMinimo,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacamento.xs,
  },
});
