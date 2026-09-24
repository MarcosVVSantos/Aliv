// Rótulos do card de adesão ("Últimos 7 dias"). Vêm da data real de cada dia,
// nunca de uma lista fixa; o último dia é sempre hoje e aparece como "hoje".

import { dataDeChave } from './data';

const INICIAIS_DIA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// `dias`: [{ data: 'AAAA-MM-DD', ... }] do mais antigo para hoje.
// → ['T', 'Q', 'Q', 'S', 'S', 'D', 'hoje']
export function rotulosDaAdesao(dias) {
  return dias.map((dia, indice) =>
    indice === dias.length - 1 ? 'hoje' : INICIAIS_DIA[dataDeChave(dia.data).getDay()]
  );
}
