// Helpers de datas relativas para os mocks — nenhum mock tem data literal de
// calendário (ver CONTEXTO.md, princípio 4): tudo é calculado a partir de
// `hoje` com estes dois helpers.

// `hoje` menos `n` dias (n negativo = no futuro), à mesma hora de `hoje`.
export function diasAtras(n, hoje = new Date()) {
  const d = new Date(hoje);
  d.setDate(d.getDate() - n);
  return d;
}

// `data` com o horário substituído (dia/mês/ano preservados).
export function comHora(data, hora, minuto = 0) {
  const d = new Date(data);
  d.setHours(hora, minuto, 0, 0);
  return d;
}
