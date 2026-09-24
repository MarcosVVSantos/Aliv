// Bloco com título que expande/recolhe — usado nos blocos opcionais dos
// formulários (evolução da consulta, responsável legal).

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { alvoToqueMinimo, espacamento, raioCard } from '../theme/espacamento';
import { Subtitulo } from './Texto';

export default function SecaoRecolhivel({ titulo, abertaInicialmente = false, children }) {
  const { cores } = useTema();
  const [aberta, setAberta] = useState(abertaInicialmente);

  return (
    <View style={[estilos.base, { borderColor: cores.borda, backgroundColor: cores.card }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: aberta }}
        onPress={() => setAberta((v) => !v)}
        style={estilos.cabecalho}
      >
        <Subtitulo style={{ flex: 1 }}>{titulo}</Subtitulo>
        <Ionicons name={aberta ? 'chevron-up' : 'chevron-down'} size={22} color={cores.textoSecundario} />
      </Pressable>
      {aberta ? <View style={estilos.conteudo}>{children}</View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: raioCard,
    overflow: 'hidden',
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: alvoToqueMinimo,
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.sm,
  },
  conteudo: {
    padding: espacamento.md,
    paddingTop: 0,
    gap: espacamento.md,
  },
});
