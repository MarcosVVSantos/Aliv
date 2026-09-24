// Uso: node --import ./scripts/registrar-carregador.mjs <script>
// Modo mock (sem rede). Fixa o fuso em America/Sao_Paulo (UTC−3) antes de
// qualquer Date ser criado — é o fuso em que o bug das datas em UTC aparecia — e
// registra os hooks de scripts/carregador-mock.mjs.

import { register } from 'node:module';

process.env.TZ = 'America/Sao_Paulo';

register('./carregador-mock.mjs', import.meta.url);
