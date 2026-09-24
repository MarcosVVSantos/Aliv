// Regras puras da autorização Anvisa (sem Firestore), mesmo padrão de
// `situacaoPrescricao` em src/utils/prescricao.js — com uma diferença: em vez
// de manter uma lista do que é "decisão manual" (que essa função não tem como
// conhecer por inteiro), ela conhece só o que ELA MESMA calcula
// (SITUACOES_CALCULADAS). Qualquer valor gravado que não esteja nessa lista
// prevalece como está, seja qual for — 'indeferida', 'cancelada', ou uma
// decisão futura que ainda não existe hoje. Um valor vazio, ausente, ou que
// por coincidência seja igual a um dos calculados é ignorado e recalculado a
// partir de `data_validade` (ver CONTEXTO.md, princípio 1).

import { diasEntre } from './formatadores';

export const DIAS_LIMITE_VENCE_EM_BREVE = 30;

// Os únicos valores que esta função sabe calcular.
export const SITUACOES_CALCULADAS = ['vigente', 'vence_em_breve', 'vencida'];

function paraData(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor.toDate === 'function') return valor.toDate(); // Timestamp do Firestore
  return new Date(valor);
}

// Aceita a autorização tanto no formato de documento (snake_case,
// `data_validade`) quanto no formato de tela (camelCase, `dataValidade`).
function validadeDaAutorizacao(autorizacao) {
  return paraData(autorizacao?.data_validade ?? autorizacao?.dataValidade);
}

// Um valor manual: gravado e fora do que esta função calcula.
function situacaoManual(autorizacao) {
  const valor = autorizacao?.situacao;
  return valor && !SITUACOES_CALCULADAS.includes(valor) ? valor : null;
}

// Qualquer valor manual gravado (ex.: 'indeferida', 'cancelada') |
// 'vencida' | 'vence_em_breve' | 'vigente' | 'sem_validade' (sem
// `data_validade` e sem valor manual).
export function situacaoAutorizacao(autorizacao, hoje = new Date()) {
  const manual = situacaoManual(autorizacao);
  if (manual) return manual;

  const validade = validadeDaAutorizacao(autorizacao);
  if (!validade) return 'sem_validade';

  const diasRestantes = diasEntre(hoje, validade);
  if (diasRestantes < 0) return 'vencida';
  if (diasRestantes <= DIAS_LIMITE_VENCE_EM_BREVE) return 'vence_em_breve';
  return 'vigente';
}
