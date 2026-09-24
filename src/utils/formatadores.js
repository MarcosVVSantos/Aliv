// Formatação e máscara de campos (CPF, telefone, CEP, data). Usado nas telas
// de cadastro e em qualquer lugar que precise mostrar esses dados formatados.

import { dataDeChave } from './data';

export function apenasDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

// Aplica a máscara enquanto o usuário digita: 000.000.000-00
export function formatarCPF(valor) {
  const digitos = apenasDigitos(valor).slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// Aplica a máscara enquanto o usuário digita: (00) 00000-0000, cai para
// (00) 0000-0000 com telefone fixo (10 dígitos).
export function formatarTelefone(valor) {
  const digitos = apenasDigitos(valor).slice(0, 11);
  if (digitos.length <= 10) {
    return digitos
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digitos
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

// Aplica a máscara enquanto o usuário digita: dd/mm/aaaa
export function formatarDataDigitada(valor) {
  const digitos = apenasDigitos(valor).slice(0, 8);
  return digitos
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d{1,4})$/, '$1/$2');
}

// Converte "dd/mm/aaaa" (como veio do campo mascarado) para Date. Devolve
// null se a string estiver incompleta ou não for uma data válida.
export function dataDeTextoBR(texto) {
  const digitos = apenasDigitos(texto);
  if (digitos.length !== 8) return null;
  const dia = Number(digitos.slice(0, 2));
  const mes = Number(digitos.slice(2, 4));
  const ano = Number(digitos.slice(4, 8));
  const data = new Date(ano, mes - 1, dia);
  const valida =
    data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
  return valida ? data : null;
}

// Aplica a máscara enquanto o usuário digita: 00000-000
export function formatarCEP(valor) {
  const digitos = apenasDigitos(valor).slice(0, 8);
  return digitos.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

const DIAS_SEMANA = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

// Aceita Date, Timestamp já convertido, ou a string de calendário
// "AAAA-MM-DD" (lida como data LOCAL — `new Date('2026-09-21')` seria meia-noite
// UTC e mostraria o dia anterior no Brasil).
function paraDate(data) {
  if (data instanceof Date) return data;
  if (typeof data === 'string') {
    const dia = dataDeChave(data);
    if (dia) return dia;
  }
  return new Date(data);
}

// dd/mm/aaaa
export function formatarData(data) {
  const d = paraDate(data);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${d.getFullYear()}`;
}

// HH:mm
export function formatarHora(data) {
  const d = paraDate(data);
  const hora = String(d.getHours()).padStart(2, '0');
  const minuto = String(d.getMinutes()).padStart(2, '0');
  return `${hora}:${minuto}`;
}

// dd/mm/aaaa às HH:mm
export function formatarDataHora(data) {
  return `${formatarData(data)} às ${formatarHora(data)}`;
}

// "quinta, 24 de setembro" — sempre calculado a partir da data real, nunca
// escrito na mão (esse foi o erro do protótipo).
export function formatarDataCurta(data) {
  const d = paraDate(data);
  const diaSemana = DIAS_SEMANA[d.getDay()].split('-')[0];
  return `${diaSemana}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

// "quinta-feira, 24 de setembro de 2026"
export function formatarDataExtenso(data) {
  const d = paraDate(data);
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

// "março de 2025"
export function formatarMesAno(data) {
  const d = paraDate(data);
  return `${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function calcularIdade(dataNascimento) {
  const nascimento = dataNascimento instanceof Date ? dataNascimento : new Date(dataNascimento);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

export function diasEntre(dataInicio, dataFim) {
  const inicio = paraDate(dataInicio);
  const fim = paraDate(dataFim);
  const MS_POR_DIA = 1000 * 60 * 60 * 24;
  const inicioSemHora = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const fimSemHora = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  return Math.round((fimSemHora - inicioSemHora) / MS_POR_DIA);
}

// Aplica a máscara enquanto o usuário digita: HH:mm
export function formatarHoraDigitada(valor) {
  const digitos = apenasDigitos(valor).slice(0, 4);
  return digitos.replace(/(\d{2})(\d{1,2})$/, '$1:$2');
}

// Converte "HH:mm" em { hora, minuto }. Devolve null se incompleto ou fora
// do intervalo (00:00 a 23:59).
export function horaDeTexto(texto) {
  const digitos = apenasDigitos(texto);
  if (digitos.length !== 4) return null;
  const hora = Number(digitos.slice(0, 2));
  const minuto = Number(digitos.slice(2, 4));
  if (hora > 23 || minuto > 59) return null;
  return { hora, minuto };
}

// Junta os campos mascarados "dd/mm/aaaa" e "HH:mm" em um Date. Devolve null
// se qualquer um dos dois for inválido.
export function dataHoraDeTextos(textoData, textoHora) {
  const data = dataDeTextoBR(textoData);
  const hora = horaDeTexto(textoHora);
  if (!data || !hora) return null;
  data.setHours(hora.hora, hora.minuto, 0, 0);
  return data;
}

// Campo numérico digitado no formato brasileiro ("0,3"). Devolve NaN se o
// texto não for um número.
export function numeroDeTexto(texto) {
  const limpo = String(texto ?? '').trim().replace(',', '.');
  if (limpo === '' || !/^-?\d*\.?\d+$/.test(limpo)) return NaN;
  return Number(limpo);
}

export function numeroParaTexto(numero) {
  return numero === null || numero === undefined ? '' : String(numero).replace('.', ',');
}

// Marcas de acento soltas (U+0300 a U+036F) que sobram após normalizar em NFD.
const MARCAS_DE_ACENTO = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g');

// Minúsculas e sem acento — para busca de texto ("acacia" acha "Acácia").
export function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(MARCAS_DE_ACENTO, '')
    .toLowerCase();
}
