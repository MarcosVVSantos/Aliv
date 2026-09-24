// Dados falsos da collection raiz `registros_diarios` (ver CONTEXTO.md) —
// cada registro aponta para o paciente em `paciente_id`. Gerados a partir de
// "hoje" (nunca com datas fixas) para os últimos 29 dias, com `escala_sintoma`
// caindo aos poucos de 8 para 5 — o gráfico de evolução conta uma história de
// melhora. O dia de hoje começa sem registro salvo (fica pro paciente
// preencher no Diário), então geramos só D-29 até D-1.
//
// `data` é string 'AAAA-MM-DD' e o ID do documento é `{paciente_id}_{data}`.
// As doses tomadas não ficam aqui: vivem na coleção `doses`.
//
// `gerarRegistrosDiariosMock(pacienteId, hoje)` é a fábrica — ver o
// comentário de topo de mocks/usuarios.js: `registrosMock` chama com o
// paciente do modo `USAR_MOCK`, e `scripts/seed-firestore.js` chama com o UID
// do seed.

import { dataLocalISO } from '../../utils/data';
import { UID_PACIENTE_BEATRIZ } from './usuarios';

const HUMORES = ['Mal', 'Neutro', 'Bem', 'Bem', 'Muito bem'];
const SONOS = ['Ruim', 'Regular', 'Regular', 'Boa'];
const EFEITOS_POSSIVEIS = ['Sonolência', 'Boca seca', 'Tontura', 'Náusea', 'Aumento de apetite'];

function nDiasAtras(base, n) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

// Gera de 0 a 2 efeitos colaterais de forma determinística (mesmo índice
// sempre produz o mesmo resultado), pra manter o mock estável entre
// execuções.
function efeitosDoIndice(i) {
  const efeitos = [];
  if (i % 4 === 0) efeitos.push({ descricao: EFEITOS_POSSIVEIS[0] }); // Sonolência
  if (i % 7 === 0) efeitos.push({ descricao: EFEITOS_POSSIVEIS[1] }); // Boca seca
  if (i % 9 === 0) efeitos.push({ descricao: EFEITOS_POSSIVEIS[3] }); // Náusea
  return efeitos;
}

export function gerarRegistrosDiariosMock(pacienteId = UID_PACIENTE_BEATRIZ, hoje = new Date()) {
  const registros = [];

  for (let i = 29; i >= 1; i -= 1) {
    const data = dataLocalISO(nDiasAtras(hoje, i));
    const progresso = (29 - i) / 28; // 0 no dia mais antigo, 1 no dia mais recente
    const escalaSintoma = Math.max(5, Math.round(8 - progresso * 3));
    const efeitos = efeitosDoIndice(i);

    // Os três estados de efeitos adversos: relatou efeitos; marcou "Nenhum"
    // (`sem_efeitos_adversos: true`, lista vazia); ou não preencheu
    // (`false`, lista vazia).
    const semEfeitosAdversos = efeitos.length === 0 && i % 2 === 0;

    registros.push({
      id: `${pacienteId}_${data}`,
      paciente_id: pacienteId,
      paciente_nome: 'Beatriz Santos',
      data,
      escala_sintoma: escalaSintoma,
      observacao: i % 10 === 0 ? 'Dia mais tranquilo, poucos episódios de ansiedade.' : '',
      humor: HUMORES[i % HUMORES.length],
      qualidade_sono: SONOS[i % SONOS.length],
      efeitos_adversos: efeitos,
      sem_efeitos_adversos: semEfeitosAdversos,
    });
  }

  return registros;
}

export const registrosMock = gerarRegistrosDiariosMock();
