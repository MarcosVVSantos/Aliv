# Aliv

App de acompanhamento de tratamento com cannabis medicinal (projeto acadêmico, FATEC). Feito com Expo SDK 57 e Expo Router, roda no **Expo Go**, e usa o Firebase (Auth + Cloud Firestore) pelo SDK web.

O contexto do projeto (modelo de dados, telas, identidade visual e regras) está em [`CONTEXTO.md`](./CONTEXTO.md).

## Rodar o app

```bash
npm install
npx expo start
```

Abra no Expo Go (celular) ou pressione `w` para a web.

### Modo mock (`USAR_MOCK`)

`src/services/config.js` liga e desliga o Firestore:

| `USAR_MOCK` | Comportamento |
|---|---|
| `true` | Dados falsos em memória (`src/services/mocks/`), sem rede e sem login real. É o valor **do repositório**, da entrega e da apresentação. |
| `false` | Cloud Firestore e Firebase Authentication reais. Use só localmente e **não faça commit** com `false`. |

Logins do modo mock (aceitam **qualquer senha**): `beatriz.santos@exemplo.com` (paciente) e `camila.rocha@alivclinica.com.br` (profissional). Os demais e-mails estão em `credenciaisMock`, em `src/services/mocks/usuarios.js`.

### Persistência do modo mock

Os dados do modo mock (`usuarios`, `consultas`, `prescricoes`, `produtos`, `registros_diarios`, `doses` — o `BANCO_MOCK` de `src/services/crudService.js`) vivem **só em memória**: qualquer cadastro, edição ou exclusão feita durante o uso some no próximo reload do Metro ou reinício do app, voltando aos dados originais dos arquivos em `src/services/mocks/`. Isso não é um bug — é assim que `USAR_MOCK = true` foi desenhado (dados sempre previsíveis pra demonstração).

O que **é** persistido, via `AsyncStorage`, mesmo em modo mock:
- a sessão (qual UID está logado — `authService.js`, chave `@aliv/sessao_uid`), pra não pedir login de novo a cada abertura do app;
- as preferências de acessibilidade ("Texto grande", "Alto contraste" — `AcessibilidadeContext.js`).

Com `USAR_MOCK = false`, todos os dados (não só a sessão) vão pro Cloud Firestore de verdade e sobrevivem a reloads.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run lint` | ESLint (`expo lint`). |
| `npm run testar-mock` | Roda as checagens dos serviços e utilitários contra os mocks (sem rede, sem Expo). Deve passar em todas. |
| `npm run seed-firestore` | Recria os dados de teste no Firestore (veja abaixo). |
| `npm run testar-firestore -- --confirmar` | Roda um ciclo de CRUD (criar/listar/buscar/editar/excluir) contra o Firestore real, pelos mesmos serviços do app, e apaga tudo o que criou ao final (veja abaixo). |

`testar-mock`, `seed-firestore` e `testar-firestore` rodam no Node **20.6 ou mais novo**.

## Recriar os dados do Firestore (seed)

Os dados de teste (consultas, prescrição, registros diários, doses) são recriados a partir dos mocks. **A coleção `usuarios` nunca é apagada** — o seed só grava (`merge`) nos UIDs que você fornece, para nunca derrubar um perfil de quem já se cadastrou de verdade.

### 1. Crie as duas contas de teste (uma vez)

O seed precisa de UIDs **reais** do Firebase Authentication para a paciente e a profissional — sem eles, ninguém consegue logar com `USAR_MOCK = false` (o app busca o perfil em `usuarios/{uid}` pelo UID que o Firebase Auth devolve no login).

1. Com `USAR_MOCK = false`, rode o app e cadastre-se pela tela de login/cadastro com um e-mail de teste — por exemplo `beatriz.teste@exemplo.com`. Isso cria a conta no Firebase Authentication e o perfil em `usuarios/{uid}`.
2. Repita para a profissional (crie o perfil como `profissional` — pela tela de gestão de usuários, ou ajustando `tipo` direto no Firestore).
3. Copie o **UID** de cada conta no [Console do Firebase](https://console.firebase.google.com/project/aliv-762fd/authentication/users) → Authentication → Users (coluna "User UID").

### 2. Preencha `scripts/seed-uids.json`

`scripts/seed-uids.json` tem os UIDs reais e por isso **não entra no repositório** (está no `.gitignore`). Copie o modelo e preencha:

```bash
cp scripts/seed-uids.example.json scripts/seed-uids.json
```

(PowerShell: `Copy-Item scripts\seed-uids.example.json scripts\seed-uids.json`)

```json
{
  "paciente": "cole aqui o UID da conta de teste da paciente",
  "profissional": "cole aqui o UID da conta de teste da profissional (Dra. Camila)"
}
```

Se o arquivo não existir, ou se algum UID estiver vazio, o seed para com uma mensagem clara, antes de ler ou gravar qualquer coisa. Os outros profissionais do mock (Dr. Rafael, Dra. Julia) não precisam de login: o seed usa IDs fixos para eles.

### 3. Rode o seed

```bash
# Ensaio: mostra quantos documentos apagaria/gravaria, sem alterar nada
npm run seed-firestore

# Para valer: grava (merge) os usuários e recria as demais coleções
npm run seed-firestore -- --confirmar
```

O que cada coleção recebe:

| Coleção | O que o seed faz |
|---|---|
| `usuarios` | **Nunca apaga.** Grava com `merge` nos 2 UIDs de `seed-uids.json` + 3 IDs fixos (Rafael, Julia, atendente) — preserva o que não estiver no mock (ex.: telefone alterado pelo próprio usuário). |
| `consultas`, `prescricoes`, `registros_diarios`, `doses` | Apaga só os documentos ligados a esses 5 IDs (não a coleção inteira — dados de outros pacientes/profissionais ficam intactos) e grava os novos. |
| `produtos` | Catálogo, não pertence a ninguém: recria só os 3 produtos que o mock conhece. |

- Se as regras do Firestore exigirem login para escrever, informe uma conta: `SEED_EMAIL` e `SEED_SENHA` (PowerShell: `$env:SEED_EMAIL='...'; $env:SEED_SENHA='...'`).
- O seed reaproveita o `crudService`, então os documentos ficam no mesmo formato que o app grava (datas como `Timestamp`, ids como referências).
- As datas dos mocks são relativas a hoje: rode o seed de novo antes de uma demonstração para "renovar" a receita e as doses.

## Testar o CRUD contra o Firestore real

`scripts/testar-firestore.js` roda um ciclo completo (criar → listar → buscar → editar → excluir) nas 5 coleções de gestão, usando os mesmos serviços de `src/services/` que as telas usam — não é um teste automatizado de CI, é uma checagem manual pra rodar de vez em quando contra o projeto de teste.

```bash
npm run testar-firestore -- --confirmar
```

- Sem `--confirmar`, não lê nem grava nada — só explica o que faria.
- Cria seus próprios dados de referência (paciente, profissional, produto) marcados com o prefixo `teste-crud-` nos campos legíveis, e **sempre os apaga ao final**, mesmo se um passo falhar no meio do caminho — nunca toca em nada que não criou nesta execução (os detalhes exatos de como isso funciona, e por que 4 das 5 coleções não têm o prefixo no próprio ID do documento, estão no cabeçalho do arquivo).
- Sob `firestore.rules` (abaixo), a maioria das operações exige login como `profissional` ou `atendente`: informe `SEED_EMAIL`/`SEED_SENHA` (mesma variável do seed) com uma conta desse tipo.
- Termina com um resumo por coleção e, se alguma falha for de permissão, uma mensagem específica (em vez do erro cru do Firestore) explicando o que checar.

## Regras de segurança do Firestore

[`firestore.rules`](./firestore.rules) exige usuário autenticado em tudo, deixa o paciente ler/escrever só os próprios dados em `consultas`, `registros_diarios` e `doses`, e restringe a escrita em `prescricoes` a contas com `tipo: 'profissional'`. **O arquivo não foi testado contra um Firestore real nem contra o emulador** — foi escrito por revisão de código (ver "Levantamento do CRUD" em `CONTEXTO.md`) e tem, no próprio cabeçalho, as decisões que o pedido original não especificou (quem mais pode escrever em `usuarios`/`produtos`/`consultas`, por exemplo). Leia esse cabeçalho antes de publicar.

Antes de publicar de verdade, teste no [Rules Playground](https://console.firebase.google.com/project/aliv-762fd/firestore/rules) do Console (cole o arquivo lá e simule leituras/escritas) ou com o emulador:

```bash
firebase emulators:start --only firestore
```

Para publicar (o `firebase.json` já aponta para o arquivo):

```bash
firebase deploy --only firestore:rules --project aliv-762fd
```

Depois de publicar, rode `npm run testar-firestore -- --confirmar` autenticado como profissional para confirmar que a área de gestão continua funcionando.

## Checklist antes de trocar `USAR_MOCK` para `false`

- [ ] `firestore.rules` revisado (as decisões marcadas no cabeçalho do arquivo fazem sentido pro seu caso) e publicado (`firebase deploy --only firestore:rules`).
- [ ] Índice de `doses` publicado (`firebase deploy --only firestore:indexes` — ver seção abaixo).
- [ ] Autenticação por e-mail/senha habilitada no Console (Authentication → Sign-in method).
- [ ] Contas de teste criadas no Firebase Authentication (paciente e profissional — ver "Recriar os dados do Firestore" acima) e `scripts/seed-uids.json` preenchido.
- [ ] Seed rodado (`npm run seed-firestore -- --confirmar`) pra ter dados de demonstração coerentes.
- [ ] `npm run testar-firestore -- --confirmar` (autenticado como profissional) passando nas 5 coleções.
- [ ] `src/services/firebaseConfig.js` aponta pro projeto certo (confira `projectId` se for usar um projeto diferente de `aliv-762fd`).
- [ ] Testado manualmente pelo menos uma vez com internet desligada, pra ver a mensagem de erro (não tela em branco) — os serviços já traduzem `unavailable`/`permission-denied` em `src/services/crudService.js`, e as telas mostram essas mensagens.

Depois de tudo isso, mude `USAR_MOCK` para `false` em `src/services/config.js` **localmente** — o repositório continua com `true` (ver "Modo mock" acima).

## Índice composto do Firestore

A consulta de doses (`paciente_id` + faixa de `data`) exige o índice `doses (paciente_id ASC, data ASC)`, versionado em [`firestore.indexes.json`](./firestore.indexes.json). Sem ele, o Firestore recusa a consulta e as doses (Diário, Início e card de adesão do Tratamento) não carregam. Para publicar:

**Firebase CLI** (o `firebase.json` já aponta para o arquivo):

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:indexes --project aliv-762fd
```

**Pelo link do erro:** com `USAR_MOCK = false`, abra o Diário do paciente. O erro do Firestore no console do Metro traz um link `https://console.firebase.google.com/...create_composite=...`; abra-o, confirme e aguarde alguns minutos até o índice ficar "Ativado".

## Build (APK)

```bash
npx eas-cli build --platform android --profile preview
```

O perfil `preview` do `eas.json` gera o APK. Confirme `USAR_MOCK = true` antes.
#
