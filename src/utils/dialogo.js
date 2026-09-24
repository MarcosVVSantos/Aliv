// Aviso e confirmação que funcionam na web. `Alert.alert` do React Native é
// um no-op no navegador, então na web o aviso vira um modal próprio
// (<AvisoGlobal />, montado no layout raiz); no celular continua o Alert
// nativo.

import { Alert, Platform } from 'react-native';

let ouvinte = null;

export function registrarOuvinteDeAviso(funcao) {
  ouvinte = funcao;
  return () => {
    if (ouvinte === funcao) ouvinte = null;
  };
}

// botoes: [{ text, onPress, style? }] — mesmo formato do Alert.alert.
export function avisar(titulo, mensagem, botoes) {
  if (Platform.OS !== 'web' || !ouvinte) {
    Alert.alert(titulo, mensagem, botoes);
    return;
  }
  ouvinte({ titulo, mensagem, botoes: botoes?.length ? botoes : [{ text: 'OK' }] });
}
