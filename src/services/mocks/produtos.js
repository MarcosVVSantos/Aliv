// Dados falsos da coleção `produtos` (ver CONTEXTO.md, seção 6 e 9).

export const PRODUTO_OLEO_CBD_200 = {
  id: 'prod-oleo-cbd-200',
  nome: 'Óleo CBD 200mg/mL',
  fabricante: 'Aliv Farmacêutica',
  teor_cbd: 200,
  teor_thc: 0.3,
  espectro: 'full spectrum',
  volume_ml: 30,
  ativo: true,
};

const produtoOleoCbd50 = {
  id: 'prod-oleo-cbd-50',
  nome: 'Óleo CBD 50mg/mL',
  fabricante: 'Aliv Farmacêutica',
  teor_cbd: 50,
  teor_thc: 0.2,
  espectro: 'broad spectrum',
  volume_ml: 30,
  ativo: true,
};

const produtoCapsulasCbd = {
  id: 'prod-capsulas-cbd-25',
  nome: 'Cápsulas CBD 25mg',
  fabricante: 'Aliv Farmacêutica',
  teor_cbd: 25,
  teor_thc: 0,
  espectro: 'isolado',
  volume_ml: null,
  ativo: true,
};

export const produtosMock = [
  PRODUTO_OLEO_CBD_200,
  produtoOleoCbd50,
  produtoCapsulasCbd,
];
