// Hooks de módulo (Node) que deixam os serviços do app rodarem fora do Expo:
//   - imports sem extensão ('../utils/data') passam a resolver para '.js';
//   - `src/services/firebase.js` (Auth do React Native) e `src/services/config.js`
//     são trocados por stubs de scripts/stubs/;
//   - os .js do projeto são carregados como ES modules (o package.json não
//     declara "type").
//
// Dois modos, escolhidos por quem registra o carregador:
//   mock (padrão)  → USAR_MOCK = true, sem rede. Usado por `npm run testar-mock`
//                    (scripts/registrar-carregador.mjs).
//   firestore      → USAR_MOCK = false, Firestore real via SDK web no Node. Só o
//                    `seed-firestore` usa (scripts/registrar-carregador-firestore.mjs).

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SUBSTITUTOS_MOCK = {
  'src/services/firebase': 'scripts/stubs/firebase.js',
  'src/services/config': 'scripts/stubs/config.js',
};

const SUBSTITUTOS_FIRESTORE = {
  'src/services/firebase': 'scripts/stubs/firebase-node.js',
  'src/services/config': 'scripts/stubs/config-firestore.js',
};

let substitutos = SUBSTITUTOS_MOCK;

export function initialize({ firestore = false } = {}) {
  substitutos = firestore ? SUBSTITUTOS_FIRESTORE : SUBSTITUTOS_MOCK;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    const relativo = path.relative(RAIZ, base).split(path.sep).join('/').replace(/\.js$/, '');

    if (substitutos[relativo]) {
      return { url: pathToFileURL(path.join(RAIZ, substitutos[relativo])).href, shortCircuit: true };
    }
    if (!existsSync(base) && existsSync(`${base}.js`)) {
      return { url: pathToFileURL(`${base}.js`).href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && url.endsWith('.js') && !url.includes('/node_modules/')) {
    return nextLoad(url, { ...context, format: 'module' });
  }
  return nextLoad(url, context);
}
