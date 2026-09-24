// Substitui src/services/config.js nos scripts de teste do modo mock: força
// `USAR_MOCK = true` (independente do valor do repositório) e tira a latência
// artificial.
export const USAR_MOCK = true;
export const ATRASO_MOCK_MS = 0;

export function aguardar() {
  return Promise.resolve();
}
