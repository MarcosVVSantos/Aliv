// Dados falsos da coleção `prescricoes` (ver CONTEXTO.md). `status` aqui é o
// valor gravado no documento (`rascunho` | `ativa` | `cancelada`) — a
// situação mostrada na tela (vigente / vence em breve / vencida) é sempre
// calculada por `situacaoPrescricao` a partir de `data_validade`, nunca lida
// daqui.
//
// `criarPrescricoesMock(ids, hoje)` é a fábrica — ver o comentário de topo de
// mocks/usuarios.js. As datas são relativas a `hoje` (princípio 4), e ficam
// depois de "ajuste de dose" (mocks/consultas.js) na linha do tempo: receita
// emitida há ~11 meses, vencendo em ~3 semanas — o que mostra o selo "vence em
// breve" e o card de renovação (validade de 1 ano é regra do projeto
// acadêmico; a validade real depende da regulação vigente).

import { ID_CONSULTA_AJUSTE_DOSE } from './consultas';
import { PRODUTO_OLEO_CBD_200 } from './produtos';
import { comHora, diasAtras } from './relativo';
import { IDS_USUARIOS_MOCK } from './usuarios';

const DIAS_VALIDADE = 365;
const DIAS_PARA_VENCER = 21;
// Emitida depois do "ajuste de dose" (350 dias atrás, ver mocks/consultas.js).
const DIAS_EMISSAO_RECEITA_ATUAL = DIAS_VALIDADE - DIAS_PARA_VENCER; // 344

export const ID_PRESCRICAO_MOCK = 'presc-mock-atual';

export function criarPrescricoesMock(ids, hoje = new Date()) {
  const emissao = comHora(diasAtras(DIAS_EMISSAO_RECEITA_ATUAL, hoje), 10, 40);
  const validade = comHora(diasAtras(DIAS_EMISSAO_RECEITA_ATUAL - DIAS_VALIDADE, hoje), 23, 59);

  return [
    {
      id: ID_PRESCRICAO_MOCK,
      consulta_id: ID_CONSULTA_AJUSTE_DOSE,
      paciente_id: ids.paciente,
      paciente_nome: 'Beatriz Santos',
      profissional_id: ids.profissionalCamila,
      profissional_nome: 'Dra. Camila Rocha',
      status: 'ativa',
      // Snapshot do CID no momento da emissão (copiado da consulta).
      cid: 'F41.1',
      data_emissao: emissao,
      data_validade: validade,
      tipo_receituario: 'Receituário de Controle Especial (Tipo B2)',
      justificativa_clinica:
        'Paciente com transtorno de ansiedade generalizada, refratária a terapias convencionais prévias (ansiolíticos e terapia cognitivo-comportamental).',
      sintoma_alvo: 'Ansiedade',
      // Um paciente, um óleo, um item: senão os dois produtos aparecem no Tratamento.
      itens: [
        {
          produto_id: PRODUTO_OLEO_CBD_200.id,
          produto_nome: PRODUTO_OLEO_CBD_200.nome,
          teor_cbd: PRODUTO_OLEO_CBD_200.teor_cbd,
          teor_thc: PRODUTO_OLEO_CBD_200.teor_thc,
          volume_ml: PRODUTO_OLEO_CBD_200.volume_ml,
          dose_inicial: 2,
          unidade_dose: 'gotas',
          via_administracao: 'Sublingual',
          horarios: ['08:00', '20:00'],
          duracao_dias: 30,
          instrucoes_uso: 'Aguardar 60 segundos sob a língua antes de engolir.',
        },
      ],
    },
  ];
}

export const prescricoesMock = criarPrescricoesMock(IDS_USUARIOS_MOCK);
