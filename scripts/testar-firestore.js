// Ciclo de CRUD (criar → listar → buscar → editar → excluir) contra o
// Firestore REAL, usando os mesmos serviços de src/services/ que as telas de
// gestão usam — nada de acesso direto ao banco. Não é um teste automatizado
// de CI: é uma checagem manual, para rodar de vez em quando contra o projeto
// de teste.
//
//   npm run testar-firestore -- --confirmar
//
// Sem --confirmar, o script não faz nenhuma leitura nem gravação — só explica
// o que faria. Isso é diferente do seed: aqui não há "ensaio" útil, porque o
// propósito inteiro é escrever dados de teste.
//
// --- Segurança: nunca toca em documentos que não criou nesta execução -----------
//
// O script cria seus próprios registros de referência (paciente, profissional,
// produto), todos com um marcador de teste (`MARCADOR = 'teste-crud-'`) nos
// campos legíveis (nome, e-mail, CID...), e SEMPRE os apaga ao final — inclusive
// se um passo no meio do caminho falhar (bloco try/finally).
//
// Só a coleção `registros_diarios` tem o marcador no próprio ID do documento
// (o modelo já usa um ID determinístico, `{paciente_id}_{data}`, então basta
// escolher um `paciente_id` que comece com o marcador). Nas outras 4 coleções
// o ID é gerado pelo Firestore (`addDoc`) e os serviços de src/services/ não
// aceitam um ID escolhido — não há como o script exigir um ID prefixado ali
// sem reimplementar o acesso ao banco, o que o pedido deste ajuste proíbe
// explicitamente. Em vez disso, a segurança vem de uma lista, em memória, de
// exatamente o que este script criou nesta execução: só esses IDs entram no
// `remover*`, nunca uma varredura por prefixo na coleção inteira.
//
// Se o processo for encerrado à força (não um erro comum, mas um kill -9 ou
// queda de energia) antes do `finally` rodar, os documentos de teste ficam
// para trás — reconhecíveis pelo marcador nos campos legíveis. Rodar o script
// de novo NÃO os apaga automaticamente (o script só apaga o que ELE MESMO
// criou); seria preciso apagar manualmente pelo Console, procurando o
// marcador.
//
// --- Autenticação -----------------------------------------------------------------
//
// Sob firestore.rules (ver README), a maioria das operações exige uma conta
// autenticada com `tipo: 'profissional'` ou `'atendente'` em `usuarios/{uid}`
// — é o mesmo modelo de permissão da área de gestão do app. Informe uma conta
// assim:
//   SEED_EMAIL=... SEED_SENHA=... npm run testar-firestore -- --confirmar
//   (PowerShell: $env:SEED_EMAIL='...'; $env:SEED_SENHA='...'; npm run ...)
// Sem login, espere erros de permissão — o script identifica esse caso e
// avisa claramente, em vez de só mostrar o erro cru do Firestore.

import { signInWithEmailAndPassword } from 'firebase/auth';

import { auth } from '../src/services/firebase';
import { firebaseConfig } from '../src/services/firebaseConfig';
import {
  atualizarConsulta,
  criarConsulta,
  listarConsultas,
  obterConsultaDoc,
  removerConsulta,
} from '../src/services/consultaService';
import {
  atualizarPrescricao,
  criarPrescricao,
  listarPrescricoes,
  obterPrescricaoDoc,
  removerPrescricao,
} from '../src/services/prescricaoService';
import {
  atualizarProduto,
  criarProduto,
  listarTodosProdutos,
  obterProdutoDoc,
  removerProduto,
} from '../src/services/produtoService';
import {
  atualizarRegistro,
  criarRegistro,
  listarRegistros,
  obterRegistro,
  removerRegistro,
} from '../src/services/registroService';
import {
  atualizarUsuario,
  criarUsuario,
  listarUsuarios,
  obterUsuarioDoc,
  removerUsuario,
} from '../src/services/usuarioService';

const MARCADOR = 'teste-crud-';
const confirmado = process.argv.includes('--confirmar');

if (!confirmado) {
  console.log(
    `Nada foi lido nem gravado.\n\nEste script cria e apaga dados de teste no Firestore do projeto ` +
      `"${firebaseConfig.projectId}". Rode com --confirmar para executar:\n\n` +
      '  npm run testar-firestore -- --confirmar\n'
  );
  process.exit(0);
}

// --- O que este script criou nesta execução — única fonte da verdade do cleanup ---

const criados = []; // [{ colecao, id, remover }], na ordem de criação

function registrar(colecao, id, remover) {
  criados.push({ colecao, id, remover });
  return id;
}

// Apaga um item já registrado DENTRO do próprio ciclo (o ciclo testa o
// "excluir" antes do fim do script) e o retira da lista de limpeza final —
// senão `limparTudo()` tentaria apagá-lo de novo no final e "falharia" num
// item que já não existe mais (não é um erro real, só rastreamento duplicado).
async function apagarAgora(colecao, id) {
  const indice = criados.findIndex((c) => c.colecao === colecao && c.id === id);
  if (indice === -1) throw new Error(`apagarAgora: ${colecao}/${id} não estava na lista de itens criados.`);
  const [item] = criados.splice(indice, 1);
  await item.remover(id);
}

async function limparTudo() {
  const porColecao = new Map();
  // Ordem inversa: quem referencia primeiro (registros/consultas/prescrições
  // antes de produto/usuários) — o Firestore não impõe integridade
  // referencial, mas evitar referência solta por um instante é mais limpo.
  for (const item of [...criados].reverse()) {
    const lista = porColecao.get(item.colecao) ?? { ok: 0, falha: 0 };
    try {
      await item.remover(item.id);
      lista.ok += 1;
    } catch (erro) {
      lista.falha += 1;
      console.log(`  aviso: não consegui apagar ${item.colecao}/${item.id}: ${erro.message}`);
    }
    porColecao.set(item.colecao, lista);
  }
  return porColecao;
}

// --- Erros de permissão: mensagem específica, nunca só o erro cru ----------------

const TEXTO_ERRO_PERMISSAO = 'Sem permissão para acessar o banco de dados';

function ehErroDePermissao(erro) {
  return String(erro?.message ?? '').includes(TEXTO_ERRO_PERMISSAO);
}

function explicarErro(erro) {
  if (ehErroDePermissao(erro)) {
    return (
      `${erro.message}\n` +
      '        → Isso é uma recusa das regras de segurança (firestore.rules), não um bug do app.\n' +
      '        → Confira: (1) as regras foram publicadas (firebase deploy --only firestore:rules);\n' +
      '        → (2) SEED_EMAIL/SEED_SENHA apontam para uma conta com tipo "profissional" ou\n' +
      '        →     "atendente" em usuarios/{uid} — é o que as regras exigem para gestão.'
    );
  }
  return erro.message;
}

// --- Resumo por coleção -------------------------------------------------------------

const resumo = []; // [{ colecao, ok, erro }]

async function rodarCiclo(colecao, corpo) {
  try {
    await corpo();
    resumo.push({ colecao, ok: true });
    console.log(`  ok    ${colecao}: criar → listar → buscar → editar → excluir`);
  } catch (erro) {
    resumo.push({ colecao, ok: false, erro });
    console.log(`  FALHA ${colecao}: ${explicarErro(erro)}`);
  }
}

// --- Execução -------------------------------------------------------------------------

console.log(`Projeto Firebase: ${firebaseConfig.projectId}\n`);

try {
  if (process.env.SEED_EMAIL && process.env.SEED_SENHA) {
    await signInWithEmailAndPassword(auth, process.env.SEED_EMAIL, process.env.SEED_SENHA);
    console.log(`Autenticado como ${process.env.SEED_EMAIL}.\n`);
  } else {
    console.log('Sem SEED_EMAIL/SEED_SENHA — rodando sem autenticação (as regras provavelmente vão recusar).\n');
  }

  // Referências que os outros ciclos usam. Só seguem adiante se estas duas
  // derem certo — sem paciente e profissional de teste, nada mais pode rodar.
  const idPaciente = registrar(
    'usuarios',
    (
      await criarUsuario({
        email: `${MARCADOR}paciente@exemplo.com`,
        telefone: '11900000000',
        tipo: 'paciente',
        ativo: true,
        paciente: {
          cpf: '00000000000',
          nome_completo: `${MARCADOR}Paciente`,
          data_nascimento: new Date(1990, 0, 1),
          sexo: 'Outro',
          endereco: {
            logradouro: 'Rua de Teste',
            numero: '1',
            complemento: '',
            bairro: 'Teste',
            cidade: 'Teste',
            uf: 'SP',
            cep: '00000000',
          },
        },
      })
    ).id,
    removerUsuario
  );

  const idProfissional = registrar(
    'usuarios',
    (
      await criarUsuario({
        email: `${MARCADOR}profissional@exemplo.com`,
        telefone: '11900000001',
        tipo: 'profissional',
        ativo: true,
        profissional: {
          nome_completo: `${MARCADOR}Profissional`,
          conselho: 'CRM',
          num_registro: '000000',
          uf_registro: 'SP',
          especialidade: 'Teste',
        },
      })
    ).id,
    removerUsuario
  );

  console.log('Referências de teste criadas (usuarios): paciente e profissional.\n');

  await rodarCiclo('usuarios', async () => {
    const { id } = await criarUsuario({
      email: `${MARCADOR}atendente@exemplo.com`,
      telefone: '11900000002',
      tipo: 'atendente',
      ativo: true,
      atendente: { nome_completo: `${MARCADOR}Atendente`, cargo: 'Teste' },
    });
    registrar('usuarios', id, removerUsuario);

    if (!(await listarUsuarios('atendente')).some((u) => u.id === id)) {
      throw new Error('o usuário criado não apareceu em listarUsuarios("atendente").');
    }
    const doc = await obterUsuarioDoc(id);
    if (doc.atendente.nome_completo !== `${MARCADOR}Atendente`) throw new Error('obterUsuarioDoc voltou dados diferentes do gravado.');

    await atualizarUsuario(id, { ...doc, atendente: { ...doc.atendente, cargo: 'Teste editado' } });
    const editado = await obterUsuarioDoc(id);
    if (editado.atendente.cargo !== 'Teste editado') throw new Error('a edição não foi gravada.');

    await apagarAgora('usuarios', id);
    let apagou = false;
    try {
      await obterUsuarioDoc(id);
    } catch {
      apagou = true;
    }
    if (!apagou) throw new Error('o usuário continuou existindo depois de removerUsuario.');
  });

  let idProduto;
  await rodarCiclo('produtos', async () => {
    const { id } = await criarProduto({
      nome: `${MARCADOR}Produto`,
      fabricante: 'Teste',
      teor_cbd: 1,
      teor_thc: 0,
      espectro: 'isolado',
      volume_ml: null,
      ativo: true,
    });
    idProduto = registrar('produtos', id, removerProduto);

    if (!(await listarTodosProdutos()).some((p) => p.id === id)) {
      throw new Error('o produto criado não apareceu em listarTodosProdutos().');
    }
    const doc = await obterProdutoDoc(id);
    if (doc.nome !== `${MARCADOR}Produto`) throw new Error('obterProdutoDoc voltou dados diferentes do gravado.');

    await atualizarProduto(id, { ...doc, nome: `${MARCADOR}Produto editado` });
    const editado = await obterProdutoDoc(id);
    if (editado.nome !== `${MARCADOR}Produto editado`) throw new Error('a edição não foi gravada.');
  });
  // O produto fica de pé (não apagado no ciclo) para o ciclo de prescrições
  // poder referenciá-lo — sai no `limparTudo()` do fim, como tudo o mais.

  await rodarCiclo('consultas', async () => {
    const { id } = await criarConsulta({
      paciente_id: idPaciente,
      profissional_id: idProfissional,
      data_hora: new Date(2020, 4, 5, 10, 0),
      modalidade: 'presencial',
      status: 'agendada',
      eh_retorno: false,
    });
    registrar('consultas', id, removerConsulta);

    if (!(await listarConsultas('agendada')).some((c) => c.id === id)) {
      throw new Error('a consulta criada não apareceu em listarConsultas("agendada").');
    }
    const doc = await obterConsultaDoc(id);
    if (doc.paciente_id !== idPaciente) throw new Error('obterConsultaDoc voltou dados diferentes do gravado.');

    await atualizarConsulta(id, { ...doc, status: 'confirmada' });
    const editada = await obterConsultaDoc(id);
    if (editada.status !== 'confirmada') throw new Error('a edição não foi gravada.');

    await apagarAgora('consultas', id);
    let apagou = false;
    try {
      await obterConsultaDoc(id);
    } catch {
      apagou = true;
    }
    if (!apagou) throw new Error('a consulta continuou existindo depois de removerConsulta.');
  });

  await rodarCiclo('registros_diarios', async () => {
    const dadosRegistro = {
      paciente_id: idPaciente,
      data: '2020-05-05',
      escala_sintoma: 3,
      efeitos_adversos: [],
      sem_efeitos_adversos: false,
      observacao: `${MARCADOR}observação`,
      humor: 'Bem',
      qualidade_sono: 'Boa',
    };
    const { id } = await criarRegistro(dadosRegistro);
    if (!id.startsWith(idPaciente)) throw new Error('o ID do registro não começa pelo paciente de teste — algo mudou no modelo.');
    registrar('registros_diarios', id, removerRegistro);

    if (!(await listarRegistros(idPaciente)).some((r) => r.id === id)) {
      throw new Error('o registro criado não apareceu em listarRegistros().');
    }
    const doc = await obterRegistro(id);
    if (doc.escala_sintoma !== 3) throw new Error('obterRegistro voltou dados diferentes do gravado.');

    await atualizarRegistro(id, { ...dadosRegistro, escala_sintoma: 9 });
    const editado = await obterRegistro(id);
    if (editado.escala_sintoma !== 9) throw new Error('a edição não foi gravada.');

    await apagarAgora('registros_diarios', id);
    let apagou = false;
    try {
      await obterRegistro(id);
    } catch {
      apagou = true;
    }
    if (!apagou) throw new Error('o registro continuou existindo depois de removerRegistro.');
  });

  await rodarCiclo('prescricoes', async () => {
    const item = {
      produto_id: idProduto,
      dose_inicial: 2,
      unidade_dose: 'gotas',
      via_administracao: 'Sublingual',
      horarios: ['08:00'],
      duracao_dias: 30,
      instrucoes_uso: '',
    };
    const base = {
      paciente_id: idPaciente,
      profissional_id: idProfissional,
      status: 'ativa',
      data_emissao: new Date(2020, 5, 1),
      data_validade: new Date(2021, 5, 1),
      tipo_receituario: 'Receituário de Controle Especial (Tipo B2)',
      justificativa_clinica: `${MARCADOR}justificativa`,
      cid: 'F41.1',
      sintoma_alvo: 'Ansiedade',
      itens: [item],
    };

    const { id } = await criarPrescricao(base);
    registrar('prescricoes', id, removerPrescricao);

    if (!(await listarPrescricoes(idPaciente)).some((p) => p.id === id)) {
      throw new Error('a prescrição criada não apareceu em listarPrescricoes().');
    }
    const doc = await obterPrescricaoDoc(id);
    if (doc.cid !== 'F41.1') throw new Error('obterPrescricaoDoc voltou dados diferentes do gravado.');

    await atualizarPrescricao(id, { ...base, cid: 'F41.2' });
    const editada = await obterPrescricaoDoc(id);
    if (editada.cid !== 'F41.2') throw new Error('a edição não foi gravada.');
    if (editada.status !== 'ativa') throw new Error('emitir completo deveria gravar status "ativa".');
    if (!(editada.data_emissao instanceof Date) || !(editada.data_validade instanceof Date)) {
      throw new Error('emitir completo deveria gravar data_emissao e data_validade.');
    }

    await apagarAgora('prescricoes', id);
    let apagou = false;
    try {
      await obterPrescricaoDoc(id);
    } catch {
      apagou = true;
    }
    if (!apagou) throw new Error('a prescrição continuou existindo depois de removerPrescricao.');
  });
} finally {
  console.log('\nLimpando os dados de teste criados nesta execução...');
  const porColecao = await limparTudo();
  for (const [colecao, { ok, falha }] of porColecao) {
    console.log(`  ${colecao}: ${ok} apagado(s)${falha ? `, ${falha} FALHA(S) — apague manualmente pelo Console` : ''}`);
  }
}

console.log('\nResumo:');
let falhas = 0;
for (const { colecao, ok, erro } of resumo) {
  console.log(`  ${ok ? 'ok   ' : 'FALHA'} ${colecao}${ok ? '' : ` — ${erro.message}`}`);
  if (!ok) falhas += 1;
}
console.log(`\n${resumo.length - falhas}/${resumo.length} ciclos de CRUD passaram.`);
process.exit(falhas ? 1 : 0);
