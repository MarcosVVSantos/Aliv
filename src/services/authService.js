// Autenticação — telas nunca importam `firebase/auth` diretamente, só este
// arquivo (ver CONTEXTO.md, seção 3). Assinaturas exatas na seção 8.
//
// Com `USAR_MOCK = false` usa o Firebase Authentication (e-mail/senha) e
// lê `tipo`/nome do documento `usuarios/{uid}`. Com `USAR_MOCK = true` a
// sessão é simulada em memória, para demonstrar sem rede.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { ATRASO_MOCK_MS, USAR_MOCK, aguardar } from './config';
import { COLECOES, criarComId, obter } from './crudService';
import { auth } from './firebase';
import {
  credenciaisMock,
  obterUsuarioMockPorUid,
  usuariosMock,
} from './mocks/usuarios';
import { apenasDigitos } from '../utils/formatadores';

const CHAVE_SESSAO = '@aliv/sessao_uid';

function nomeDoUsuario(usuario) {
  return (
    usuario?.paciente?.nome_completo ??
    usuario?.profissional?.nome_completo ??
    usuario?.atendente?.nome_completo ??
    ''
  );
}

function paraSessao(usuario) {
  if (!usuario) return null;
  return { uid: usuario.id, tipo: usuario.tipo, nome: nomeDoUsuario(usuario) };
}

// --- Estado de sessão em memória + observadores -----------------------
// `observarSessao` só chama o callback depois que a sessão persistida
// terminou de carregar, e chama de novo a cada entrar()/sair().

let sessaoAtual = null;
let sessaoCarregada = false;
const ouvintes = new Set();

// UID de uma conta recém-criada cujo documento em `usuarios` ainda está
// sendo gravado. Enquanto isso o listener do Firebase Auth é ignorado —
// senão ele leria um documento que ainda não existe e derrubaria a sessão.
let uidEmCadastro = null;

function notificarOuvintes() {
  if (!sessaoCarregada) return;
  ouvintes.forEach((callback) => callback(sessaoAtual));
}

async function sessaoDoUid(uid) {
  const usuario = await obter(COLECOES.usuarios, uid);
  return paraSessao(usuario);
}

let carregamentoInicial;

if (USAR_MOCK) {
  carregamentoInicial = (async () => {
    try {
      const uidSalvo = await AsyncStorage.getItem(CHAVE_SESSAO);
      if (uidSalvo) sessaoAtual = paraSessao(obterUsuarioMockPorUid(uidSalvo));
    } catch {
      // Storage indisponível — segue sem sessão.
    } finally {
      sessaoCarregada = true;
      notificarOuvintes();
    }
  })();
} else {
  carregamentoInicial = new Promise((resolve) => {
    onAuthStateChanged(auth, async (usuarioAuth) => {
      if (usuarioAuth && usuarioAuth.uid === uidEmCadastro) return;
      try {
        sessaoAtual = usuarioAuth ? await sessaoDoUid(usuarioAuth.uid) : null;
      } catch {
        // Sem acesso ao perfil (rede/regras): trata como sem sessão em vez
        // de deixar o app preso na tela de carregamento.
        sessaoAtual = null;
      }
      sessaoCarregada = true;
      notificarOuvintes();
      resolve();
    });
  });
}

async function persistirUidMock(uid) {
  try {
    if (uid) await AsyncStorage.setItem(CHAVE_SESSAO, uid);
    else await AsyncStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // Sem storage disponível, a sessão só dura a execução atual.
  }
}

const MENSAGENS_AUTH = {
  'auth/invalid-credential': 'E-mail ou senha inválidos.',
  'auth/user-not-found': 'E-mail ou senha inválidos.',
  'auth/wrong-password': 'E-mail ou senha inválidos.',
  'auth/invalid-email': 'Informe um e-mail válido.',
  'auth/email-already-in-use': 'Já existe uma conta cadastrada com esse e-mail.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com o servidor. Verifique sua internet.',
  'auth/operation-not-allowed':
    'Login por e-mail e senha não está habilitado no Firebase. Habilite em Authentication → Método de login.',
  'auth/user-disabled': 'Essa conta está inativa. Fale com a clínica.',
};

function traduzirErroAuth(erro, padrao) {
  return new Error(MENSAGENS_AUTH[erro?.code] ?? erro?.message ?? padrao);
}

// Monta o documento `usuarios/{uid}` de um paciente novo. CPF, telefone e
// CEP são gravados só com dígitos (a máscara é apenas de digitação).
function montarDocumentoPaciente({ dadosPessoais, endereco, responsavelLegal, termo }, uid) {
  const documento = {
    email: dadosPessoais.email.trim(),
    telefone: apenasDigitos(dadosPessoais.telefone),
    tipo: 'paciente',
    ativo: true,
    paciente: {
      cpf: apenasDigitos(dadosPessoais.cpf),
      nome_completo: dadosPessoais.nomeCompleto.trim(),
      data_nascimento: dadosPessoais.dataNascimento ?? null,
      sexo: dadosPessoais.sexo ?? '',
      endereco: endereco
        ? {
            logradouro: endereco.logradouro ?? '',
            numero: endereco.numero ?? '',
            complemento: endereco.complemento ?? '',
            bairro: endereco.bairro ?? '',
            cidade: endereco.cidade ?? '',
            uf: endereco.uf ?? '',
            cep: apenasDigitos(endereco.cep),
          }
        : null,
      termos_consentimento: [
        {
          versao: termo.versao ?? '1.0',
          data_assinatura: new Date(),
          hash_assinatura: `${uid}-${Date.now()}`,
        },
      ],
      autorizacoes_anvisa: [],
    },
  };

  if (responsavelLegal?.necessario) {
    documento.paciente.responsavel_legal = {
      cpf: apenasDigitos(responsavelLegal.cpf),
      nome: responsavelLegal.nome ?? '',
      parentesco: responsavelLegal.parentesco ?? '',
      telefone: apenasDigitos(responsavelLegal.telefone),
    };
  }

  return documento;
}

// ------------------------------------------------------------------------

export async function cadastrarPaciente(dados) {
  const { dadosPessoais, termo } = dados;

  if (!dadosPessoais?.nomeCompleto || !dadosPessoais?.email || !dadosPessoais?.senha) {
    throw new Error('Preencha nome, e-mail e senha para concluir o cadastro.');
  }
  if (!termo?.aceito) {
    throw new Error('É preciso aceitar o termo de consentimento para concluir o cadastro.');
  }

  if (USAR_MOCK) {
    await aguardar();

    const email = dadosPessoais.email.trim();
    if (credenciaisMock[email]) {
      throw new Error('Já existe uma conta cadastrada com esse e-mail.');
    }

    const uid = `paciente-${Date.now()}`;
    const novoUsuario = {
      id: uid,
      ...montarDocumentoPaciente(dados, uid),
      data_cadastro: new Date(),
    };

    usuariosMock.push(novoUsuario);
    // A senha escolhida vive só em memória, durante esta execução.
    credenciaisMock[email] = { uid, senha: dadosPessoais.senha };

    // O Firebase Auth real já autentica a conta assim que ela é criada —
    // reproduzimos o mesmo comportamento aqui.
    sessaoAtual = paraSessao(novoUsuario);
    await persistirUidMock(uid);
    notificarOuvintes();

    return { uid };
  }

  let uid;
  try {
    const credencial = await createUserWithEmailAndPassword(
      auth,
      dadosPessoais.email.trim(),
      dadosPessoais.senha
    );
    uid = credencial.user.uid;
  } catch (erro) {
    throw traduzirErroAuth(erro, 'Não foi possível criar a conta.');
  }

  uidEmCadastro = uid;
  try {
    await criarComId(COLECOES.usuarios, uid, montarDocumentoPaciente(dados, uid));
    sessaoAtual = await sessaoDoUid(uid);
    sessaoCarregada = true;
  } catch (erro) {
    // A conta de autenticação foi criada, mas o perfil não pôde ser gravado:
    // desfaz para o e-mail não ficar preso a uma conta sem cadastro.
    await auth.currentUser?.delete().catch(() => {});
    sessaoAtual = null;
    throw erro;
  } finally {
    uidEmCadastro = null;
  }
  notificarOuvintes();

  return { uid };
}

export async function entrar(email, senha) {
  const emailLimpo = String(email ?? '').trim();

  if (USAR_MOCK) {
    await aguardar();

    const credencial = credenciaisMock[emailLimpo];
    // Contas de demonstração aceitam qualquer senha; contas criadas pelo
    // cadastro exigem a senha escolhida (guardada só em memória).
    const senhaConfere = credencial && (credencial.senha === undefined ? Boolean(senha) : credencial.senha === senha);
    if (!senhaConfere) {
      throw new Error('E-mail ou senha inválidos.');
    }

    const usuario = obterUsuarioMockPorUid(credencial.uid);
    if (!usuario || !usuario.ativo) {
      throw new Error('Essa conta está inativa. Fale com a clínica.');
    }

    sessaoAtual = paraSessao(usuario);
    await persistirUidMock(usuario.id);
    notificarOuvintes();

    return sessaoAtual;
  }

  let uid;
  try {
    const credencial = await signInWithEmailAndPassword(auth, emailLimpo, senha);
    uid = credencial.user.uid;
  } catch (erro) {
    throw traduzirErroAuth(erro, 'Não foi possível entrar.');
  }

  const usuario = await obter(COLECOES.usuarios, uid);
  if (!usuario) {
    await signOut(auth);
    throw new Error('Não encontramos o cadastro dessa conta. Fale com a clínica.');
  }
  if (usuario.ativo === false) {
    await signOut(auth);
    throw new Error('Essa conta está inativa. Fale com a clínica.');
  }

  sessaoAtual = paraSessao(usuario);
  sessaoCarregada = true;
  notificarOuvintes();
  return sessaoAtual;
}

export async function sair() {
  if (USAR_MOCK) {
    await aguardar(ATRASO_MOCK_MS / 2);
    sessaoAtual = null;
    await persistirUidMock(null);
    notificarOuvintes();
    return;
  }

  try {
    await signOut(auth);
  } catch (erro) {
    throw traduzirErroAuth(erro, 'Não foi possível sair.');
  }
  sessaoAtual = null;
  notificarOuvintes();
}

export async function recuperarSenha(email) {
  if (!email) {
    throw new Error('Informe o e-mail cadastrado.');
  }

  if (USAR_MOCK) {
    await aguardar();
    // Não confirmamos se o e-mail existe, para não vazar quem é paciente.
    return;
  }

  try {
    await sendPasswordResetEmail(auth, String(email).trim());
  } catch (erro) {
    // `user-not-found` não é revelado: mesma resposta de sucesso.
    if (erro?.code === 'auth/user-not-found') return;
    throw traduzirErroAuth(erro, 'Não foi possível enviar o e-mail de recuperação.');
  }
}

// Chama `callback` assim que a sessão persistida terminar de carregar, e
// de novo a cada mudança (entrar/sair). Devolve a função de unsubscribe.
export function observarSessao(callback) {
  ouvintes.add(callback);
  if (sessaoCarregada) callback(sessaoAtual);
  else carregamentoInicial.then(() => callback(sessaoAtual));

  return () => ouvintes.delete(callback);
}

export function obterSessaoAtual() {
  return sessaoAtual;
}
