// Cor de avatar derivada de hash do nome — a mesma pessoa precisa aparecer
// com a mesma cor em toda tela (ver CONTEXTO.md, seção 7.6, ⚠️).

import { coresAvatar } from '../theme/cores';

export function corDoAvatar(nome) {
  const texto = String(nome ?? '');
  let hash = 0;
  for (let i = 0; i < texto.length; i += 1) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return coresAvatar[hash % coresAvatar.length];
}

export function iniciaisDoNome(nome) {
  const partes = String(nome ?? '')
    .replace(/^(Dr\.|Dra\.|Sr\.|Sra\.)\s*/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
