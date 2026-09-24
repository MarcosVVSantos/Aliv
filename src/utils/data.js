// Datas de calendário ('AAAA-MM-DD') sempre no horário LOCAL.
//
// `toISOString()` devolve UTC: no Brasil (UTC−3), depois das 21h isso já é o dia
// seguinte, e uma dose das 20:00 marcada às 21:30 seria gravada como de amanhã.
// Por isso a data de calendário é montada com os getters locais.

// Date → 'AAAA-MM-DD' (data local, sem hora). É o formato gravado em
// `registros_diarios.data` e `doses.data`.
export function dataLocalISO(date = new Date()) {
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mes}-${dia}`;
}

// 'AAAA-MM-DD' → Date à meia-noite local. Devolve null se não for uma data válida.
export function dataDeChave(chave) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(chave ?? ''));
  if (!partes) return null;
  const [ano, mes, dia] = partes.slice(1).map(Number);
  const data = new Date(ano, mes - 1, dia);
  const valida = data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
  return valida ? data : null;
}
