// Liga/desliga o Firestore real. Com `USAR_MOCK = true`, o crudService e o
// authService usam dados falsos em memória (ver src/services/mocks/) e o app
// inteiro funciona sem rede — útil para desenvolver offline ou demonstrar se
// o Wi-Fi da apresentação falhar. Com `false`, tudo grava e lê do Cloud
// Firestore (e o login usa o Firebase Authentication).
//
// O repositório fica com `true` (valor da entrega e da apresentação: "roda sem
// Firebase"). Use `false` só localmente, para testar com o Firestore, e NÃO
// faça commit com `false`.
export const USAR_MOCK = false;

// Atraso artificial nas respostas mockadas, só pra simular latência de rede
// (loading states não ficam instantâneos demais na demo). Em ms.
export const ATRASO_MOCK_MS = 400;

export function aguardar(ms = ATRASO_MOCK_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
