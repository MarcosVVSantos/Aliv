// Dados falsos da coleção `consultas` (ver CONTEXTO.md). `paciente_nome` /
// `profissional_nome` são cópias de propósito (evitam 1 leitura extra por
// usuário na agenda).
//
// `criarConsultasMock(ids, hoje)` é a fábrica — ver o comentário de topo de
// mocks/usuarios.js. Nenhuma data literal 2025/2026 aqui (princípio 4): a
// história é toda relativa a `hoje`, e a ordem cronológica é sempre a mesma:
//
//   cadastro da paciente < primeira consulta < início do tratamento
//   < ajuste de dose < emissão da receita atual (ver mocks/prescricoes.js)
//   < consultas de acompanhamento < consulta futura (hoje + 3 dias)

import { DIAS_CADASTRO_PACIENTE, IDS_USUARIOS_MOCK } from './usuarios';
import { comHora, diasAtras } from './relativo';

// IDs sem data embutida (para não colidir com o grep de "nenhuma data
// literal" do CONTEXTO.md, e para não descasar do dia real do mock).
export const ID_CONSULTA_PRIMEIRA = 'consulta-primeira';
export const ID_CONSULTA_INICIO_TRATAMENTO = 'consulta-inicio-tratamento';
export const ID_CONSULTA_AJUSTE_DOSE = 'consulta-ajuste-dose';
export const ID_CONSULTA_PROXIMA = 'consulta-proxima';

// Dias atrás de cada consulta concluída, todos menores que
// `DIAS_CADASTRO_PACIENTE` — garante `cadastro < primeira consulta` sempre.
const DIAS_PRIMEIRA_CONSULTA = DIAS_CADASTRO_PACIENTE - 10; // 410
const DIAS_INICIO_TRATAMENTO = DIAS_CADASTRO_PACIENTE - 25; // 395
const DIAS_AJUSTE_DOSE = DIAS_CADASTRO_PACIENTE - 70; // 350
const DIAS_ACOMPANHAMENTO_PSIQUIATRICO = 60;
const DIAS_AVALIACAO_GERAL_RECENTE = 20;

// Próxima consulta: sempre "hoje + 3 dias, 14:30" (nunca fixa no calendário,
// senão descasa do dia real conforme o app é aberto).
export function proximaConsulta14h30(hoje = new Date()) {
  const data = diasAtras(-3, hoje);
  return comHora(data, 14, 30);
}

export function criarConsultasMock(ids, hoje = new Date()) {
  return [
    {
      id: ID_CONSULTA_PRIMEIRA,
      paciente_id: ids.paciente,
      paciente_nome: 'Beatriz Santos',
      profissional_id: ids.profissionalRafael,
      profissional_nome: 'Dr. Rafael Andrade',
      data_hora: comHora(diasAtras(DIAS_PRIMEIRA_CONSULTA, hoje), 9, 0),
      modalidade: 'presencial',
      status: 'realizada',
      eh_retorno: false,
      evolucao: {
        queixa_principal: 'Dor crônica e crises de ansiedade recorrentes',
        cid: 'Z00.0',
        alternativas_terapeuticas_previas:
          'Uso prévio de ansiolíticos e analgésicos convencionais, sem resposta satisfatória',
        conduta: 'Avaliação clínica geral; encaminhada para neurologia para investigar tratamento com cannabis medicinal',
        data_registro: comHora(diasAtras(DIAS_PRIMEIRA_CONSULTA, hoje), 9, 35),
      },
    },
    {
      id: ID_CONSULTA_INICIO_TRATAMENTO,
      paciente_id: ids.paciente,
      paciente_nome: 'Beatriz Santos',
      profissional_id: ids.profissionalCamila,
      profissional_nome: 'Dra. Camila Rocha',
      data_hora: comHora(diasAtras(DIAS_INICIO_TRATAMENTO, hoje), 9, 0),
      modalidade: 'presencial',
      status: 'realizada',
      eh_retorno: false,
      evolucao: {
        queixa_principal: 'Dor crônica e crises de ansiedade recorrentes',
        cid: 'F41.1',
        alternativas_terapeuticas_previas:
          'Uso prévio de ansiolíticos e analgésicos convencionais, sem resposta satisfatória',
        conduta: 'Consulta inicial — avaliação para início de tratamento com cannabis medicinal',
        data_registro: comHora(diasAtras(DIAS_INICIO_TRATAMENTO, hoje), 9, 45),
      },
    },
    {
      id: 'consulta-avaliacao-psiquiatrica-inicial',
      paciente_id: ids.paciente,
      paciente_nome: 'Beatriz Santos',
      profissional_id: ids.profissionalJulia,
      profissional_nome: 'Dra. Julia Meireles',
      data_hora: comHora(diasAtras(DIAS_INICIO_TRATAMENTO - 25, hoje), 15, 30), // 370
      modalidade: 'teleconsulta',
      status: 'realizada',
      eh_retorno: false,
      evolucao: {
        queixa_principal: 'Ansiedade generalizada, dificuldade para dormir',
        cid: 'F41.1',
        alternativas_terapeuticas_previas: 'Terapia cognitivo-comportamental em andamento',
        conduta: 'Avaliação psiquiátrica inicial, acompanhamento do uso de CBD para ansiedade',
        data_registro: comHora(diasAtras(DIAS_INICIO_TRATAMENTO - 25, hoje), 15, 55),
      },
    },
    {
      id: ID_CONSULTA_AJUSTE_DOSE,
      paciente_id: ids.paciente,
      paciente_nome: 'Beatriz Santos',
      profissional_id: ids.profissionalCamila,
      profissional_nome: 'Dra. Camila Rocha',
      data_hora: comHora(diasAtras(DIAS_AJUSTE_DOSE, hoje), 15, 0),
      modalidade: 'teleconsulta',
      status: 'realizada',
      eh_retorno: true,
      evolucao: {
        queixa_principal: 'Retorno para ajuste de dose',
        cid: 'F41.1',
        alternativas_terapeuticas_previas: 'Mantido tratamento com óleo de CBD',
        conduta: 'Ajuste de dose de óleo CBD 200mg/mL para 2 gotas, 2x ao dia',
        data_registro: comHora(diasAtras(DIAS_AJUSTE_DOSE, hoje), 15, 30),
      },
    },
    {
      id: 'consulta-acompanhamento-psiquiatrico',
      paciente_id: ids.paciente,
      paciente_nome: 'Beatriz Santos',
      profissional_id: ids.profissionalJulia,
      profissional_nome: 'Dra. Julia Meireles',
      data_hora: comHora(diasAtras(DIAS_ACOMPANHAMENTO_PSIQUIATRICO, hoje), 10, 0),
      modalidade: 'teleconsulta',
      status: 'realizada',
      eh_retorno: true,
      evolucao: {
        queixa_principal: 'Retorno psiquiátrico de acompanhamento',
        cid: 'F41.1',
        alternativas_terapeuticas_previas:
          'Terapia cognitivo-comportamental e ansiolíticos convencionais previamente sem resposta satisfatória',
        conduta: 'Boa resposta ao tratamento com CBD; mantida a prescrição atual, sem alterações',
        data_registro: comHora(diasAtras(DIAS_ACOMPANHAMENTO_PSIQUIATRICO, hoje), 10, 40),
      },
    },
    {
      id: 'consulta-avaliacao-geral-recente',
      paciente_id: ids.paciente,
      paciente_nome: 'Beatriz Santos',
      profissional_id: ids.profissionalRafael,
      profissional_nome: 'Dr. Rafael Andrade',
      data_hora: comHora(diasAtras(DIAS_AVALIACAO_GERAL_RECENTE, hoje), 10, 15),
      modalidade: 'presencial',
      status: 'realizada',
      eh_retorno: true,
      evolucao: {
        queixa_principal: 'Avaliação clínica geral e exames de rotina',
        cid: 'Z00.0',
        alternativas_terapeuticas_previas: 'Nenhuma alteração relevante nos exames',
        conduta: 'Exames dentro da normalidade, mantido acompanhamento com neurologia e psiquiatria',
        data_registro: comHora(diasAtras(DIAS_AVALIACAO_GERAL_RECENTE, hoje), 11, 0),
      },
    },
    {
      id: ID_CONSULTA_PROXIMA,
      paciente_id: ids.paciente,
      paciente_nome: 'Beatriz Santos',
      profissional_id: ids.profissionalCamila,
      profissional_nome: 'Dra. Camila Rocha',
      data_hora: proximaConsulta14h30(hoje),
      modalidade: 'teleconsulta',
      status: 'agendada',
      eh_retorno: true,
      evolucao: null,
    },
  ];
}

export const consultasMock = criarConsultasMock(IDS_USUARIOS_MOCK);
