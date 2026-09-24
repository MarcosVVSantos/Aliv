// Nome de produto para exibição ao paciente. "Óleo CBD 200mg" é ambíguo (200 mg
// no frasco todo ou por mL?), então o nome sempre traz concentração e volume,
// igual à prescrição: "Óleo CBD 200 mg/mL · 30 mL".

import { numeroParaTexto } from './formatadores';

// Concentração escrita dentro do nome cadastrado ("… 200mg/mL", "… 25mg").
const CONCENTRACAO_NO_NOME = /\s*\b\d+(?:[.,]\d+)?\s*mg(?:\s*\/\s*ml)?/i;

export function nomeExibicaoProduto(nome, teorCbd, volumeMl) {
  const cadastrado = String(nome ?? '').trim();
  if (teorCbd === null || teorCbd === undefined) return cadastrado;

  const base = cadastrado.replace(CONCENTRACAO_NO_NOME, '').trim();
  // Com volume (óleo) a concentração é por mL; sem volume (cápsula) é por unidade.
  const concentracao = `${numeroParaTexto(teorCbd)} ${volumeMl ? 'mg/mL' : 'mg'}`;
  const volume = volumeMl ? ` · ${numeroParaTexto(volumeMl)} mL` : '';
  return `${base} ${concentracao}${volume}`.trim();
}
