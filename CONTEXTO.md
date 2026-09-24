# CONTEXTO.md — Aliv (v3, consolidado em 21/09/2026)

App de acompanhamento de tratamento com cannabis medicinal (projeto acadêmico, FATEC). Expo SDK 57 + Expo Router, Firebase (Auth + Firestore) pelo SDK web.

> **Sobre este documento:** a v3 foi integrada aqui e os ajustes pendentes foram executados (ver "Histórico dos ajustes da v3"). A árvore, a lista de telas e os nomes de campo foram conferidos **contra o código**. As seções numeradas da versão anterior (5, 6, 7.x, 8, 9), citadas em comentários do código, não estão no repositório: a lista de telas abaixo foi levantada dos arquivos, e a identidade visual se resume ao que o código impõe.
>
> **Regra do modelo de dados:** não altere a estrutura das coleções sem avisar.

## Configuração

- **Expo SDK 57.** Antes de usar qualquer API do Expo, consulte a documentação do SDK 57 (regra do `AGENTS.md`).
- **Tudo precisa rodar no Expo Go.** Nada de bibliotecas com código nativo próprio. O Firebase é usado pelo SDK web (`firebase` 12), nunca por `@react-native-firebase`.
- **`USAR_MOCK`** (`src/services/config.js`): o repositório fica com `true`, valor da entrega e da apresentação (o checklist exige "roda sem Firebase"). Use `false` só localmente, para testar com o Firestore, e **não faça commit** com `false`.
- **Build:** o perfil `preview` do `eas.json` gera o APK.
- **Isolamento do Firebase:** a regra "só `src/services/` importa `firebase/*`" vale para `app/` e `src/` — nenhuma tela e nenhum outro módulo de `src/` importa Firebase direto. `scripts/` fica **fora** dessa regra, por não fazer parte do app (não entra no bundle do Expo): `scripts/seed-firestore.js` importa `firebase/auth` e `firebase/firestore` diretamente, e é a única exceção.
- **Comandos:** `npm run lint` · `npm run testar-mock` · `npm run seed-firestore` (ver `README.md`).

## Estrutura do projeto

```
app/                                  # Expo Router (rotas)
  _layout.js
  index.js                            # menu de entrada (escolha entre áreas do app)
  splash.js                           # splash com o logo de onda
  (auth)/
    login.js  esqueci-senha.js
    cadastro/                         # dados-pessoais, endereco, responsavel, termo
  paciente/                           # área do paciente
    (tabs)/                           # inicio, tratamento, consultas, diario, perfil
    consultas/                        # agendar, historico
    perfil/                           # meus-dados, contato, documentos
    tratamento/                       # evolucao
  clinico/                            # área do profissional
    agenda.js
    paciente/[id].js
    prescricao/nova.js
  usuarios/     index.js  novo.js  [id].js     # CRUD
  consultas/    index.js  novo.js  [id].js     # CRUD
  prescricoes/  index.js  nova.js  [id].js     # CRUD
  produtos/     index.js  novo.js  [id].js     # CRUD
  registros/    index.js  novo.js  [id].js     # CRUD (registros diários)
src/
  components/                         # Logo (fonte única do logo), Botao, Cartao, Texto, Chip, Selo,
                                      # TelaListagem, TelaFormulario, SliderSintoma, ...
    formularios/                      # FormularioConsulta, FormularioPrescricao, FormularioProduto,
                                      # FormularioRegistro, FormularioUsuario
  hooks/                              # useSessao, useCadastro, useFormularioCrud, useOpcoes
  services/                           # único lugar que importa firebase/*
    config.js                         # USAR_MOCK
    firebase.js  firebaseConfig.js
    crudService.js                    # CRUD genérico das 6 coleções (+ criarComIdRemovendo, em lote)
    authService.js  usuarioService.js  consultaService.js  produtoService.js
    prescricaoService.js  registroService.js  diarioService.js
    mocks/                            # dados falsos por coleção — ver "Mocks: fábricas com IDs" abaixo
                                      # usuarios.js, consultas.js, prescricoes.js, doses.js,
                                      # registrosDiarios.js, produtos.js, relativo.js (helpers de data)
  theme/                              # AcessibilidadeContext, cores, espacamento, tipografia,
                                      # useFontesCarregadas
  utils/
    data.js                           # dataLocalISO(), dataDeChave() — datas de calendário locais
    adesao.js                         # rotulosDaAdesao()
    anvisa.js                         # situacaoAutorizacao()
    dose.js  prescricao.js  produto.js  formatadores.js  validadores.js
    avatar.js  dialogo.js  estadoApp.js  viacep.js
scripts/
  testar-mock.js                      # checagens no modo mock (npm run testar-mock)
  seed-firestore.js                   # recria os dados de teste no Firestore (npm run seed-firestore)
  seed-uids.example.json               # modelo (campos vazios) — versionado
  seed-uids.json                       # UIDs reais (paciente/profissional); no .gitignore, nunca versionado
  carregador-mock.mjs  registrar-carregador.mjs  registrar-carregador-firestore.mjs
  stubs/                              # firebase/config substitutos para rodar no Node
firestore.indexes.json  firebase.json # índice composto de `doses`
eas.json  app.json
```

**CRUDs (gestão):** `usuarios`, `consultas`, `prescricoes`, `produtos`, `registros` — cada um com `index` (listagem), `novo`/`nova` e `[id]` (edição), montados sobre `TelaListagem`, `TelaFormulario` e `useFormularioCrud`.

**Área do paciente:** 5 abas (Início, Tratamento, Consultas, Diário, Perfil) + agendar/histórico de consultas, evolução, meus dados, contato e documentos.

**Área clínica:** agenda, ficha do paciente e emissão de prescrição.

## Identidade visual (regras que o código impõe)

- **Logo:** sempre `src/components/Logo.js` (onda dentro de um círculo). Proibido cruz, "+" ou folha de cannabis como marca. O "+" continua permitido em botões de ação ("+ Adicionar produto", "+ Cadastrar").
- **Tipografia:** Plus Jakarta Sans em todo o app (`src/theme/tipografia.js`).
- **Acessibilidade:** "Texto grande" e "Alto contraste" (`AcessibilidadeContext`), que valem para as 5 abas do paciente.

---

## Modelo de dados — v3

> Legenda: **[NOVO]** · **[ALTERADO]** · **[REMOVIDO]**. Os nomes abaixo são os do código.

### Princípios

1. **Nenhum campo derivado é gravado.** Os seguintes valores são calculados na exibição:
   - situação da prescrição;
   - situação da autorização Anvisa (`situacaoAutorizacao`, ver abaixo) — **exceto** um valor gravado que não seja um dos calculados (qualquer decisão manual, ex.: `indeferida`, `cancelada`), que aí prevalece;
   - status `pendente`/`perdida` das doses;
   - adesão;
   - frequência e posologia em texto;
   - idade.
2. **Snapshot não é campo derivado.** Dado copiado no momento da emissão, para ficar congelado, é histórico e pode ser gravado. Exemplos: `cid` e os dados do produto (`produto_nome`, `teor_cbd`, `teor_thc`, `volume_ml`) nos itens da prescrição; `paciente_nome` e `profissional_nome`.
3. **Datas:**
   - data e hora → `Timestamp` (no app, `Date`; o `crudService` converte);
   - data de calendário → string `AAAA-MM-DD` **no horário local**, sempre via `dataLocalISO()` (`src/utils/data.js`); nunca `toISOString()` nem `new Date(string)` para strings `'AAAA-MM-DD'` (isso é UTC e volta um dia no Brasil) — `dataDeChave()` sempre usa `new Date(ano, mes - 1, dia)`.
   - horário do dia → `HH:mm`.
4. **Mocks usam datas relativas a hoje**, sem nenhuma data literal de calendário (`src/services/mocks/relativo.js`, checado por `npm run testar-mock`). A única exceção é a data de nascimento da paciente (`1985-08-14`), que é um fato fixo, não uma data "de demonstração".
5. **Referências:** campos `*_id` são gravados como `Reference` do Firestore e voltam ao app como string (o id).

### usuarios

```
email, telefone, tipo: 'paciente' | 'profissional' | 'atendente', ativo: boolean
data_cadastro: Timestamp            // exibido como "Paciente desde"; o crudService grava com a hora do servidor
paciente: {                         // quando tipo = 'paciente'
  cpf, nome_completo, data_nascimento, sexo
  endereco: {
    logradouro, numero,
    complemento: string             // [NOVO] opcional, "" quando vazio
    bairro, cidade, uf, cep
  }
  responsavel_legal
  termos_consentimento[]: [{ versao, data_assinatura, hash_assinatura }]
  autorizacoes_anvisa[]: [{
    numero, data_emissao, data_validade
    situacao?: string   // [ALTERADO] só gravado quando é decisão manual (qualquer valor
                         // fora de SITUACOES_CALCULADAS) — ex.: 'indeferida', 'cancelada'
  }]
}
profissional: { nome_completo, conselho, num_registro, uf_registro, especialidade, modalidade_padrao }
atendente:    { nome_completo, cargo }
```

O endereço vive em `usuarios/{uid}.paciente.endereco`.

**Situação da autorização calculada:** `situacaoAutorizacao(autorizacao, hoje)` em `src/utils/anvisa.js`, mesmo padrão de `situacaoPrescricao` — usada em `app/paciente/perfil/documentos.js` e em `FormularioUsuario` (gestão). A lógica é invertida em relação à prescrição: a função não guarda uma lista do que é "decisão manual" (ela não tem como conhecer todas), guarda `SITUACOES_CALCULADAS = ['vigente', 'vence_em_breve', 'vencida']` — o que ELA sabe calcular. Um `situacao` gravado que não esteja nessa lista prevalece, seja qual for (`'indeferida'`, `'cancelada'`, ou qualquer decisão futura); vazio ou igual a um dos calculados é ignorado. Sem `data_validade` e sem valor manual, o resultado é `'sem_validade'` (nunca `'vencida'`).

### prescricoes

```
consulta_id: string | null
paciente_id, profissional_id: string
paciente_nome, profissional_nome                 // snapshots
status: 'rascunho' | 'ativa' | 'cancelada'      // [ALTERADO]
cid: string | null                               // [NOVO] snapshot
justificativa_clinica: string
tipo_receituario, sintoma_alvo: string
data_emissao: Timestamp | null                   // null enquanto rascunho
data_validade: Timestamp | null                  // null enquanto rascunho
renovacao_solicitada: boolean                    // gravado quando o paciente pede renovação
itens: [{
  produto_id: string
  produto_nome, teor_cbd, teor_thc, volume_ml    // snapshot do produto na emissão
  dose_inicial: number
  unidade_dose: string
  via_administracao: string
  horarios: string[]                             // [NOVO] ex.: ['08:00', '20:00']
  duracao_dias: number
  instrucoes_uso: string                         // [NOVO]
}]
posologia, frequencia                            // [REMOVIDO] calculados na exibição
```

**Validação:**

| Ação | O que exige e o que faz |
|---|---|
| Rascunho | Exige só `paciente_id` e `profissional_id`. |
| Emitir | Exige `cid`, `justificativa_clinica` e pelo menos 1 item completo com `horarios` não vazio. Grava `data_emissao`, `data_validade` e `status: 'ativa'`. |
| Cancelar | Só muda o `status`. Nunca apaga o documento. |

**Situação calculada:** `situacaoPrescricao(prescricao, hoje)` em `src/utils/prescricao.js`. A ordem de verificação é:

1. rascunho;
2. cancelada;
3. vencida;
4. vence em breve (validade em até 30 dias);
5. ativa.

A tela de Tratamento mostra **"emitida em"** (data da receita atual) e não "desde".

### registros_diarios

```
paciente_id: string
paciente_nome: string                // snapshot
data: 'AAAA-MM-DD'                   // local
escala_sintoma: number (0–10)        // nível de dor; sempre inteiro
humor, qualidade_sono
observacao: string
efeitos_adversos: [{ descricao }]
sem_efeitos_adversos: boolean        // [NOVO]
dose_administrada                    // [REMOVIDO] as doses vivem na coleção `doses`
```

- **ID do documento:** `{paciente_id}_{data}`.
- **Três estados dos efeitos:**
  - `true` com `[]` → "Nenhum";
  - `false` com itens → efeitos relatados;
  - `false` com `[]` → não preenchido.
  - `true` com itens é recusado.
- **Registros antigos** (`data` como Timestamp e ID automático): na leitura, `data` é normalizada para `'AAAA-MM-DD'`. Ao salvar, o documento vai para o ID novo e os antigos do mesmo paciente e dia são apagados **no mesmo `writeBatch`** (`criarComIdRemovendo`).

### doses — [NOVO] coleção raiz

```
paciente_id, prescricao_id, produto_id
data: 'AAAA-MM-DD'                   // local
horario_previsto: 'HH:mm'
quantidade: number
unidade: string
status: 'tomada' | 'pulada'
registrado_em: Timestamp
```

- **ID do documento:** `{paciente_id}_{data}_{HHmm}_{produto_id}`.
- **Status exibido (calculado):**
  - documento com `tomada` → tomada;
  - documento com `pulada` → perdida;
  - sem documento e horário + 2 h já passaram → perdida;
  - senão → pendente.
- **Índice composto:** `doses (paciente_id ASC, data ASC)`, versionado em `firestore.indexes.json`.

### consultas e produtos

```
consultas: paciente_id, paciente_nome, profissional_id, profissional_nome, data_hora: Timestamp,
           modalidade, status, eh_retorno, evolucao: { queixa_principal, cid,
           alternativas_terapeuticas_previas, conduta, data_registro }
produtos:  nome, fabricante, teor_cbd, teor_thc, espectro, volume_ml (null em cápsulas), ativo
```

### Adesão — decisão confirmada

- O período são os **últimos 7 dias terminando hoje**, e não a semana de calendário.
- O denominador é o total de horários previstos no período (2 × 7 = 14).
- O card se chama **"Últimos 7 dias"**; os rótulos das bolinhas vêm da data real de cada dia (D, S, T, Q…), com **"hoje"** sempre na última posição (`rotulosDaAdesao`).

### Exibição de produto

O nome aparece com concentração e volume: **"Óleo CBD 200 mg/mL · 30 mL"** (`nomeExibicaoProduto`).

### Mocks: fábricas com IDs

Cada arquivo de `src/services/mocks/` (exceto `produtos.js`, catálogo sem dono) exporta uma **fábrica** — `criarUsuariosMock(ids, hoje)`, `criarConsultasMock(ids, hoje)`, `criarPrescricoesMock(ids, hoje)`, `gerarDosesMock(pacienteId, hoje)`, `gerarRegistrosDiariosMock(pacienteId, hoje)` — além da constante já pronta (`usuariosMock`, `consultasMock`, …), que é a mesma fábrica chamada com os IDs fixos do modo `USAR_MOCK = true` (`IDS_USUARIOS_MOCK`, em `mocks/usuarios.js`). Isso existe para uma única razão: `scripts/seed-firestore.js` chama as **mesmas fábricas** (mesma história, mesmas datas relativas) com os UIDs reais do Firebase Authentication (`scripts/seed-uids.json`) — assim o Firestore de teste e o modo mock nunca divergem na lógica, só nos IDs.

A linha do tempo dos mocks (sempre relativa a `hoje`) é: cadastro da paciente → primeira consulta → início do tratamento → ajuste de dose → emissão da receita atual (vence em ~3 semanas) → consultas de acompanhamento → próxima consulta em `hoje + 3 dias, 14:30`. Checada por `npm run testar-mock`.

---

## Levantamento do CRUD

As 5 telas de gestão (`/usuarios`, `/consultas`, `/prescricoes`, `/produtos`, `/registros`) compartilham a mesma arquitetura: `index.js` monta `TelaListagem` (busca em memória, cartões, confirmação de exclusão, estados carregando/vazio/erro — `src/components/TelaListagem.js`); `novo.js`/`nova.js` e `[id].js` só escolhem o `modo` (`'novo'` | `'editar'`) de um `FormularioX` (`src/components/formularios/`), que usa `useFormularioCrud` (`src/hooks/useFormularioCrud.js`) para carregar, validar e salvar. Nenhuma tela ou componente importa `firebase/*` direto — confirmado por busca no código, não só por leitura.

| Coleção | Tela | listar | criar | buscar por id | editar | excluir | Serviço |
|---|---|---|---|---|---|---|---|
| `usuarios` | `/usuarios` | `listarUsuarios` | `criarUsuario` | `obterUsuarioDoc` | `atualizarUsuario` | `removerUsuario` | `usuarioService.js` |
| `consultas` | `/consultas` | `listarConsultas` | `criarConsulta` | `obterConsultaDoc` | `atualizarConsulta` | `removerConsulta` | `consultaService.js` |
| `prescricoes` | `/prescricoes` | `listarPrescricoes` | `criarPrescricao` | `obterPrescricaoDoc` | `atualizarPrescricao` | `removerPrescricao` | `prescricaoService.js` |
| `produtos` | `/produtos` | `listarTodosProdutos` | `criarProduto` | `obterProdutoDoc` | `atualizarProduto` | `removerProduto` | `produtoService.js` |
| `registros_diarios` | `/registros` | `listarRegistros` | `criarRegistro` | `obterRegistro` | `atualizarRegistro` | `removerRegistro` | `registroService.js` |

Nenhuma operação faltando nas 5. `obter*` sempre lança um erro claro ("… não encontrado.") quando o id não existe — nunca devolve `undefined` silenciosamente.

**Diferenças mock vs. Firestore**, verificadas no código (não testadas ao vivo):
- **ID gerado:** mock usa `{colecao}-{timestamp}-{contador}`; Firestore usa o id do `addDoc`. Strings diferentes, mesma garantia (único) — nenhuma tela depende do formato.
- **Datas:** o `crudService` converte `Date ⇄ Timestamp` nos dois sentidos, dos dois lados — a tela nunca vê `Timestamp`, em nenhum dos dois modos.
- **Retorno das funções:** idêntico nos dois modos (`criar`/`criarComId` devolvem `{ id }`; `atualizar`/`remover` devolvem `void`).
- **Validação:** os serviços (`validarUsuario`, `validarConsulta`, `validarPrescricao`, `validarProduto`, `validarRegistro`) exigem menos do que os formulários (ex.: `criarUsuario` não valida formato de CPF/CEP — só o formulário faz isso). Quem chamar o serviço direto, pulando o formulário (como `scripts/testar-firestore.js`), passa por menos checagem.

**Achado fora do escopo do CRUD em si:** `/usuarios/novo` (a tela de gestão) cria o documento com `criar()` — um ID aleatório, sem conta no Firebase Authentication. Só `authService.cadastrarPaciente` (o cadastro que o próprio paciente faz) cria a conta de Auth e usa esse UID como ID do documento (`criarComId`). Ou seja: **um usuário criado pela tela de gestão nunca consegue logar**, nem no modo mock (não entra em `credenciaisMock`) nem no Firestore real — em nenhum dos dois modos, hoje. Isso não é novo desta rodada; é assim que o app já funcionava. Só virou relevante agora por causa das `firestore.rules` (que dependem do `tipo` gravado no perfil do UID autenticado) e por isso está registrado aqui.

## Estado da implementação — MANTER

> Implementado e validado (lint, `expo export web` e `npm run testar-mock`). **Não refatore nem reescreva.** Só mexa se houver um motivo, e explique-o.

- `situacaoPrescricao` em `src/utils/prescricao.js`, usada por todas as telas e pelo card de renovação.
- Fluxo de prescrição: rascunho, emissão com validação, cancelamento só por status, campos CID e horários nos formulários.
- Registros diários com ID `{paciente}_{data}`, `sem_efeitos_adversos`, regra dos três estados e chip "Nenhum".
- Coleção `doses` com ID fixo (sem duplicata), status calculado com 2 h de tolerância, e as funções `marcarDoseTomada`, `marcarDosePulada`, `listarDosesDoDia` e `obterAdesaoSemana`.
- Diário com "Pular esta dose" e o estado "Perdida".
- Mocks com datas relativas: receita emitida há ~11 meses que vence em 3 semanas, 29 dias de registros e 6 dias de doses com todos os estados.
- "Emitida em" no lugar de "Prescrito por … desde".
- Isolamento do Firebase em `src/services/`.

## Histórico dos ajustes da v3

| # | Ajuste | Situação |
|---|---|---|
| 1 | Datas locais | Feito: `src/utils/data.js`; nenhum `toISOString` restante. |
| 2 | Registros antigos | Feito: normalização na leitura e gravação+remoção em `writeBatch`. |
| 3 | Card de adesão | Feito: "Últimos 7 dias", rótulos pela data real, "hoje" à direita. |
| 4 | Scripts | Feito: `testar-mock.js` (18 checagens) e `seed-firestore.js`. |
| 5 | Recriar em vez de migrar | Documentado no `README.md`. **O seed não foi rodado**: quem roda é o Marcos. |
| 6 | Índice versionado | Feito: `firestore.indexes.json` + `firebase.json`. **Falta publicar** (ver `README.md`). |
| 7 | Logo | Já estava correto: todo logo vem de `Logo.js`. |
| 8 | Limpeza | `expo-device` removido; `@expo/ui` e `expo-glass-effect` saíram do `package.json` (o `expo-router` ainda os instala). Arquivos em UTF-8. `USAR_MOCK = true`. |
| 9 | Este documento | Feito. |

## Histórico dos ajustes — rodada 2

| # | Ajuste | Situação |
|---|---|---|
| 1 | `dataDeChave()` + fuso nos testes | `dataDeChave` já usava `new Date(ano, mes-1, dia)` (confirmado, com teste de ida e volta). `process.env.TZ` fixado no topo de `scripts/testar-mock.js`, com `import()` dinâmico (um `import` estático seria avaliado antes da atribuição — ver comentário no arquivo). |
| 2 | Seed sem quebrar o login | Feito: reescrito. `usuarios` nunca é apagado, só `merge` nos IDs de `scripts/seed-uids.json` (+ 3 IDs fixos sem login). As demais coleções só apagam documentos ligados a esses 5 IDs. Ver README, "Recriar os dados do Firestore". |
| 3 | Mocks sem datas fixas | Feito: `usuarios`, `consultas`, `prescricoes`, `doses`, `registros_diarios` viraram fábricas parametrizadas por IDs, todas com datas relativas a `hoje` (`mocks/relativo.js`). Teste de ordem cronológica e teste de "nenhuma data literal" em `testar-mock.js`. |
| 4 | `autorizacoes_anvisa[].situacao` | Feito: `situacaoAutorizacao()` em `src/utils/anvisa.js`, mesmo padrão de `situacaoPrescricao`. As duas telas que liam `.situacao` direto (`documentos.js`, `FormularioUsuario`) passaram a chamar a função. |
| 5 | Remover `reset-project` | Feito: `scripts/reset-project.js` e a entrada no `package.json` removidos. |
| 6 | Este documento | Feito: exceção do isolamento do Firebase explicitada, seção "Mocks: fábricas com IDs", modelo e pendências atualizados. |

## Histórico dos ajustes — rodada 3

| # | Ajuste | Situação |
|---|---|---|
| 1 | `situacaoAutorizacao` invertida | Feito: em vez de `SITUACOES_MANUAIS`, a função guarda `SITUACOES_CALCULADAS = ['vigente', 'vence_em_breve', 'vencida']` — qualquer valor gravado fora dessa lista prevalece, seja qual for. Sem `data_validade` e sem valor manual, devolve `'sem_validade'` (nunca `'vencida'`). Levantamento antes de mudar: nenhum valor de `situacao` está gravado hoje em mocks/formulários/seed (os únicos que existiram, `'vigente'`/`'vencida'`, já tinham saído na rodada 2). Testes para um valor desconhecido (`'suspensa'`) e para validade ausente em `testar-mock.js`. Pendência da rodada 2 sobre valores manuais não confirmados removida — não existe mais essa lista para manter atualizada. |
| 2 | `seed-uids.json` fora do git | Feito: `scripts/seed-uids.json` entrou no `.gitignore`; `scripts/seed-uids.example.json` (campos vazios) ficou versionado como modelo. `seed-firestore.js` dá uma mensagem específica ("copie o exemplo") quando o arquivo não existe. README atualizado. |

## Histórico dos ajustes — rodada 4

| # | Ajuste | Situação |
|---|---|---|
| 1 | Levantamento do CRUD | Feito — ver seção "Levantamento do CRUD" acima. Achado: `/usuarios/novo` cria usuário sem conta de Authentication (não é novo, mas passou a importar por causa das regras). |
| 2 | Testes de CRUD no mock | Feito: `testar-mock.js` ganhou o ciclo completo (criar → listar → buscar → editar → excluir) nas 5 coleções, mais os casos específicos pedidos (registro duplicado vira um documento; rascunho sem CID salva e emitir incompleto falha com mensagem clara pela via de CRUD, não só pela via clínica de `emitirPrescricao`; excluir não afeta outros documentos). 35 checagens no total (eram 27). |
| 3 | `scripts/testar-firestore.js` | Feito: novo script, mesmos serviços de `src/services/`, prefixo `teste-crud-` nos dados legíveis, limpa tudo no `finally` (a lista do que foi criado nesta execução é a fonte da verdade, não uma varredura por prefixo — ver cabeçalho do arquivo), exige `--confirmar`, mensagem específica pra erro de permissão, resumo por coleção. Testado só em modo mock (nunca contra o Firestore real, incluindo um teste de mutação que força uma falha no meio do ciclo). |
| 4 | `firestore.rules` | Feito: exige autenticação, paciente dono de `consultas`/`registros_diarios`/`doses`, escrita de `prescricoes` só por `profissional`. **Não testado contra Firestore real nem emulador** — as decisões que o pedido não especificou estão marcadas no cabeçalho do arquivo. Registrado em `firebase.json`. |
| 5 | Telas sem tratamento de erro na carga | Corrigido: ~12 telas (`inicio`, `tratamento`, `diario`, `consultas`, `evolucao`, `perfil`, `meus-dados`, `documentos`, `agendar` do paciente; `agenda`, `paciente/[id]`, `prescricao/nova` da área clínica) carregavam dados sem `catch` — uma falha (permissão, rede) deixava a tela com um estado vazio enganoso ("nenhuma consulta", "nenhum tratamento") em vez de mostrar o erro. Todas passaram a ter estado de erro (reaproveitando `EstadoVazio`/`TelaCarregando`, já usados em `TelaListagem`/`TelaFormulario` — nenhum componente novo). Ações rápidas (marcar dose, confirmar presença, ajustar dose) que só tinham `try/finally` ganharam `catch` com `avisar(...)`. |
| 6 | Persistência do mock | Documentado no README ("Persistência do modo mock"): os dados do mock são só em memória (somem a cada reload); a sessão e as preferências de acessibilidade usam `AsyncStorage`. Nada mudou no comportamento. |
| 7 | Checklist manual | Feito — ver "Checklist manual (rodada 4)" abaixo. |

## Pendências conhecidas

- **Profissionais e atendente do seed sem conta de login:** `seed-rafael`, `seed-julia` e `seed-atendente-larissa` são IDs fixos, não UIDs do Firebase Authentication — ninguém consegue logar como eles com `USAR_MOCK = false` (por enquanto isso não é necessário: só a paciente e a Dra. Camila precisam logar na demonstração).
- **`scripts/seed-uids.json` exige preparo manual:** antes do seed rodar contra o Firestore, alguém precisa criar as duas contas de teste pelo app, colar os UIDs no arquivo (copiado de `seed-uids.example.json`) — ver README. Sem o arquivo, ou com algum UID vazio, o seed para sem ler nem gravar nada.
- **`/usuarios/novo` não cria conta de Authentication:** um usuário cadastrado pela tela de gestão (qualquer tipo) nunca consegue logar — nem no mock, nem no Firestore real. Ver "Levantamento do CRUD". Se isso precisar funcionar (ex.: a atendente cadastrando um novo profissional que já deve conseguir logar), é um fluxo novo a decidir (Admin SDK, convite por e-mail…), fora do alcance de um app só de cliente.
- **`firestore.rules` não testado ao vivo:** escrito por revisão de código, cruzando cada regra com o que `src/services/*.js` lê e grava — nunca rodou contra um Firestore real nem contra o emulador. Antes de publicar, teste no Rules Playground ou com o emulador, e depois rode `npm run testar-firestore -- --confirmar` autenticado como profissional (ver README).
- **Decisões de `firestore.rules` sem confirmação:** (1) leitura de `usuarios` liberada pra qualquer autenticado, não só o dono — sem isso o app quebra (nomes cruzados entre pacientes/profissionais o tempo todo); (2) escrita de `prescricoes` restrita literalmente a `tipo == 'profissional'`, não `atendente` — a tela `/prescricoes` (gestão) só funciona logada como profissional; (3) escrita de `usuarios`/`produtos`/`consultas` (fora do que o paciente já pode) liberada pra `profissional` OU `atendente`. Nenhuma dessas foi pedida explicitamente; estão marcadas no cabeçalho de `firestore.rules` e aqui para serem confirmadas ou ajustadas.
- **Telas de cadastro (`dados-pessoais`, `endereco`, `responsavel`) não verificadas nesta rodada:** só guardam estado local (sem Firestore) até o passo final (`termo.js`, que já trata erro corretamente) — não deveriam precisar de tratamento de erro de carga, mas não foram abertas uma a uma como as demais.

---

## Teste manual (Marcos, no Expo Go, com `USAR_MOCK = true`)

- [ ] Marcar uma dose como tomada e depois pular outra.
- [ ] Tocar duas vezes em "Marcar como tomada" e confirmar que não duplica.
- [ ] Marcar uma dose depois das 21h e conferir se ela ficou no dia certo.
- [ ] No Diário, escolher "Nenhum" e depois adicionar um efeito (o "Nenhum" deve desmarcar).
- [ ] Salvar um rascunho de prescrição e depois emitir.
- [ ] Ver o card "Receita perto de vencer?" no Tratamento.
- [ ] Conferir o card de adesão ("Últimos 7 dias", com "hoje" na direita).
- [ ] Ligar "Texto grande" e "Alto contraste" e percorrer as 5 abas.
- [ ] Conferir se o slider e os gráficos funcionam no celular.

## Checklist manual (rodada 4) — CRUD e telas de erro

> Feito por revisão de código, `npm run lint`, `npm run testar-mock` e `npx expo export --platform web` — **nenhum item abaixo foi clicado num navegador ou no Expo Go**. Os marcados com ⚠️ são onde tenho menos certeza (lógica nova ou visual que só se confirma vendo renderizar).

**CRUD — usuarios, consultas, produtos, registros (mesma estrutura nos 4)**
- [ ] Listar, buscar (campo de busca), criar, editar e excluir um registro de cada.
- [ ] Excluir sem confirmar (cancelar no modal) não apaga nada.
- [ ] Campo obrigatório vazio mostra o erro embaixo do campo, não deixa salvar.

**CRUD — prescricoes**
- [ ] Criar com status "Rascunho" salva sem CID/justificativa/itens.
- [ ] Mudar pra "Ativa" sem preencher CID/justificativa/itens mostra a mensagem específica de cada campo faltando.
- [ ] Emitir completo (todos os campos + 1 item com horário) grava e mostra a prescrição na listagem com a situação calculada certa (não "Ativa" cru).

**Paciente — telas com estado de erro novo** ⚠️
- [ ] Início, Tratamento, Diário, Consultas, Minha evolução, Perfil, Meus dados, Documentos, Agendar consulta: abrir cada uma normalmente (sem erro) e confirmar que a tela continua igual a antes desta rodada.
- [ ] Provocar um erro de verdade (ex.: desligar o Wi-Fi com `USAR_MOCK = false`, ou renomear temporariamente um campo em `firestore.rules` pra recusar leitura) e conferir que aparece "Não foi possível carregar" com "Tentar novamente" — não uma lista vazia enganosa nem tela em branco.
- [ ] Início: puxar pra atualizar (pull-to-refresh) com um erro mostra o aviso no topo sem apagar os cards que já tinham carregado antes.
- [ ] Diário: marcar dose tomada/pulada e ajustar dose com um erro forçado mostra um alerta (`avisar`), não falha silenciosa.
- [ ] Agendar consulta: erro ao carregar profissionais mostra "Tentar novamente"; erro só nos horários do dia mostra o aviso na seção de horário, sem derrubar a tela inteira.

**Área clínica — telas com estado de erro novo** ⚠️
- [ ] Agenda do profissional, Ficha do paciente, Nova prescrição: mesma checagem de "sem mudar nada no caminho feliz" e "erro visível com erro forçado".

**`firestore.rules` (exige publicar antes)** ⚠️
- [ ] Logada como paciente: consegue ler/escrever as próprias consultas/registros/doses; não consegue escrever em `prescricoes`.
- [ ] Logada como profissional: consegue tudo nas 5 telas de gestão.
- [ ] Deslogada: qualquer leitura/escrita é recusada com a mensagem de permissão (não um erro cru do Firestore).

**O que eu não consegui verificar sem abrir o app:**
- Como cada tela de erro **parece de verdade** na tela (cores, espaçamento, se o `EstadoVazio` cabe bem no lugar onde entrou) — só confirmei que compila e passa no lint.
- Se `firestore.rules` de fato funciona como escrito — nunca rodou contra Firestore real nem emulador (ver "Pendências conhecidas").
- O fluxo completo de criar as 2 contas de teste pelo app + copiar o UID do Console, pedido no README.
- `npm run testar-firestore -- --confirmar` contra um Firestore de verdade (só rodei em modo mock, com um teste de mutação forçando uma falha no meio do ciclo).

## Antes do commit final

- [ ] `USAR_MOCK = true` em `src/services/config.js`.
- [ ] `npm run lint`, `npx expo export --platform web` e `npm run testar-mock` passando.
- [ ] Se for demonstrar com `USAR_MOCK = false`: ver "Checklist antes de trocar `USAR_MOCK` para `false`" no README (regras publicadas, índice publicado, contas de teste, seed rodado, `testar-firestore` passando).
