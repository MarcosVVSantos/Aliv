// Regras puras de prescrição (sem Firestore). Nada aqui é gravado: a situação
// da receita, a frequência em texto e a posologia são sempre calculadas na
// hora de exibir (ver CONTEXTO.md, "Princípios").

import { diasEntre, numeroParaTexto } from './formatadores';

export const DIAS_LIMITE_VENCE_EM_BREVE = 30;

function paraData(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor.toDate === 'function') return valor.toDate();
  return new Date(valor);
}

// 'rascunho' | 'cancelada' | 'vencida' | 'vence_em_breve' | 'ativa'
//
// Ordem de verificação: rascunho → cancelada → validade já passou → validade
// em até 30 dias → ativa. Um `status: 'vencida'` legado (modelo v1) é
// ignorado: quem manda é `data_validade`.
export function situacaoPrescricao(prescricao, hoje = new Date()) {
  if (prescricao.status === 'rascunho') return 'rascunho';
  if (prescricao.status === 'cancelada') return 'cancelada';

  const validade = paraData(prescricao.data_validade);
  if (!validade) return 'ativa';

  const diasRestantes = diasEntre(hoje, validade);
  if (diasRestantes < 0) return 'vencida';
  if (diasRestantes <= DIAS_LIMITE_VENCE_EM_BREVE) return 'vence_em_breve';
  return 'ativa';
}

// Situações em que o paciente ainda toma a medicação prescrita.
export function prescricaoEstaVigente(prescricao, hoje = new Date()) {
  const situacao = situacaoPrescricao(prescricao, hoje);
  return situacao === 'ativa' || situacao === 'vence_em_breve';
}

// ["08:00", "20:00"] → "2× ao dia"
export function textoFrequencia(horarios) {
  const vezes = Array.isArray(horarios) ? horarios.length : 0;
  return vezes > 0 ? `${vezes}× ao dia` : '';
}

// "Manhã" | "Tarde" | "Noite" a partir de "HH:mm".
export function periodoDoHorario(horario) {
  const hora = Number(String(horario).slice(0, 2));
  if (hora < 12) return 'Manhã';
  if (hora < 18) return 'Tarde';
  return 'Noite';
}

// "Manhã 08:00 / Noite 20:00"
export function textoHorarios(horarios) {
  return (horarios ?? []).map((h) => `${periodoDoHorario(h)} ${h}`).join(' / ');
}

// "2 gotas, via sublingual, 2× ao dia" — montado de `dose_inicial`,
// `unidade_dose`, `via_administracao` e `horarios`. Orientações livres
// ("aguardar 60 segundos antes de engolir") ficam em `instrucoes_uso`.
export function textoPosologia(item) {
  const dose = item.dose_inicial != null ? numeroParaTexto(item.dose_inicial) : '';
  const partes = [
    [dose, item.unidade_dose].filter(Boolean).join(' '),
    item.via_administracao ? `via ${String(item.via_administracao).toLowerCase()}` : '',
    textoFrequencia(item.horarios),
  ];
  return partes.filter(Boolean).join(', ');
}

// Horários "HH:mm" em ordem, sem repetição. Devolve null se algum for inválido.
export function normalizarHorarios(horarios) {
  const formato = /^([01]\d|2[0-3]):[0-5]\d$/;
  const lista = Array.isArray(horarios) ? horarios : [];
  if (!lista.every((h) => formato.test(h))) return null;
  return [...new Set(lista)].sort();
}
