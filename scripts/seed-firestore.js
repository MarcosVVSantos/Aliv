// Recria os dados de teste no Firestore.
//
//   npm run seed-firestore                       → só mostra o que faria (não altera nada)
//   npm run seed-firestore -- --confirmar        → grava e recria de verdade
//
// NUNCA apaga documentos de `usuarios` — só grava (`setDoc` com `{ merge:
// true }`) nos IDs de scripts/seed-uids.json (paciente e profissional
// principal) mais os profissionais sem login (IDs fixos, abaixo). Assim o
// seed nunca derruba o perfil de quem já se cadastrou pelo app, nem deixa
// alguém sem perfil (`usuarios/{uid}`) depois de logar de verdade.
//
// As demais coleções (consultas, prescricoes, registros_diarios, doses) são
// apagadas e recriadas, mas só os documentos ligados aos IDs do seed — nunca
// a coleção inteira. `produtos` é catálogo (não pertence a nenhum usuário):
// só os 3 IDs que este script conhece são recriados.
//
// Antes de rodar, copie scripts/seed-uids.example.json para
// scripts/seed-uids.json (ignorado pelo git — nunca leva UIDs reais pro
// repositório) e preencha com os UIDs REAIS do Firebase Authentication da
// paciente e da profissional de teste (crie as contas pelo app — cadastro /
// login — e copie o UID no Console do Firebase, ver README.md). Sem isso o
// script para, sem ler nem gravar nada: com USAR_MOCK = false o app busca o
// perfil em `usuarios/{uid}` pelo UID que o Firebase Auth devolve no login, e
// um UID inventado nunca bate com esse.
//
// Se as regras do Firestore exigem login para escrever, informe uma conta:
//   SEED_EMAIL=... SEED_SENHA=... npm run seed-firestore -- --confirmar
//   (PowerShell: $env:SEED_EMAIL='...'; $env:SEED_SENHA='...'; npm run ...)
//
// Reaproveita as fábricas de src/services/mocks/ (mesma história, sempre
// relativa a "hoje") e o crudService (mesmas conversões de Date → Timestamp e
// de ids → Reference que o app usa). Este script é a única exceção à regra
// "só src/services importa firebase/*" — ela vale para app/ e src/, não para
// scripts/ (ver CONTEXTO.md).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import { COLECOES, atualizar, criarComId, limparParaFirestore, listar, remover } from '../src/services/crudService';
import { USAR_MOCK } from '../src/services/config';
import { auth, db } from '../src/services/firebase';
import { firebaseConfig } from '../src/services/firebaseConfig';
import { criarConsultasMock } from '../src/services/mocks/consultas';
import { gerarDosesMock } from '../src/services/mocks/doses';
import { criarPrescricoesMock } from '../src/services/mocks/prescricoes';
import { produtosMock } from '../src/services/mocks/produtos';
import { gerarRegistrosDiariosMock } from '../src/services/mocks/registrosDiarios';
import { criarUsuariosMock } from '../src/services/mocks/usuarios';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const confirmado = process.argv.includes('--confirmar');

// --- 1. UIDs do seed: valida ANTES de ler ou gravar qualquer coisa --------------

function lerSeedUids() {
  const caminho = path.join(RAIZ, 'scripts', 'seed-uids.json');
  let bruto;
  try {
    bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  } catch (erro) {
    if (erro.code === 'ENOENT') {
      throw new Error(
        'scripts/seed-uids.json não existe (ele é ignorado pelo git, de propósito — nunca leva UIDs reais pro ' +
          'repositório).\n  Copie scripts/seed-uids.example.json para scripts/seed-uids.json e preencha os dois UIDs.'
      );
    }
    throw new Error(`não consegui ler scripts/seed-uids.json: ${erro.message}`);
  }

  const faltando = ['paciente', 'profissional'].filter((chave) => !String(bruto[chave] ?? '').trim());
  if (faltando.length > 0) {
    throw new Error(
      `scripts/seed-uids.json está sem o UID de: ${faltando.join(', ')}.\n` +
        '  Preencha com os UIDs reais do Firebase Authentication antes de rodar o seed (ver README.md, ' +
        '"Recriar os dados do Firestore").'
    );
  }

  return { paciente: bruto.paciente.trim(), profissional: bruto.profissional.trim() };
}

let seedUids;
try {
  seedUids = lerSeedUids();
} catch (erro) {
  console.error(`\nErro: ${erro.message}\n`);
  process.exit(1);
}

// Profissionais e atendente sem login (Dr. Rafael, Dra. Julia, Larissa) não
// precisam de UID do Firebase Auth — IDs fixos bastam.
const IDS_SEED = {
  paciente: seedUids.paciente,
  profissionalCamila: seedUids.profissional,
  profissionalRafael: 'seed-rafael',
  profissionalJulia: 'seed-julia',
  atendente: 'seed-atendente-larissa',
};
const IDS_CONHECIDOS = new Set(Object.values(IDS_SEED));

// --- 2. Dados a gravar: mesmas fábricas dos mocks, com os IDs do seed -----------

const usuariosSeed = criarUsuariosMock(IDS_SEED);
const consultasSeed = criarConsultasMock(IDS_SEED);
const prescricoesSeed = criarPrescricoesMock(IDS_SEED);
const registrosSeed = gerarRegistrosDiariosMock(IDS_SEED.paciente);
const dosesSeed = gerarDosesMock(IDS_SEED.paciente);

// --- 3. Execução -----------------------------------------------------------------

console.log(`Projeto Firebase: ${firebaseConfig.projectId}${USAR_MOCK ? ' (modo mock, em memória)' : ''}`);
console.log(`  paciente:              ${IDS_SEED.paciente}`);
console.log(`  profissional (Camila): ${IDS_SEED.profissionalCamila}`);

if (process.env.SEED_EMAIL && process.env.SEED_SENHA && !USAR_MOCK) {
  await signInWithEmailAndPassword(auth, process.env.SEED_EMAIL, process.env.SEED_SENHA);
  console.log(`Autenticado como ${process.env.SEED_EMAIL}.`);
}

// usuarios: nunca apaga, só grava (merge) nos 5 IDs conhecidos.
async function gravarUsuarioComMerge(id, dados) {
  if (USAR_MOCK) {
    // Sem Firestore de verdade: aproxima o merge com um upsert no mock em
    // memória (o crudService só faz merge raso — troca `paciente`/
    // `profissional`/`atendente` por inteiro, não campo a campo). Serve para
    // testar a lógica deste script; o `seed-firestore` do package.json
    // sempre roda contra o Firestore real, nunca este caminho.
    const existe = (await listar(COLECOES.usuarios)).some((u) => u.id === id);
    if (existe) await atualizar(COLECOES.usuarios, id, dados);
    else await criarComId(COLECOES.usuarios, id, dados);
    return;
  }
  await setDoc(doc(db, COLECOES.usuarios, id), limparParaFirestore(dados), { merge: true });
}

console.log(
  `\nusuarios: NUNCA apagados. Grava (merge) ${usuariosSeed.length} documento(s): ` +
    usuariosSeed.map((u) => u.id).join(', ')
);
if (confirmado) {
  for (const { id, ...dados } of usuariosSeed) await gravarUsuarioComMerge(id, dados);
}

// Um documento pertence ao seed se referencia um dos 5 IDs conhecidos.
function ligadoAoSeed(documento) {
  return IDS_CONHECIDOS.has(documento.paciente_id) || IDS_CONHECIDOS.has(documento.profissional_id);
}

// [coleção, documentos novos, filtro do que apagar]. `produtos` é catálogo
// (não pertence a paciente/profissional nenhum): o filtro é só "está entre os
// IDs que este script grava", nunca a coleção inteira.
const idsProdutosSeed = new Set(produtosMock.map((p) => p.id));
const PLANO_RECRIAVEL = [
  [COLECOES.produtos, produtosMock, (p) => idsProdutosSeed.has(p.id)],
  [COLECOES.consultas, consultasSeed, ligadoAoSeed],
  [COLECOES.prescricoes, prescricoesSeed, ligadoAoSeed],
  [COLECOES.registros, registrosSeed, ligadoAoSeed],
  [COLECOES.doses, dosesSeed, ligadoAoSeed],
];

console.log('');
for (const [colecao, novos, ehDoSeed] of PLANO_RECRIAVEL) {
  const existentes = await listar(colecao);
  const doSeed = existentes.filter(ehDoSeed);
  console.log(`${colecao}: ${doSeed.length} documento(s) a apagar, ${novos.length} a gravar.`);
  if (!confirmado) continue;

  for (const { id } of doSeed) await remover(colecao, id);
  for (const { id, ...dados } of novos) await criarComId(colecao, id, dados);
}

console.log(
  confirmado
    ? '\nPronto. usuarios recebeu merge; as demais coleções foram recriadas para os IDs do seed.'
    : '\nNada foi alterado. Rode de novo com --confirmar para gravar.'
);
process.exit(0);
