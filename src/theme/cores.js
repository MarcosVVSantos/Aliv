// Paleta da marca Aliv — ver CONTEXTO.md, seção 5.
// Não crie cor nova fora daqui: se faltar alguma, adicione neste arquivo.

export const cores = {
  primaria: '#3B6B5A', // verde sálvia
  primariaEscura: '#2C5245',
  fundo: '#F7F5F1', // off-white quente
  terracota: '#C97B5A', // CTA, alertas, pendências
  terracotaEscura: '#A65F41',
  textoPrincipal: '#2B2B2B', // carvão
  textoSecundario: '#6B6B6B',
  card: '#FFFFFF',
  verdeClaro: '#DCE8E2', // fundo de selo
  terracotaClara: '#F5DFD4', // fundo de selo
  borda: '#E3DFD6',
  branco: '#FFFFFF',
  preto: '#000000',
};

// Variante de alto contraste — usada quando AcessibilidadeContext liga
// `altoContraste`. Escurece texto e reforça bordas, sem trocar a identidade
// de marca (mesmas cores-base, só mais saturadas/fechadas).
export const coresAltoContraste = {
  ...cores,
  textoPrincipal: '#000000',
  textoSecundario: '#3A3A3A',
  borda: '#8A8A8A',
  fundo: '#FFFFFF',
};

export function obterCores(altoContraste) {
  return altoContraste ? coresAltoContraste : cores;
}

// Cores de estado, usadas em selos (badges) e ícones de status.
export const coresEstado = {
  sucesso: '#3B6B5A',
  sucessoFundo: '#DCE8E2',
  atencao: '#C9974E',
  atencaoFundo: '#F5EBD4',
  perigo: '#B0503A',
  perigoFundo: '#F5DFD4',
  neutro: '#6B6B6B',
  neutroFundo: '#EDEBE6',
};

// Paleta estável para avatares de iniciais — a cor de uma pessoa é derivada
// de hash do nome (ver src/utils/avatar.js), nunca escolhida ao acaso na
// tela, para não repetir o erro do protótipo (mesma pessoa, cores diferentes
// em telas diferentes).
export const coresAvatar = [
  '#3B6B5A',
  '#C97B5A',
  '#4E7FA6',
  '#8A6BAE',
  '#B08B3A',
  '#5A8F72',
  '#A65F6F',
];

export default cores;
