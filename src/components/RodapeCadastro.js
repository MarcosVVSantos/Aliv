// Rodapé fixo com Voltar/Avançar do fluxo de cadastro (ver CONTEXTO.md,
// seção 7.3). Vive em src/components (não em app/) pelo mesmo motivo do
// src/hooks/useCadastro.js — arquivos dentro de app/ viram rota.

import { StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { espacamento } from '../theme/espacamento';
import Botao from './Botao';

export default function RodapeCadastro({
  aoVoltar,
  aoAvancar,
  tituloAvancar = 'Avançar',
  avancarDesabilitado = false,
  avancando = false,
  mostrarVoltar = true,
}) {
  const { cores } = useTema();

  return (
    <View style={[estilos.base, { borderTopColor: cores.borda, backgroundColor: cores.fundo }]}>
      {mostrarVoltar ? (
        <Botao titulo="Voltar" variante="secundario" onPress={aoVoltar} tamanhoCompleto={false} />
      ) : (
        <View />
      )}
      <Botao
        titulo={tituloAvancar}
        onPress={aoAvancar}
        desabilitado={avancarDesabilitado}
        carregando={avancando}
        tamanhoCompleto={false}
        estilo={{ minWidth: 160 }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: espacamento.lg,
    borderTopWidth: 1,
  },
});
