// Dados falsos da coleção `usuarios` (ver CONTEXTO.md). Formato Firestore
// (snake_case, campos Timestamp como Date) — a conversão para o formato de
// tela (camelCase) é feita em authService.js / usuarioService.js, nunca aqui.
//
// `criarUsuariosMock(ids, hoje)` é a fábrica: recebe o ID de cada usuário e
// devolve os documentos, com todas as datas relativas a `hoje` (nenhuma data
// literal 2025/2026 — ver CONTEXTO.md, princípio 4). `usuariosMock` abaixo é
// a fábrica chamada com os IDs fixos do modo `USAR_MOCK = true`;
// `scripts/seed-firestore.js` chama a mesma fábrica com os UIDs reais do
// Firebase Authentication (ver scripts/seed-uids.json e o README).

import { comHora, diasAtras } from './relativo';

export const UID_PACIENTE_BEATRIZ = 'paciente-beatriz';
export const UID_PROF_CAMILA = 'prof-camila-rocha';
export const UID_PROF_RAFAEL = 'prof-rafael-andrade';
export const UID_PROF_JULIA = 'prof-julia-meireles';
export const UID_ATENDENTE_DEMO = 'atendente-larissa-souza';

export const IDS_USUARIOS_MOCK = {
  paciente: UID_PACIENTE_BEATRIZ,
  profissionalCamila: UID_PROF_CAMILA,
  profissionalRafael: UID_PROF_RAFAEL,
  profissionalJulia: UID_PROF_JULIA,
  atendente: UID_ATENDENTE_DEMO,
};

// Cadastro da equipe (bem antes da paciente: já trabalhavam na clínica) e da
// paciente (antes da primeira consulta — ver DIAS_CADASTRO_PACIENTE em
// mocks/consultas.js, que usa este valor para manter a ordem cronológica).
const DIAS_CADASTRO_EQUIPE = 450;
export const DIAS_CADASTRO_PACIENTE = 420;

export function criarUsuariosMock(ids, hoje = new Date()) {
  const cadastroEquipe = comHora(diasAtras(DIAS_CADASTRO_EQUIPE, hoje), 9, 0);
  const cadastroPaciente = comHora(diasAtras(DIAS_CADASTRO_PACIENTE, hoje), 12, 0);

  const pacienteBeatriz = {
    id: ids.paciente,
    email: 'beatriz.santos@exemplo.com',
    telefone: '11987654321',
    tipo: 'paciente',
    data_cadastro: cadastroPaciente,
    ativo: true,
    paciente: {
      cpf: '12345678900',
      nome_completo: 'Beatriz Santos',
      // Data de nascimento: fato fixo (não é uma data "de demonstração" que
      // precise acompanhar `hoje`) — a única data literal deste arquivo. A
      // idade é sempre calculada na exibição (ver princípio 1).
      data_nascimento: new Date(1985, 7, 14),
      sexo: 'Feminino',
      endereco: {
        logradouro: 'Rua das Acácias',
        numero: '245',
        complemento: 'Apto 62',
        bairro: 'Jardim das Flores',
        cidade: 'São Paulo',
        uf: 'SP',
        cep: '04567000',
      },
      responsavel_legal: null, // paciente adulta, sem responsável
      termos_consentimento: [
        {
          versao: '1.0',
          data_assinatura: comHora(cadastroPaciente, 12, 10),
          hash_assinatura: 'a3f9c1e7d2b84f0198e6c3a5d7f21b44',
        },
      ],
      // `situacao` não é gravada: quando é 'vigente' | 'vence_em_breve' |
      // 'vencida' ela é sempre calculada por `situacaoAutorizacao`
      // (src/utils/anvisa.js) a partir de `data_validade` (princípio 1). Só
      // fica gravada quando é uma decisão manual (ex.: 'indeferida').
      autorizacoes_anvisa: [
        {
          numero: 'ANVISA/SP-081234',
          data_emissao: diasAtras(420, hoje),
          data_validade: diasAtras(55, hoje), // venceu há 55 dias
        },
        {
          numero: 'ANVISA/SP-045789',
          // Renovada 2 dias depois de a anterior vencer.
          data_emissao: diasAtras(53, hoje),
          data_validade: diasAtras(53 - 365, hoje), // vence daqui a ~312 dias
        },
      ],
    },
  };

  const profissionalCamila = {
    id: ids.profissionalCamila,
    email: 'camila.rocha@alivclinica.com.br',
    telefone: '11991234567',
    tipo: 'profissional',
    data_cadastro: cadastroEquipe,
    ativo: true,
    profissional: {
      nome_completo: 'Dra. Camila Rocha',
      conselho: 'CRM',
      num_registro: '123456',
      uf_registro: 'SP',
      especialidade: 'Neurologia',
      // Não faz parte da tabela do modelo, mas `listarProfissionais` exige
      // `modalidade` no retorno — guardamos aqui a modalidade padrão de
      // atendimento de cada profissional.
      modalidade_padrao: 'teleconsulta',
    },
  };

  const profissionalRafael = {
    id: ids.profissionalRafael,
    email: 'rafael.andrade@alivclinica.com.br',
    telefone: '11991234568',
    tipo: 'profissional',
    data_cadastro: cadastroEquipe,
    ativo: true,
    profissional: {
      nome_completo: 'Dr. Rafael Andrade',
      conselho: 'CRM',
      num_registro: '145789',
      uf_registro: 'SP',
      especialidade: 'Clínico geral',
      modalidade_padrao: 'presencial',
    },
  };

  const profissionalJulia = {
    id: ids.profissionalJulia,
    email: 'julia.meireles@alivclinica.com.br',
    telefone: '11991234569',
    tipo: 'profissional',
    data_cadastro: cadastroEquipe,
    ativo: true,
    profissional: {
      nome_completo: 'Dra. Julia Meireles',
      conselho: 'CRM',
      num_registro: '167234',
      uf_registro: 'SP',
      especialidade: 'Psiquiatria',
      modalidade_padrao: 'teleconsulta',
    },
  };

  const atendenteDemo = {
    id: ids.atendente,
    email: 'larissa.souza@alivclinica.com.br',
    telefone: '11991234570',
    tipo: 'atendente',
    data_cadastro: cadastroEquipe,
    ativo: true,
    atendente: {
      nome_completo: 'Larissa Souza',
      cargo: 'Recepção',
    },
  };

  return [pacienteBeatriz, profissionalCamila, profissionalRafael, profissionalJulia, atendenteDemo];
}

export const usuariosMock = criarUsuariosMock(IDS_USUARIOS_MOCK);

// Login mockado por e-mail. Nenhuma senha fica no repositório: os e-mails
// abaixo entram no modo demonstração com qualquer senha (mínimo 1 caractere).
// Contas criadas pelo cadastro guardam a senha só em memória, durante a
// execução (ver authService.cadastrarPaciente).
export const credenciaisMock = {
  'beatriz.santos@exemplo.com': { uid: IDS_USUARIOS_MOCK.paciente },
  'camila.rocha@alivclinica.com.br': { uid: IDS_USUARIOS_MOCK.profissionalCamila },
  'rafael.andrade@alivclinica.com.br': { uid: IDS_USUARIOS_MOCK.profissionalRafael },
  'julia.meireles@alivclinica.com.br': { uid: IDS_USUARIOS_MOCK.profissionalJulia },
  'larissa.souza@alivclinica.com.br': { uid: IDS_USUARIOS_MOCK.atendente },
};

export function obterUsuarioMockPorUid(uid) {
  return usuariosMock.find((usuario) => usuario.id === uid) ?? null;
}
