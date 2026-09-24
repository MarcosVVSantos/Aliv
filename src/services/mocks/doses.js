// Dados falsos da coleção raiz `doses` (ver CONTEXTO.md).
//
// Só existe documento quando o paciente agiu. Os últimos 6 dias (D-6 a D-1)
// mostram todos os estados possíveis, sempre relativos a `hoje`:
//
//   tomada          → documento com status 'tomada'
//   pulada          → documento com status 'pulada' (aparece como perdida)
//   sem registro    → nenhum documento; passou do horário, então aparece perdida
//
// Hoje começa sem nenhuma dose marcada (fica pro paciente marcar na demo).
//
// `gerarDosesMock(pacienteId, hoje)` é a fábrica — ver o comentário de topo de
// mocks/usuarios.js: `dosesMock` chama com o paciente do modo `USAR_MOCK`, e
// `scripts/seed-firestore.js` chama com o UID do seed.

import { idDaDose } from '../../utils/dose';
import { dataLocalISO } from '../../utils/data';
import { ID_PRESCRICAO_MOCK } from './prescricoes';
import { PRODUTO_OLEO_CBD_200 } from './produtos';
import { UID_PACIENTE_BEATRIZ } from './usuarios';

const HORARIOS = ['08:00', '20:00'];

// Por dia (D-6 … D-1), o que aconteceu em cada horário. `null` = sem registro.
const HISTORICO = [
  ['tomada', 'tomada'], // D-6
  ['tomada', 'tomada'], // D-5
  ['tomada', 'pulada'], // D-4
  ['tomada', 'tomada'], // D-3
  ['tomada', null], //     D-2
  ['tomada', 'tomada'], // D-1
];

export function gerarDosesMock(pacienteId = UID_PACIENTE_BEATRIZ, hoje = new Date()) {
  const doses = [];

  HISTORICO.forEach((situacaoDoDia, indice) => {
    const diasAtras = HISTORICO.length - indice;
    const dia = new Date(hoje);
    dia.setDate(hoje.getDate() - diasAtras);
    const data = dataLocalISO(dia);

    situacaoDoDia.forEach((status, i) => {
      if (!status) return;
      const horario = HORARIOS[i];
      const [hora, minuto] = horario.split(':').map(Number);
      const registradoEm = new Date(dia);
      registradoEm.setHours(hora, minuto + 5, 0, 0);

      doses.push({
        id: idDaDose(pacienteId, data, horario, PRODUTO_OLEO_CBD_200.id),
        paciente_id: pacienteId,
        prescricao_id: ID_PRESCRICAO_MOCK,
        produto_id: PRODUTO_OLEO_CBD_200.id,
        data,
        horario_previsto: horario,
        quantidade: 2,
        unidade: 'gotas',
        status,
        registrado_em: registradoEm,
      });
    });
  });

  return doses;
}

export const dosesMock = gerarDosesMock();
