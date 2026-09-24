// Campo de texto padrão — label, erro, e suporte a mostrar/ocultar senha e
// máscara (CPF, telefone, CEP) via a prop `formatar`.

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { alvoToqueMinimo, espacamento } from '../theme/espacamento';
import { Legenda } from './Texto';

export default function CampoTexto({
  rotulo,
  value,
  aoMudar,
  erro,
  formatar, // (texto) => texto formatado, ex. formatarCPF
  senha = false,
  multiline = false,
  estiloContainer,
  ...props
}) {
  const { cores, tipografia } = useTema();
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  function lidarComMudanca(texto) {
    aoMudar?.(formatar ? formatar(texto) : texto);
  }

  return (
    <View style={[estilos.container, estiloContainer]}>
      {rotulo ? (
        <Legenda style={{ marginBottom: espacamento.xs, color: cores.textoSecundario }}>
          {rotulo}
        </Legenda>
      ) : null}
      <View
        style={[
          estilos.campo,
          multiline && estilos.campoMultilinha,
          {
            borderColor: erro ? cores.terracotaEscura : cores.borda,
            backgroundColor: cores.card,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={lidarComMudanca}
          secureTextEntry={senha && !senhaVisivel}
          placeholderTextColor={cores.textoSecundario}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[
            tipografia.corpo,
            estilos.input,
            multiline && estilos.inputMultilinha,
            { color: cores.textoPrincipal },
          ]}
          {...props}
        />
        {senha ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
            hitSlop={8}
            onPress={() => setSenhaVisivel((v) => !v)}
          >
            <Ionicons
              name={senhaVisivel ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={cores.textoSecundario}
            />
          </Pressable>
        ) : null}
      </View>
      {erro ? (
        <Legenda style={{ marginTop: espacamento.xs, color: cores.terracotaEscura }}>
          {erro}
        </Legenda>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    width: '100%',
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: alvoToqueMinimo,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: espacamento.md,
    gap: espacamento.sm,
  },
  campoMultilinha: {
    alignItems: 'flex-start',
    minHeight: 96,
    paddingVertical: espacamento.sm,
  },
  input: {
    flex: 1,
    paddingVertical: espacamento.sm,
  },
  inputMultilinha: {
    minHeight: 80,
    paddingVertical: 0,
  },
});
