// Regras puras das doses (coleção `doses`). Só existe documento quando o
// paciente age (marca "tomada" ou "pulada"); o que ninguém marcou é calculado.

// Depois do horário previsto, a dose ainda pode ser tomada por até 2 h antes de
// contar como perdida.
export const TOLERANCIA_DOSE_MS = 2 * 60 * 60 * 1000;

// `{pacienteId}_{AAAA-MM-DD}_{HHmm}_{produtoId}` — com ID fixo, tocar duas
// vezes em "Marcar como tomada" atualiza o mesmo documento.
export function idDaDose(pacienteId, data, horario, produtoId) {
  return `${pacienteId}_${data}_${String(horario).replace(':', '')}_${produtoId}`;
}

// Date do horário previsto: "AAAA-MM-DD" + "HH:mm", em horário local.
export function momentoPrevisto(data, horario) {
  const [ano, mes, dia] = data.split('-').map(Number);
  const [hora, minuto] = horario.split(':').map(Number);
  return new Date(ano, mes - 1, dia, hora, minuto, 0, 0);
}

// 'tomada' | 'perdida' | 'pendente'
//
//   documento `tomada`                       → tomada
//   documento `pulada`                       → perdida
//   sem documento e horário + 2 h já passou  → perdida
//   sem documento e dentro do prazo          → pendente
export function statusDaDose(registro, data, horario, agora = new Date()) {
  if (registro?.status === 'tomada') return 'tomada';
  if (registro?.status === 'pulada') return 'perdida';
  const limite = momentoPrevisto(data, horario).getTime() + TOLERANCIA_DOSE_MS;
  return agora.getTime() > limite ? 'perdida' : 'pendente';
}
