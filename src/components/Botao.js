// Botão padrão do app — mesma família tipográfica de tudo, alvo de toque
// nunca abaixo de 48dp (ver CONTEXTO.md, seção 5).

import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { alvoToqueMinimo, espacamento, raioCard } from '../theme/espacamento';

export default function Botao({
  titulo,
  onPress,
  variante = 'primario', // 'primario' | 'secundario' | 'texto' | 'perigo' | 'destrutivo'
  desabilitado = false,
  carregando = false,
  icone,
  estilo,
  tamanhoCompleto = true,
}) {
  const { cores, tipografia } = useTema();

  const paletas = {
    primario: {
      fundo: cores.primaria,
      texto: cores.branco,
      borda: cores.primaria,
    },
    secundario: {
      fundo: 'transparent',
      texto: cores.primaria,
      borda: cores.primaria,
    },
    texto: {
      fundo: 'transparent',
      texto: cores.primaria,
      borda: 'transparent',
    },
    perigo: {
      fundo: 'transparent',
      texto: cores.terracotaEscura,
      borda: 'transparent',
    },
    // Ação destrutiva de fato (confirmar exclusão): preenchido, ao contrário
    // do `perigo`, que é só texto colorido.
    destrutivo: {
      fundo: cores.terracotaEscura,
      texto: cores.branco,
      borda: cores.terracotaEscura,
    },
  };

  const paleta = paletas[variante] ?? paletas.primario;
  const inativo = desabilitado || carregando;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo }}
      onPress={inativo ? undefined : onPress}
      style={({ pressed }) => [
        estilos.base,
        {
          backgroundColor: paleta.fundo,
          borderColor: paleta.borda,
          borderWidth: variante === 'secundario' ? 1.5 : 0,
          opacity: inativo ? 0.5 : pressed ? 0.85 : 1,
          width: tamanhoCompleto ? '100%' : undefined,
          paddingHorizontal: tamanhoCompleto ? espacamento.md : espacamento.lg,
        },
        estilo,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={paleta.texto} />
      ) : (
        <View style={estilos.conteudo}>
          {icone ? <Ionicons name={icone} size={20} color={paleta.texto} /> : null}
          <Text style={[tipografia.botao, { color: paleta.texto }]}>{titulo}</Text>
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: alvoToqueMinimo,
    borderRadius: raioCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
  },
});
