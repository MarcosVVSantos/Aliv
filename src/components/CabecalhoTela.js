// Cabeçalho simples com seta de voltar — usado nas telas empilhadas fora
// das tabs (agendar consulta, evolução, perfil/*, etc.). Não usamos o
// header nativo do Stack porque ele foge da tipografia única do app.

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { alvoToqueMinimo, espacamento } from '../theme/espacamento';
import { Subtitulo } from './Texto';

export default function CabecalhoTela({ titulo, aoVoltar, acaoDireita }) {
  const router = useRouter();
  const { cores } = useTema();

  return (
    <View style={estilos.base}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        hitSlop={8}
        onPress={aoVoltar ?? (() => router.back())}
        style={estilos.botaoVoltar}
      >
        <Ionicons name="chevron-back" size={26} color={cores.textoPrincipal} />
      </Pressable>
      <Subtitulo style={estilos.titulo} numberOfLines={1}>
        {titulo}
      </Subtitulo>
      <View style={estilos.acaoDireita}>{acaoDireita}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.sm,
    gap: espacamento.sm,
  },
  botaoVoltar: {
    width: alvoToqueMinimo,
    height: alvoToqueMinimo,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -espacamento.sm,
  },
  titulo: {
    flex: 1,
  },
  acaoDireita: {
    minWidth: alvoToqueMinimo,
    alignItems: 'flex-end',
  },
});
