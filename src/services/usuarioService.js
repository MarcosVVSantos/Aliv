// Dados de usuário (paciente, profissional, atendente) — telas nunca
// importam `firebase/firestore` diretamente, só este arquivo (ver
// CONTEXTO.md, seção 3). Assinaturas exatas na seção 8.
//
// Duas famílias de função convivem aqui:
//  - as das telas do paciente devolvem o formato "de tela" (camelCase);
//  - as de gestão (listarUsuarios, criarUsuario...) trabalham com o próprio
//    documento (snake_case, `Date` no lugar de Timestamp), porque o
//    formulário do CRUD espelha 1:1 os campos do modelo.

import { COLECOES, atualizar, criar, listar, obter, remover } from './crudService';

const TIPOS = ['paciente', 'profissional', 'atendente'];

function paraData(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor.toDate === 'function') return valor.toDate(); // Timestamp do Firestore
  return new Date(valor);
}

export function nomeDoUsuario(usuario) {
  return (
    usuario?.paciente?.nome_completo ??
    usuario?.profissional?.nome_completo ??
    usuario?.atendente?.nome_completo ??
    ''
  );
}

function paraUsuarioTela(usuario) {
  if (!usuario) return null;

  const base = {
    id: usuario.id,
    email: usuario.email,
    telefone: usuario.telefone,
    tipo: usuario.tipo,
    dataCadastro: paraData(usuario.data_cadastro),
    ativo: usuario.ativo,
  };

  if (usuario.tipo === 'paciente' && usuario.paciente) {
    const p = usuario.paciente;
    return {
      ...base,
      paciente: {
        cpf: p.cpf,
        nomeCompleto: p.nome_completo,
        dataNascimento: paraData(p.data_nascimento),
        sexo: p.sexo,
        endereco: p.endereco ?? null,
        responsavelLegal: p.responsavel_legal ?? null,
        termosConsentimento: (p.termos_consentimento ?? []).map((t) => ({
          versao: t.versao,
          dataAssinatura: paraData(t.data_assinatura),
          hashAssinatura: t.hash_assinatura,
        })),
        autorizacoesAnvisa: (p.autorizacoes_anvisa ?? []).map((a) => ({
          numero: a.numero,
          dataEmissao: paraData(a.data_emissao),
          dataValidade: paraData(a.data_validade),
          situacao: a.situacao,
        })),
      },
    };
  }

  if (usuario.tipo === 'profissional' && usuario.profissional) {
    const pr = usuario.profissional;
    return {
      ...base,
      profissional: {
        nomeCompleto: pr.nome_completo,
        conselho: pr.conselho,
        numRegistro: pr.num_registro,
        ufRegistro: pr.uf_registro,
        especialidade: pr.especialidade,
        modalidade: pr.modalidade_padrao ?? 'presencial',
      },
    };
  }

  if (usuario.tipo === 'atendente' && usuario.atendente) {
    return {
      ...base,
      atendente: {
        nomeCompleto: usuario.atendente.nome_completo,
        cargo: usuario.atendente.cargo,
      },
    };
  }

  return base;
}

// --- Telas do paciente / agendamento ----------------------------------------

export async function obterUsuario(uid) {
  const usuario = await obter(COLECOES.usuarios, uid);
  if (!usuario) throw new Error('Usuário não encontrado.');
  return paraUsuarioTela(usuario);
}

export async function atualizarDadosPaciente(uid, dados) {
  const usuario = await obter(COLECOES.usuarios, uid);
  if (!usuario || usuario.tipo !== 'paciente') {
    throw new Error('Paciente não encontrado.');
  }

  const paciente = { ...usuario.paciente };
  if (dados.nomeCompleto !== undefined) paciente.nome_completo = dados.nomeCompleto;
  if (dados.endereco !== undefined) paciente.endereco = { ...paciente.endereco, ...dados.endereco };

  const alteracoes = { paciente };
  if (dados.telefone !== undefined) alteracoes.telefone = dados.telefone;
  if (dados.email !== undefined) alteracoes.email = dados.email;

  await atualizar(COLECOES.usuarios, uid, alteracoes);
}

export async function listarProfissionais() {
  const profissionais = await listar(COLECOES.usuarios, {
    filtros: [['tipo', '==', 'profissional']],
  });

  return profissionais
    .filter((u) => u.ativo !== false && u.profissional)
    .map((u) => ({
      id: u.id,
      nome: u.profissional.nome_completo,
      especialidade: u.profissional.especialidade,
      conselho: u.profissional.conselho,
      numRegistro: u.profissional.num_registro,
      modalidade: u.profissional.modalidade_padrao ?? 'presencial',
    }));
}

export async function obterDocumentos(uid) {
  const usuario = await obter(COLECOES.usuarios, uid);
  if (!usuario || usuario.tipo !== 'paciente') {
    throw new Error('Documentos disponíveis apenas para pacientes.');
  }

  const tela = paraUsuarioTela(usuario);
  return {
    autorizacoesAnvisa: tela.paciente.autorizacoesAnvisa,
    termos: tela.paciente.termosConsentimento,
  };
}

// --- Gestão (CRUD) ---------------------------------------------------------------

// tipo: 'todos' | 'paciente' | 'profissional' | 'atendente'
export async function listarUsuarios(tipo = 'todos') {
  const filtros = tipo === 'todos' ? [] : [['tipo', '==', tipo]];
  const usuarios = await listar(COLECOES.usuarios, { filtros });
  return usuarios.sort((a, b) =>
    nomeDoUsuario(a).localeCompare(nomeDoUsuario(b), 'pt-BR', { sensitivity: 'base' })
  );
}

// Documento cru (snake_case) — é o que o formulário de gestão edita.
export async function obterUsuarioDoc(id) {
  const usuario = await obter(COLECOES.usuarios, id);
  if (!usuario) throw new Error('Usuário não encontrado.');
  return usuario;
}

function validarUsuario(dados) {
  if (!TIPOS.includes(dados.tipo)) {
    throw new Error('Tipo de usuário inválido.');
  }
  if (!dados.email?.trim()) throw new Error('Informe o e-mail.');
  if (!nomeDoUsuario({ [dados.tipo]: dados[dados.tipo] }).trim()) {
    throw new Error('Informe o nome completo.');
  }
}

// O documento tem exatamente um dos três blocos (paciente / profissional /
// atendente) — nunca dois. `termos_consentimento` e `autorizacoes_anvisa`
// não são editados no formulário: nascem vazios e só mudam pelo fluxo próprio.
export async function criarUsuario(dados) {
  validarUsuario(dados);

  const documento = {
    email: dados.email.trim(),
    telefone: dados.telefone ?? '',
    tipo: dados.tipo,
    ativo: dados.ativo ?? true,
    [dados.tipo]:
      dados.tipo === 'paciente'
        ? { termos_consentimento: [], autorizacoes_anvisa: [], ...dados.paciente }
        : dados[dados.tipo],
  };

  return criar(COLECOES.usuarios, documento);
}

export async function atualizarUsuario(id, dados) {
  const existente = await obterUsuarioDoc(id);
  const tipo = existente.tipo;
  validarUsuario({ ...dados, tipo });

  // Mescla com o bloco existente para preservar o que o formulário não
  // edita (termos de consentimento e autorizações da Anvisa).
  const bloco = { ...existente[tipo], ...dados[tipo] };
  // O responsável legal é opcional: se o formulário não o enviou, foi
  // desligado e precisa sair do documento.
  if (tipo === 'paciente' && !('responsavel_legal' in dados.paciente)) {
    delete bloco.responsavel_legal;
  }

  const alteracoes = {
    email: dados.email.trim(),
    telefone: dados.telefone ?? '',
    ativo: dados.ativo ?? existente.ativo,
    [tipo]: bloco,
  };

  await atualizar(COLECOES.usuarios, id, alteracoes);
}

export async function removerUsuario(id) {
  await remover(COLECOES.usuarios, id);
}
