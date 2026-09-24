// Estado vazio — ilustração simples (ícone grande), texto e botão de ação
// (ver CONTEXTO.md, seção 7.6).

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { espacamento } from '../theme/espacamento';
import Botao from './Botao';
import { Corpo, Subtitulo } from './Texto';

export default function EstadoVazio({ icone = 'calendar-outline', titulo, texto, tituloBotao, aoPressionarBotao }) {
  const { cores } = useTema();

  return (
    <View style={estilos.base}>
      <View style={[estilos.circulo, { backgroundColor: cores.verdeClaro }]}>
        <Ionicons name={icone} size={40} color={cores.primaria} />
      </View>
      <Subtitulo style={{ textAlign: 'center', marginTop: espacamento.md }}>{titulo}</Subtitulo>
      {texto ? (
        <Corpo
          style={{
            textAlign: 'center',
            color: cores.textoSecundario,
            marginTop: espacamento.xs,
          }}
        >
          {texto}
        </Corpo>
      ) : null}
      {tituloBotao ? (
        <Botao
          titulo={tituloBotao}
          onPress={aoPressionarBotao}
          tamanhoCompleto={false}
          estilo={{ marginTop: espacamento.lg }}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    alignItems: 'center',
    paddingVertical: espacamento.xxl,
    paddingHorizontal: espacamento.lg,
  },
  circulo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
