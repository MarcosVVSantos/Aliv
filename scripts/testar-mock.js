// Checagens do app no modo mock (sem Firebase, sem rede, sem Expo).
//
//   npm run testar-mock
//
// Roda os serviços e utilitários reais contra os mocks em memória. O
// carregador (scripts/carregador-mock.mjs, registrado via --import) força
// USAR_MOCK = true e resolve os imports sem extensão. As checagens rodam em
// ordem e compartilham o mesmo "banco" em memória.

process.env.TZ = 'America/Sao_Paulo'; // antes de qualquer Date: fixa o fuso independente da máquina.
//
// Um `import` estático no topo do arquivo seria hoisted e avaliado ANTES desta
// linha (é assim que ESM funciona — os imports rodam antes de qualquer outro
// código do módulo, não importa onde estejam escritos). Vários mocks calculam
// "hoje" no momento em que são importados (ex.: prescricoesMock, dosesMock),
// então usamos `import()` dinâmico abaixo para garantir que o fuso já esteja
// fixado quando eles carregarem.

const assert = (await import('node:assert/strict')).default;
const fs = await import('node:fs');
const path = await import('node:path');
const url = await import('node:url');

const { emitirPrescricao, cancelarPrescricao, obterPrescricaoDoc, salvarRascunhoPrescricao } = await import(
  '../src/services/prescricaoService'
);
const { COLECOES, listar, obter } = await import('../src/services/crudService');
const {
  listarDosesDoDia,
  marcarDosePulada,
  marcarDoseTomada,
  obterAdesaoSemana,
  obterRegistroDoDia,
  salvarRegistroDiario,
} = await import('../src/services/diarioService');
const { ID_CONSULTA_AJUSTE_DOSE, ID_CONSULTA_INICIO_TRATAMENTO, ID_CONSULTA_PRIMEIRA, ID_CONSULTA_PROXIMA, consultasMock } =
  await import('../src/services/mocks/consultas');
const {
  atualizarPrescricao,
  criarPrescricao,
  listarPrescricoes,
  removerPrescricao,
} = await import('../src/services/prescricaoService');
const { ID_PRESCRICAO_MOCK, prescricoesMock } = await import('../src/services/mocks/prescricoes');
const { PRODUTO_OLEO_CBD_200 } = await import('../src/services/mocks/produtos');
const { registrosMock } = await import('../src/services/mocks/registrosDiarios');
const {
  UID_PACIENTE_BEATRIZ: PACIENTE,
  UID_PROF_CAMILA: PROFISSIONAL,
  usuariosMock,
} = await import('../src/services/mocks/usuarios');
const {
  atualizarRegistro,
  criarRegistro,
  listarRegistros,
  obterRegistro,
  removerRegistro,
} = await import('../src/services/registroService');
const {
  atualizarConsulta,
  criarConsulta,
  listarConsultas,
  obterConsultaDoc,
  removerConsulta,
} = await import('../src/services/consultaService');
const {
  atualizarProduto,
  criarProduto,
  listarTodosProdutos,
  obterProdutoDoc,
  removerProduto,
} = await import('../src/services/produtoService');
const {
  atualizarUsuario,
  criarUsuario,
  listarUsuarios,
  obterUsuarioDoc,
  removerUsuario,
} = await import('../src/services/usuarioService');
const { rotulosDaAdesao } = await import('../src/utils/adesao');
const { situacaoAutorizacao } = await import('../src/utils/anvisa');
const { dataDeChave, dataLocalISO } = await import('../src/utils/data');
const { idDaDose, statusDaDose } = await import('../src/utils/dose');
const { nomeExibicaoProduto } = await import('../src/utils/produto');
const { situacaoPrescricao } = await import('../src/utils/prescricao');

const checagens = [];
const checar = (nome, corpo) => checagens.push({ nome, corpo });

const dias = (n, base = new Date()) => {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
};

function dadosDoRegistro(extra = {}) {
  return {
    paciente_id: PACIENTE,
    data: '2026-01-10',
    escala_sintoma: 6,
    efeitos_adversos: [],
    sem_efeitos_adversos: false,
    observacao: '',
    humor: 'Bem',
    qualidade_sono: 'Boa',
    ...extra,
  };
}

const registrosDoDia = async (data) => (await listarRegistros(PACIENTE)).filter((r) => r.data === data);
const consultaPorId = (id) => consultasMock.find((c) => c.id === id);

// --- 1. Datas locais ----------------------------------------------------------

checar('datas: 21:30 no horário local continua no mesmo dia', () => {
  assert.equal(dataLocalISO(new Date(2026, 8, 21, 21, 30)), '2026-09-21');
  assert.equal(dataLocalISO(new Date(2026, 8, 21, 23, 59, 59)), '2026-09-21');
  assert.equal(dataLocalISO(new Date(2026, 8, 21, 0, 0, 0)), '2026-09-21');
});

checar('datas: o bug existia — toISOString jogaria 21:30 (UTC−3) para o dia seguinte', () => {
  const noite = new Date(2026, 8, 21, 21, 30);
  assert.equal(noite.toISOString().slice(0, 10), '2026-09-22');
  assert.notEqual(dataLocalISO(noite), noite.toISOString().slice(0, 10));
});

checar('datas: dataDeChave valida o calendário e volta à meia-noite local (nunca new Date(string), que é UTC)', () => {
  assert.equal(dataDeChave('2026-02-30'), null);
  assert.equal(dataDeChave('21/09/2026'), null);
  const data = dataDeChave('2026-09-21');
  assert.deepEqual([data.getFullYear(), data.getMonth(), data.getDate(), data.getHours()], [2026, 8, 21, 0]);
});

checar('datas: ida e volta dataLocalISO(dataDeChave(x)) === x', () => {
  for (const chave of ['2026-01-01', '2026-09-21', '2026-12-31', '2026-02-28']) {
    assert.equal(dataLocalISO(dataDeChave(chave)), chave);
  }
  // A ida e volta continua igual mesmo partindo de uma hora "perigosa" (perto
  // da meia-noite, onde o fuso derruba um new Date(string) em UTC pro dia errado).
  const chave = '2026-09-21';
  assert.equal(dataLocalISO(dataDeChave(chave)), chave);
});

checar('datas: nenhum mock tem data literal de calendário (2024/2025/2026/2027)', () => {
  const raizMocks = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'src', 'services', 'mocks');
  const arquivos = fs.readdirSync(raizMocks).filter((f) => f.endsWith('.js'));
  const comData = [];
  for (const arquivo of arquivos) {
    const conteudo = fs.readFileSync(path.join(raizMocks, arquivo), 'utf8');
    // new Date(1985, 7, 14) é literal mas não "de calendário" (é a única data
    // de nascimento do mock, ver comentário em mocks/usuarios.js) — só barra
    // datas escritas como string 'AAAA-...' ou dentro de new Date('AAAA-...').
    if (/['"`]202[4-9]-/.test(conteudo)) comData.push(arquivo);
  }
  assert.deepEqual(comData, [], `arquivos com data literal: ${comData.join(', ')}`);
});

// --- 2. Prescrição --------------------------------------------------------------

checar('prescrição: ordem rascunho → cancelada → vencida → vence em breve → ativa', () => {
  const hoje = new Date(2026, 8, 21, 12);
  const passada = new Date(2026, 8, 20);
  const com = (status, validade) => ({ status, data_validade: validade });

  assert.equal(situacaoPrescricao(com('rascunho', passada), hoje), 'rascunho');
  assert.equal(situacaoPrescricao(com('cancelada', passada), hoje), 'cancelada');
  assert.equal(situacaoPrescricao(com('ativa', passada), hoje), 'vencida');
  assert.equal(situacaoPrescricao(com('ativa', new Date(2026, 9, 21)), hoje), 'vence_em_breve'); // +30 dias
  assert.equal(situacaoPrescricao(com('ativa', new Date(2026, 9, 22)), hoje), 'ativa'); //         +31 dias
  assert.equal(situacaoPrescricao(com('vencida', new Date(2027, 0, 1)), hoje), 'ativa'); // status legado é ignorado
});

checar('mock: receita emitida há ~11 meses vence em ~3 semanas (datas relativas a hoje)', () => {
  const [receita] = prescricoesMock;
  assert.equal(situacaoPrescricao(receita), 'vence_em_breve');
  const diasParaVencer = Math.round((receita.data_validade - new Date()) / 86_400_000);
  assert.ok(diasParaVencer >= 20 && diasParaVencer <= 22, `vence em ${diasParaVencer} dias`);
});

checar('produto: nome com concentração e volume', () => {
  const { nome, teor_cbd: teor, volume_ml: volume } = PRODUTO_OLEO_CBD_200;
  assert.equal(nomeExibicaoProduto(nome, teor, volume), 'Óleo CBD 200 mg/mL · 30 mL');
});

// --- 3. Mocks: linha do tempo e consulta futura (princípio 4) ---------------------

checar('mocks: cadastro < primeira consulta < início do tratamento < ajuste de dose < emissão da receita', () => {
  const cadastro = usuariosMock.find((u) => u.id === PACIENTE).data_cadastro;
  const primeira = consultaPorId(ID_CONSULTA_PRIMEIRA).data_hora;
  const inicioTratamento = consultaPorId(ID_CONSULTA_INICIO_TRATAMENTO).data_hora;
  const ajusteDose = consultaPorId(ID_CONSULTA_AJUSTE_DOSE).data_hora;
  const emissao = prescricoesMock[0].data_emissao;

  assert.ok(cadastro < primeira, 'cadastro deveria ser antes da primeira consulta');
  assert.ok(primeira < inicioTratamento, 'primeira consulta deveria ser antes do início do tratamento');
  assert.ok(inicioTratamento < ajusteDose, 'início do tratamento deveria ser antes do ajuste de dose');
  assert.ok(ajusteDose < emissao, 'ajuste de dose deveria ser antes da emissão da receita atual');
});

checar('mocks: a próxima consulta é hoje + 3 dias às 14:30 e está no futuro', () => {
  const proxima = consultaPorId(ID_CONSULTA_PROXIMA);
  assert.equal(proxima.status, 'agendada');
  assert.ok(proxima.data_hora > new Date(), 'a próxima consulta deveria estar no futuro');
  assert.equal(dataLocalISO(proxima.data_hora), dataLocalISO(dias(3)));
  assert.deepEqual([proxima.data_hora.getHours(), proxima.data_hora.getMinutes()], [14, 30]);
});

// --- 4. Autorização Anvisa (calculada, nunca gravada) -----------------------------

checar('anvisa: situacaoAutorizacao calcula vencida / vence_em_breve / vigente pela validade', () => {
  const hoje = new Date(2026, 8, 21);
  const comValidade = (validade) => ({ data_validade: validade });

  assert.equal(situacaoAutorizacao(comValidade(new Date(2026, 8, 20)), hoje), 'vencida');
  assert.equal(situacaoAutorizacao(comValidade(new Date(2026, 9, 21)), hoje), 'vence_em_breve'); // +30 dias
  assert.equal(situacaoAutorizacao(comValidade(new Date(2026, 9, 22)), hoje), 'vigente'); //        +31 dias
});

checar('anvisa: um valor desconhecido (ex.: "suspensa") prevalece e não é recalculado', () => {
  const hoje = new Date(2026, 8, 21);
  // Data de validade no futuro, mas o valor gravado continua valendo — a
  // função não precisa conhecer a lista de decisões manuais possíveis, só a
  // lista do que ela mesma calcula (SITUACOES_CALCULADAS).
  const autorizacao = { situacao: 'suspensa', data_validade: new Date(2030, 0, 1) };
  assert.equal(situacaoAutorizacao(autorizacao, hoje), 'suspensa');

  const outraDecisao = { situacao: 'indeferida', data_validade: null };
  assert.equal(situacaoAutorizacao(outraDecisao, hoje), 'indeferida');
});

checar('anvisa: um valor gravado igual a um dos calculados é ignorado e recalculado', () => {
  const hoje = new Date(2026, 8, 21);
  // 'vigente' está em SITUACOES_CALCULADAS — mesmo gravado, não prevalece: a
  // validade já passou, então o valor correto agora é 'vencida'.
  const autorizacao = { situacao: 'vigente', data_validade: new Date(2026, 8, 20) };
  assert.equal(situacaoAutorizacao(autorizacao, hoje), 'vencida');
});

checar('anvisa: sem data de validade e sem valor manual, retorna "sem_validade" (nunca "vencida")', () => {
  const hoje = new Date(2026, 8, 21);
  assert.equal(situacaoAutorizacao({}, hoje), 'sem_validade');
  assert.equal(situacaoAutorizacao({ data_validade: null }, hoje), 'sem_validade');
});

checar('anvisa: mock da paciente tem uma autorização vencida e outra vigente, sem `situacao` gravada', () => {
  const [autorizacaoAntiga, autorizacaoAtual] = usuariosMock.find((u) => u.id === PACIENTE).paciente.autorizacoes_anvisa;
  assert.equal(autorizacaoAntiga.situacao, undefined);
  assert.equal(autorizacaoAtual.situacao, undefined);
  assert.equal(situacaoAutorizacao(autorizacaoAntiga), 'vencida');
  assert.equal(situacaoAutorizacao(autorizacaoAtual), 'vigente');
});

// --- 5. Doses ---------------------------------------------------------------------

checar('dose: status calculado com 2 h de tolerância', () => {
  const data = '2026-09-21';
  const as = (h, m) => new Date(2026, 8, 21, h, m);
  assert.equal(statusDaDose(undefined, data, '20:00', as(21, 59)), 'pendente');
  assert.equal(statusDaDose(undefined, data, '20:00', as(22, 1)), 'perdida');
  assert.equal(statusDaDose({ status: 'tomada' }, data, '20:00', as(23, 0)), 'tomada');
  assert.equal(statusDaDose({ status: 'pulada' }, data, '20:00', as(19, 0)), 'perdida');
});

checar('dose: ID fixo {paciente}_{data}_{HHmm}_{produto}', () => {
  assert.equal(idDaDose('p1', '2026-09-21', '20:00', 'prod'), 'p1_2026-09-21_2000_prod');
});

checar('dose: marcar duas vezes não duplica e a pulada aparece como perdida', async () => {
  const data = '2026-01-15'; // dia fixo fora da janela dos mocks
  const args = [PACIENTE, ID_PRESCRICAO_MOCK, PRODUTO_OLEO_CBD_200.id, data];

  await marcarDoseTomada(...args, '08:00');
  await marcarDoseTomada(...args, '08:00');
  await marcarDosePulada(...args, '20:00');

  const docs = await listar(COLECOES.doses, { filtros: [['paciente_id', '==', PACIENTE], ['data', '==', data]] });
  assert.equal(docs.length, 2, 'um documento por dose, sem duplicata');

  const doDia = await listarDosesDoDia(PACIENTE, data);
  assert.deepEqual(doDia.map((d) => [d.horario, d.status]), [['08:00', 'tomada'], ['20:00', 'perdida']]);
});

checar('dose: às 21:30 o dia gravado é o local (dose das 20:00 não vai para amanhã)', async () => {
  const data = dataLocalISO(new Date(2026, 0, 16, 21, 30));
  assert.equal(data, '2026-01-16');
  await marcarDoseTomada(PACIENTE, ID_PRESCRICAO_MOCK, PRODUTO_OLEO_CBD_200.id, data, '20:00');
  const doc = await obter(COLECOES.doses, idDaDose(PACIENTE, '2026-01-16', '20:00', PRODUTO_OLEO_CBD_200.id));
  assert.equal(doc.data, '2026-01-16');
  assert.equal(await obter(COLECOES.doses, idDaDose(PACIENTE, '2026-01-17', '20:00', PRODUTO_OLEO_CBD_200.id)), null);
});

// --- 6. Adesão ----------------------------------------------------------------------

checar('adesão: últimos 7 dias terminando hoje, denominador 2 × 7 = 14', async () => {
  const adesao = await obterAdesaoSemana(PACIENTE);
  assert.equal(adesao.dias.length, 7);
  assert.equal(adesao.dias.at(-1).data, dataLocalISO(new Date()));
  assert.equal(adesao.dias[0].data, dataLocalISO(dias(-6)));
  assert.equal(adesao.previstas, 14);
  assert.equal(adesao.tomadas, 10); // D-6…D-1 do mock: 2+2+1+2+1+2, hoje ainda sem doses
});

checar('adesão: com hoje = segunda, o 1º rótulo é T e o último é "hoje"', async () => {
  const segunda = new Date(2026, 8, 21, 12);
  assert.equal(segunda.getDay(), 1);
  const { dias: semana } = await obterAdesaoSemana(PACIENTE, segunda);
  const rotulos = rotulosDaAdesao(semana);
  assert.equal(rotulos[0], 'T'); // terça da semana anterior
  assert.equal(rotulos.at(-1), 'hoje');
  assert.deepEqual(rotulos, ['T', 'Q', 'Q', 'S', 'S', 'D', 'hoje']);
});

// --- 7. Registros diários ----------------------------------------------------------

checar('registro: os três estados de efeitos adversos', async () => {
  await salvarRegistroDiario(PACIENTE, { escalaSintoma: 4, semEfeitosAdversos: true });
  let hoje = await obterRegistroDoDia(PACIENTE);
  assert.deepEqual([hoje.semEfeitosAdversos, hoje.efeitosAdversos], [true, []]); // "Nenhum"

  await salvarRegistroDiario(PACIENTE, { escalaSintoma: 4, efeitosAdversos: ['Tontura'] });
  hoje = await obterRegistroDoDia(PACIENTE);
  assert.deepEqual([hoje.semEfeitosAdversos, hoje.efeitosAdversos], [false, ['Tontura']]); // relatou

  await salvarRegistroDiario(PACIENTE, { escalaSintoma: 4 });
  hoje = await obterRegistroDoDia(PACIENTE);
  assert.deepEqual([hoje.semEfeitosAdversos, hoje.efeitosAdversos], [false, []]); // não preenchido

  assert.equal((await registrosDoDia(dataLocalISO(new Date()))).length, 1, 'um registro por dia');
});

checar('registro: "Nenhum" junto com efeitos é recusado', async () => {
  await assert.rejects(
    criarRegistro(dadosDoRegistro({ sem_efeitos_adversos: true, efeitos_adversos: [{ descricao: 'Tontura' }] })),
    /Nenhum efeito adverso/
  );
});

checar('registro antigo: `data` como Timestamp/Date aparece na lista normalizada', async () => {
  registrosMock.push({
    id: 'registro-antigo-1', // ID automático do modelo antigo
    paciente_id: PACIENTE,
    paciente_nome: 'Beatriz Santos',
    data: new Date(2026, 0, 10), // Timestamp já convertido pelo crudService
    escala_sintoma: 5,
    efeitos_adversos: [],
    observacao: 'registro do modelo antigo',
    humor: '',
    qualidade_sono: '',
  });

  const [antigo] = await registrosDoDia('2026-01-10');
  assert.equal(antigo.id, 'registro-antigo-1');
  assert.equal(antigo.data, '2026-01-10');
  assert.equal(antigo.sem_efeitos_adversos, false);
  assert.equal((await obterRegistroDoDia(PACIENTE, '2026-01-10')).id, 'registro-antigo-1');
});

checar('registro antigo: depois de editado, existe um único documento para o dia', async () => {
  await atualizarRegistro('registro-antigo-1', dadosDoRegistro({ escala_sintoma: 7 }));

  const doDia = await registrosDoDia('2026-01-10');
  assert.equal(doDia.length, 1);
  assert.equal(doDia[0].id, `${PACIENTE}_2026-01-10`);
  assert.equal(doDia[0].escala_sintoma, 7);
  assert.equal(await obter(COLECOES.registros, 'registro-antigo-1'), null);
});

checar('registro antigo: salvar o mesmo dia de novo também não deixa duplicata', async () => {
  registrosMock.push({
    id: 'registro-antigo-2',
    paciente_id: PACIENTE,
    data: new Date(2026, 0, 11),
    escala_sintoma: 5,
    efeitos_adversos: [],
    observacao: '',
    humor: '',
    qualidade_sono: '',
  });

  await criarRegistro(dadosDoRegistro({ data: '2026-01-11', escala_sintoma: 8 }));

  const doDia = await registrosDoDia('2026-01-11');
  assert.equal(doDia.length, 1);
  assert.equal(doDia[0].id, `${PACIENTE}_2026-01-11`);
  assert.equal(doDia[0].escala_sintoma, 8);
});

// --- 8. Fluxo de prescrição (por último: cria uma receita para o paciente) --------

const itemCompleto = {
  produtoId: PRODUTO_OLEO_CBD_200.id,
  doseInicial: 1,
  unidadeDose: 'gotas',
  viaAdministracao: 'Sublingual',
  horarios: ['08:00'],
  duracaoDias: 30,
  instrucoesUso: '',
};

checar('prescrição: rascunho exige só paciente e profissional; emitir exige CID, justificativa e horários', async () => {
  await assert.rejects(salvarRascunhoPrescricao({ pacienteId: PACIENTE }), /profissional/);

  const { id } = await salvarRascunhoPrescricao({ pacienteId: PACIENTE, profissionalId: PROFISSIONAL });
  const rascunho = await obterPrescricaoDoc(id);
  assert.deepEqual([rascunho.status, rascunho.data_emissao, rascunho.data_validade], ['rascunho', null, null]);

  await assert.rejects(emitirPrescricao(id), /CID/);
  const base = { id, pacienteId: PACIENTE, profissionalId: PROFISSIONAL };
  await assert.rejects(emitirPrescricao({ ...base, cid: 'F41.1', itens: [itemCompleto] }), /justificativa/);
  await assert.rejects(
    emitirPrescricao({ ...base, cid: 'F41.1', justificativa: 'Refratária a terapias prévias.', itens: [{ ...itemCompleto, horarios: [] }] }),
    /horário/
  );

  await emitirPrescricao({ ...base, cid: 'F41.1', justificativa: 'Refratária a terapias prévias.', itens: [itemCompleto] });
  const emitida = await obterPrescricaoDoc(id);
  assert.equal(emitida.status, 'ativa');
  assert.equal(emitida.cid, 'F41.1');
  assert.ok(emitida.data_emissao instanceof Date && emitida.data_validade > emitida.data_emissao);
  assert.deepEqual(emitida.itens[0].horarios, ['08:00']);

  await cancelarPrescricao(id);
  const cancelada = await obterPrescricaoDoc(id); // o documento continua existindo
  assert.equal(cancelada.status, 'cancelada');
  assert.equal(cancelada.cid, 'F41.1');
});

// --- 9. CRUD (admin) — ciclo completo nas 5 coleções --------------------------------
//
// criar → listar → buscar por id → editar → excluir, usando as mesmas funções
// de src/services/ que as telas de gestão usam (usuarioService, consultaService,
// prescricaoService, produtoService, registroService) — nunca acesso direto ao
// crudService/Firestore.

checar('CRUD usuarios: criar → listar → buscar → editar → excluir', async () => {
  const { id } = await criarUsuario({
    email: 'crud-teste@exemplo.com',
    telefone: '11999990000',
    tipo: 'atendente',
    ativo: true,
    atendente: { nome_completo: 'Ciclo CRUD Teste', cargo: 'Recepção' },
  });

  assert.ok((await listarUsuarios('atendente')).some((u) => u.id === id));

  const doc = await obterUsuarioDoc(id);
  assert.equal(doc.atendente.nome_completo, 'Ciclo CRUD Teste');

  await atualizarUsuario(id, {
    email: doc.email,
    telefone: doc.telefone,
    ativo: true,
    atendente: { nome_completo: 'Ciclo CRUD Editado', cargo: 'Financeiro' },
  });
  const editado = await obterUsuarioDoc(id);
  assert.equal(editado.atendente.nome_completo, 'Ciclo CRUD Editado');
  assert.equal(editado.atendente.cargo, 'Financeiro');

  await removerUsuario(id);
  await assert.rejects(obterUsuarioDoc(id), /não encontrado/i);
  assert.ok(!(await listarUsuarios('atendente')).some((u) => u.id === id));
});

checar('CRUD consultas: criar → listar → buscar → editar → excluir', async () => {
  const dataHora = new Date(2020, 4, 5, 10, 0); // data isolada, fora da janela de qualquer outro teste
  const { id } = await criarConsulta({
    paciente_id: PACIENTE,
    profissional_id: PROFISSIONAL,
    data_hora: dataHora,
    modalidade: 'presencial',
    status: 'agendada',
    eh_retorno: false,
  });

  assert.ok((await listarConsultas('agendada')).some((c) => c.id === id));

  const doc = await obterConsultaDoc(id);
  assert.equal(doc.paciente_nome, 'Beatriz Santos');
  assert.equal(doc.profissional_nome, 'Dra. Camila Rocha');

  await atualizarConsulta(id, { ...doc, status: 'confirmada' });
  const editada = await obterConsultaDoc(id);
  assert.equal(editada.status, 'confirmada');

  await removerConsulta(id);
  await assert.rejects(obterConsultaDoc(id), /não encontrada/i);
});

checar('CRUD produtos: criar → listar → buscar → editar → excluir', async () => {
  const { id } = await criarProduto({
    nome: 'Produto Ciclo CRUD',
    fabricante: 'Fabricante Teste',
    teor_cbd: 10,
    teor_thc: 0.1,
    espectro: 'isolado',
    volume_ml: null,
    ativo: true,
  });

  assert.ok((await listarTodosProdutos()).some((p) => p.id === id));

  const doc = await obterProdutoDoc(id);
  assert.equal(doc.nome, 'Produto Ciclo CRUD');

  await atualizarProduto(id, { ...doc, nome: 'Produto Ciclo CRUD Editado' });
  const editado = await obterProdutoDoc(id);
  assert.equal(editado.nome, 'Produto Ciclo CRUD Editado');

  await removerProduto(id);
  await assert.rejects(obterProdutoDoc(id), /não encontrado/i);
});

checar('CRUD registros: criar → listar → buscar → editar → excluir', async () => {
  const dados = dadosDoRegistro({ data: '2020-05-05', escala_sintoma: 3 });
  const { id } = await criarRegistro(dados);
  assert.equal(id, `${PACIENTE}_2020-05-05`); // ID do modelo: {paciente}_{data}

  assert.ok((await listarRegistros(PACIENTE)).some((r) => r.id === id));

  const doc = await obterRegistro(id);
  assert.equal(doc.escala_sintoma, 3);

  await atualizarRegistro(id, { ...dados, escala_sintoma: 9 });
  const editado = await obterRegistro(id);
  assert.equal(editado.escala_sintoma, 9);

  await removerRegistro(id);
  await assert.rejects(obterRegistro(id), /não encontrado/i);
});

checar('CRUD prescrições: criar → listar → buscar → editar → excluir', async () => {
  const item = {
    produto_id: PRODUTO_OLEO_CBD_200.id,
    dose_inicial: 2,
    unidade_dose: 'gotas',
    via_administracao: 'Sublingual',
    horarios: ['08:00'],
    duracao_dias: 30,
    instrucoes_uso: '',
  };
  const base = {
    paciente_id: PACIENTE,
    profissional_id: PROFISSIONAL,
    status: 'ativa',
    data_emissao: new Date(2020, 5, 1),
    data_validade: new Date(2021, 5, 1),
    tipo_receituario: 'Receituário de Controle Especial (Tipo B2)',
    justificativa_clinica: 'Alternativas prévias sem sucesso.',
    cid: 'F41.1',
    sintoma_alvo: 'Ansiedade',
    itens: [item],
  };

  const { id } = await criarPrescricao(base);

  assert.ok((await listarPrescricoes(PACIENTE)).some((p) => p.id === id));

  const doc = await obterPrescricaoDoc(id);
  assert.equal(doc.cid, 'F41.1');

  await atualizarPrescricao(id, { ...base, cid: 'F41.2' });
  const editada = await obterPrescricaoDoc(id);
  assert.equal(editada.cid, 'F41.2');

  await removerPrescricao(id);
  await assert.rejects(obterPrescricaoDoc(id), /não encontrada/i);
});

// --- 10. Casos específicos do CRUD ---------------------------------------------------

checar('registros: salvar duas vezes o mesmo paciente e a mesma data gera UM documento', async () => {
  const data = '2020-06-06'; // data isolada
  const { id: id1 } = await criarRegistro(dadosDoRegistro({ data, escala_sintoma: 4 }));
  const { id: id2 } = await criarRegistro(dadosDoRegistro({ data, escala_sintoma: 8 }));

  assert.equal(id1, id2, 'as duas gravações deveriam usar o mesmo ID (criarComIdRemovendo)');
  const doDia = await registrosDoDia(data);
  assert.equal(doDia.length, 1, 'só pode existir um documento para o dia');
  assert.equal(doDia[0].escala_sintoma, 8, 'a segunda gravação prevalece');

  await removerRegistro(id1);
});

checar('prescrições (CRUD admin): rascunho sem CID salva; emitir incompleto falha com erro claro', async () => {
  // Rascunho: só paciente e profissional são exigidos — sem CID, sem itens.
  const { id } = await criarPrescricao({
    paciente_id: PACIENTE,
    profissional_id: PROFISSIONAL,
    status: 'rascunho',
    data_emissao: null,
    data_validade: null,
    tipo_receituario: '',
    justificativa_clinica: '',
    cid: null,
    sintoma_alvo: '',
    itens: [],
  });
  const rascunho = await obterPrescricaoDoc(id);
  assert.equal(rascunho.status, 'rascunho');
  assert.equal(rascunho.cid, null);

  const baseAtiva = {
    paciente_id: PACIENTE,
    profissional_id: PROFISSIONAL,
    status: 'ativa',
    tipo_receituario: 'Receituário de Controle Especial (Tipo B2)',
    sintoma_alvo: 'Ansiedade',
  };

  // Sem data de emissão/validade.
  await assert.rejects(
    atualizarPrescricao(id, { ...baseAtiva, data_emissao: null, data_validade: null, cid: '', justificativa_clinica: '', itens: [] }),
    /emissão/
  );

  const comDatas = { ...baseAtiva, data_emissao: new Date(2020, 6, 1), data_validade: new Date(2021, 6, 1) };

  // Sem CID.
  await assert.rejects(atualizarPrescricao(id, { ...comDatas, cid: '', justificativa_clinica: '', itens: [] }), /CID/);

  // Sem justificativa clínica.
  await assert.rejects(
    atualizarPrescricao(id, { ...comDatas, cid: 'F41.1', justificativa_clinica: '', itens: [] }),
    /justificativa/i
  );

  // Sem itens.
  await assert.rejects(
    atualizarPrescricao(id, {
      ...comDatas,
      cid: 'F41.1',
      justificativa_clinica: 'Alternativas prévias sem sucesso.',
      itens: [],
    }),
    /pelo menos um item/
  );

  // Item sem horário.
  await assert.rejects(
    atualizarPrescricao(id, {
      ...comDatas,
      cid: 'F41.1',
      justificativa_clinica: 'Alternativas prévias sem sucesso.',
      itens: [
        {
          produto_id: PRODUTO_OLEO_CBD_200.id,
          dose_inicial: 2,
          unidade_dose: 'gotas',
          via_administracao: 'Sublingual',
          horarios: [],
          duracao_dias: 30,
          instrucoes_uso: '',
        },
      ],
    }),
    /horário/
  );

  // Emissão completa: grava data_emissao, data_validade e status 'ativa'.
  await atualizarPrescricao(id, {
    ...comDatas,
    cid: 'F41.1',
    justificativa_clinica: 'Alternativas prévias sem sucesso.',
    itens: [
      {
        produto_id: PRODUTO_OLEO_CBD_200.id,
        dose_inicial: 2,
        unidade_dose: 'gotas',
        via_administracao: 'Sublingual',
        horarios: ['08:00'],
        duracao_dias: 30,
        instrucoes_uso: '',
      },
    ],
  });
  const emitida = await obterPrescricaoDoc(id);
  assert.equal(emitida.status, 'ativa');
  assert.equal(emitida.data_emissao.getTime(), comDatas.data_emissao.getTime());
  assert.equal(emitida.data_validade.getTime(), comDatas.data_validade.getTime());

  await removerPrescricao(id);
});

checar('excluir um documento não afeta os outros', async () => {
  const a = await criarProduto({
    nome: 'Produto A — excluir',
    fabricante: '',
    teor_cbd: 1,
    teor_thc: 0,
    espectro: 'isolado',
    volume_ml: null,
    ativo: true,
  });
  const b = await criarProduto({
    nome: 'Produto B — manter',
    fabricante: '',
    teor_cbd: 2,
    teor_thc: 0,
    espectro: 'isolado',
    volume_ml: null,
    ativo: true,
  });

  await removerProduto(a.id);

  await assert.rejects(obterProdutoDoc(a.id), /não encontrado/i);
  const mantido = await obterProdutoDoc(b.id);
  assert.equal(mantido.nome, 'Produto B — manter');

  await removerProduto(b.id); // limpeza
});

// --- Execução -------------------------------------------------------------------------

let falhas = 0;
for (const { nome, corpo } of checagens) {
  try {
    await corpo();
    console.log(`  ok    ${nome}`);
  } catch (erro) {
    falhas += 1;
    console.log(`  FALHA ${nome}\n        ${String(erro.message).split('\n').join('\n        ')}`);
  }
}

console.log(`\n${checagens.length - falhas}/${checagens.length} checagens passaram.`);
process.exit(falhas ? 1 : 0);
