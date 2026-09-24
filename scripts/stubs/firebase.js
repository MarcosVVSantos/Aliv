// Substitui src/services/firebase.js nos scripts de teste do modo mock: nada de
// Firebase Auth do React Native nem de rede. Só o crudService o importa, e no
// modo mock ele nunca chega a usar `db`.
export const auth = {};
export const db = {};
