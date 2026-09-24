// Uso: node --import ./scripts/registrar-carregador-firestore.mjs <script>
// Modo Firestore real (USAR_MOCK = false). Só o seed usa este registrador.

import { register } from 'node:module';

process.env.TZ = 'America/Sao_Paulo';

register('./carregador-mock.mjs', { parentURL: import.meta.url, data: { firestore: true } });
