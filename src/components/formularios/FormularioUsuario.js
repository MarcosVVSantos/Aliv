// Formulário de usuário — usado no cadastro (/usuarios/novo) e na alteração
// (/usuarios/[id]). O seletor de tipo no topo troca os campos exibidos; na
// alteração o tipo fica travado, porque o documento tem exatamente um dos
// três blocos (paciente / profissional / atendente).

import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import CampoTexto from '../CampoTexto';
import Cartao from '../Cartao';
import Interruptor from '../Interruptor';
import Selo from '../Selo';
import SeletorSegmentado from '../SeletorSegmentado';
import TelaFormulario from '../TelaFormulario';
import { Corpo, CorpoSecundario, Legenda, Subtitulo } from '../Texto';
import useFormularioCrud from '../../hooks/useFormularioCrud';
import {
  atualizarUsuario,
  criarUsuario,
  obterUsuarioDoc,
} from '../../services/usuarioService';
import { useTema } from '../../theme/AcessibilidadeContext';
import { espacamento } from '../../theme/espacamento';
import { situacaoAutorizacao } from '../../utils/anvisa';
import {
  apenasDigitos,
  dataDeTextoBR,
  formatarCEP,
  formatarCPF,
  formatarData,
  formatarDataDigitada,
  formatarTelefone,
} from '../../utils/formatadores';
import {
  validarCEP,
  validarCPF,
  validarCampoObrigatorio,
  validarDataNascimento,
  validarEmail,
  validarTelefone,
} from '../../utils/validadores';
import { buscarEnderecoPorCep } from '../../utils/viacep';

export const TIPOS_USUARIO = [
  { valor: 'paciente', rotulo: 'Paciente' },
  { valor: 'profissional', rotulo: 'Profissional' },
  { valor: 'atendente', rotulo: 'Atendente' },
];

const SEXOS = [
  { valor: 'Feminino', rotulo: 'Feminino' },
  { valor: 'Masculino', rotulo: 'Masculino' },
  { valor: 'Outro', rotulo: 'Outro' },
];

const ESTADO_INICIAL = {
  tipo: 'paciente',
  email: '',
  telefone: '',
  ativo: true,
  nome_completo: '',
  // paciente
  cpf: '',
  data_nascimento: '',
  sexo: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  precisa_responsavel: false,
  resp_nome: '',
  resp_cpf: '',
  resp_parentesco: '',
  resp_telefone: '',
  // profissional
  conselho: '',
  num_registro: '',
  uf_registro: '',
  especialidade: '',
  // atendente
  cargo: '',
};

function paraCampos(usuario) {
  const base = {
    ...ESTADO_INICIAL,
    tipo: usuario.tipo,
    email: usuario.email ?? '',
    telefone: formatarTelefone(usuario.telefone),
    ativo: usuario.ativo !== false,
  };

  if (usuario.tipo === 'paciente') {
    const p = usuario.paciente ?? {};
    const e = p.endereco ?? {};
    const r = p.responsavel_legal;
    return {
      ...base,
      nome_completo: p.nome_completo ?? '',
      cpf: formatarCPF(p.cpf),
      data_nascimento: p.data_nascimento ? formatarData(p.data_nascimento) : '',
      sexo: p.sexo ?? '',
      cep: formatarCEP(e.cep),
      logradouro: e.logradouro ?? '',
      numero: e.numero ?? '',
      complemento: e.complemento ?? '',
      bairro: e.bairro ?? '',
      cidade: e.cidade ?? '',
      uf: e.uf ?? '',
      precisa_responsavel: Boolean(r),
      resp_nome: r?.nome ?? '',
      resp_cpf: formatarCPF(r?.cpf),
      resp_parentesco: r?.parentesco ?? '',
      resp_telefone: formatarTelefone(r?.telefone),
    };
  }

  if (usuario.tipo === 'profissional') {
    const p = usuario.profissional ?? {};
    return {
      ...base,
      nome_completo: p.nome_completo ?? '',
      conselho: p.conselho ?? '',
      num_registro: p.num_registro ?? '',
      uf_registro: p.uf_registro ?? '',
      especialidade: p.especialidade ?? '',
    };
  }

  const a = usuario.atendente ?? {};
  return { ...base, nome_completo: a.nome_completo ?? '', cargo: a.cargo ?? '' };
}

function validar(c) {
  const erros = {};
  const obrigatorio = (campo, mensagem) => {
    if (!validarCampoObrigatorio(c[campo])) erros[campo] = mensagem;
  };

  if (!validarEmail(c.email)) erros.email = 'Informe um e-mail válido.';
  if (!validarTelefone(c.telefone)) erros.telefone = 'Telefone inválido — use DDD + número.';
  obrigatorio('nome_completo', 'Informe o nome completo.');

  if (c.tipo === 'paciente') {
    if (!validarCPF(c.cpf)) erros.cpf = 'CPF inválido — confira os 11 dígitos.';
    if (!validarDataNascimento(dataDeTextoBR(c.data_nascimento))) {
      erros.data_nascimento = 'Informe uma data válida (dd/mm/aaaa).';
    }
    if (!c.sexo) erros.sexo = 'Selecione uma opção.';
    if (!validarCEP(c.cep)) erros.cep = 'CEP inválido.';
    obrigatorio('logradouro', 'Informe o logradouro.');
    obrigatorio('numero', 'Informe o número.');
    obrigatorio('bairro', 'Informe o bairro.');
    obrigatorio('cidade', 'Informe a cidade.');
    if (c.uf.trim().length !== 2) erros.uf = 'Informe a UF.';

    if (c.precisa_responsavel) {
      obrigatorio('resp_nome', 'Informe o nome do responsável.');
      if (!validarCPF(c.resp_cpf)) erros.resp_cpf = 'CPF do responsável inválido.';
      obrigatorio('resp_parentesco', 'Informe o parentesco.');
      if (!validarTelefone(c.resp_telefone)) erros.resp_telefone = 'Telefone inválido.';
    }
  }

  if (c.tipo === 'profissional') {
    obrigatorio('conselho', 'Informe o conselho (ex.: CRM).');
    obrigatorio('num_registro', 'Informe o número de registro.');
    if (c.uf_registro.trim().length !== 2) erros.uf_registro = 'Informe a UF do registro.';
    obrigatorio('especialidade', 'Informe a especialidade.');
  }

  if (c.tipo === 'atendente') {
    obrigatorio('cargo', 'Informe o cargo.');
  }

  return erros;
}

function paraDocumento(c) {
  const base = {
    tipo: c.tipo,
    email: c.email,
    telefone: apenasDigitos(c.telefone),
    ativo: c.ativo,
  };

  if (c.tipo === 'paciente') {
    const paciente = {
      cpf: apenasDigitos(c.cpf),
      nome_completo: c.nome_completo.trim(),
      data_nascimento: dataDeTextoBR(c.data_nascimento),
      sexo: c.sexo,
      endereco: {
        logradouro: c.logradouro.trim(),
        numero: c.numero.trim(),
        complemento: c.complemento.trim(),
        bairro: c.bairro.trim(),
        cidade: c.cidade.trim(),
        uf: c.uf.trim().toUpperCase(),
        cep: apenasDigitos(c.cep),
      },
    };
    if (c.precisa_responsavel) {
      paciente.responsavel_legal = {
        cpf: apenasDigitos(c.resp_cpf),
        nome: c.resp_nome.trim(),
        parentesco: c.resp_parentesco.trim(),
        telefone: apenasDigitos(c.resp_telefone),
      };
    }
    return { ...base, paciente };
  }

  if (c.tipo === 'profissional') {
    return {
      ...base,
      profissional: {
        nome_completo: c.nome_completo.trim(),
        conselho: c.conselho.trim().toUpperCase(),
        num_registro: c.num_registro.trim(),
        uf_registro: c.uf_registro.trim().toUpperCase(),
        especialidade: c.especialidade.trim(),
      },
    };
  }

  return { ...base, atendente: { nome_completo: c.nome_completo.trim(), cargo: c.cargo.trim() } };
}

const TOM_SITUACAO_AUTORIZACAO = { vigente: 'sucesso', vence_em_breve: 'atencao', vencida: 'perigo' };

// Termos e autorizações não são editados aqui: aparecem só para consulta.
function DocumentosSomenteLeitura({ paciente }) {
  const termos = paciente?.termos_consentimento ?? [];
  const autorizacoes = paciente?.autorizacoes_anvisa ?? [];

  return (
    <Cartao>
      <Subtitulo>Documentos do paciente</Subtitulo>
      <CorpoSecundario style={{ marginBottom: espacamento.sm }}>Somente leitura</CorpoSecundario>

      <Legenda>Termos de consentimento</Legenda>
      {termos.length === 0 ? (
        <Corpo>Nenhum termo assinado.</Corpo>
      ) : (
        termos.map((t, i) => (
          <Corpo key={`${t.hash_assinatura}-${i}`}>
            Versão {t.versao} · assinado em {t.data_assinatura ? formatarData(t.data_assinatura) : '—'}
          </Corpo>
        ))
      )}

      <Legenda style={{ marginTop: espacamento.sm }}>Autorizações da Anvisa</Legenda>
      {autorizacoes.length === 0 ? (
        <Corpo>Nenhuma autorização registrada.</Corpo>
      ) : (
        autorizacoes.map((a, i) => {
          const situacao = situacaoAutorizacao(a);
          return (
            <View key={`${a.numero}-${i}`} style={{ marginTop: espacamento.xs }}>
              <Corpo>{a.numero}</Corpo>
              <CorpoSecundario>
                {a.data_emissao ? formatarData(a.data_emissao) : '—'} a{' '}
                {a.data_validade ? formatarData(a.data_validade) : '—'}
              </CorpoSecundario>
              <Selo texto={situacao} tom={TOM_SITUACAO_AUTORIZACAO[situacao] ?? 'neutro'} />
            </View>
          );
        })
      )}
    </Cartao>
  );
}

export default function FormularioUsuario({ modo, id }) {
  const { cores } = useTema();
  const editando = modo === 'editar';
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState('');
  const [documentos, setDocumentos] = useState(null);

  const { campos, setCampos, erros, definir, propsTela } = useFormularioCrud({
    modo,
    id,
    estadoInicial: ESTADO_INICIAL,
    carregar: async (registroId) => {
      const usuario = await obterUsuarioDoc(registroId);
      setDocumentos(usuario.paciente ?? null);
      return usuario;
    },
    paraCampos,
    validar,
    salvar: (c, { modo: m, id: registroId }) =>
      m === 'editar' ? atualizarUsuario(registroId, paraDocumento(c)) : criarUsuario(paraDocumento(c)),
    rotaLista: '/usuarios',
  });


  async function aoMudarCep(texto) {
    definir('cep')(texto);
    setErroCep('');
    if (apenasDigitos(texto).length !== 8) return;

    setBuscandoCep(true);
    try {
      const endereco = await buscarEnderecoPorCep(texto);
      setCampos((atual) => ({ ...atual, ...endereco }));
    } catch (e) {
      setErroCep(e.message);
    } finally {
      setBuscandoCep(false);
    }
  }

  const ehPaciente = campos.tipo === 'paciente';
  const ehProfissional = campos.tipo === 'profissional';
  const ehAtendente = campos.tipo === 'atendente';

  return (
    <TelaFormulario titulo={editando ? 'Alterar usuário' : 'Cadastrar usuário'} {...propsTela}>
      <View>
        <Legenda style={{ color: cores.textoSecundario, marginBottom: espacamento.xs }}>Tipo de usuário</Legenda>
        {editando ? (
          <Selo texto={TIPOS_USUARIO.find((t) => t.valor === campos.tipo)?.rotulo ?? campos.tipo} tom="sucesso" />
        ) : (
          <SeletorSegmentado opcoes={TIPOS_USUARIO} valor={campos.tipo} aoMudar={definir('tipo')} />
        )}
      </View>

      <CampoTexto
        rotulo="Nome completo"
        value={campos.nome_completo}
        aoMudar={definir('nome_completo')}
        erro={erros.nome_completo}
        placeholder="Nome e sobrenome"
      />

      {ehPaciente ? (
        <>
          <CampoTexto
            rotulo="CPF"
            value={campos.cpf}
            aoMudar={definir('cpf')}
            formatar={formatarCPF}
            erro={erros.cpf}
            keyboardType="number-pad"
            placeholder="000.000.000-00"
          />
          <CampoTexto
            rotulo="Data de nascimento"
            value={campos.data_nascimento}
            aoMudar={definir('data_nascimento')}
            formatar={formatarDataDigitada}
            erro={erros.data_nascimento}
            keyboardType="number-pad"
            placeholder="dd/mm/aaaa"
          />
          <View>
            <Legenda style={{ color: cores.textoSecundario, marginBottom: espacamento.xs }}>Sexo</Legenda>
            <SeletorSegmentado opcoes={SEXOS} valor={campos.sexo} aoMudar={definir('sexo')} />
            {erros.sexo ? (
              <Legenda style={{ marginTop: espacamento.xs, color: cores.terracotaEscura }}>{erros.sexo}</Legenda>
            ) : null}
          </View>
        </>
      ) : null}

      {ehProfissional ? (
        <>
          <View style={{ flexDirection: 'row', gap: espacamento.md }}>
            <CampoTexto
              rotulo="Conselho"
              value={campos.conselho}
              aoMudar={definir('conselho')}
              erro={erros.conselho}
              autoCapitalize="characters"
              placeholder="CRM"
              estiloContainer={{ flex: 1 }}
            />
            <CampoTexto
              rotulo="Nº de registro"
              value={campos.num_registro}
              aoMudar={definir('num_registro')}
              erro={erros.num_registro}
              placeholder="123456"
              estiloContainer={{ flex: 1 }}
            />
          </View>
          <CampoTexto
            rotulo="UF do registro"
            value={campos.uf_registro}
            aoMudar={(v) => definir('uf_registro')(v.toUpperCase().slice(0, 2))}
            erro={erros.uf_registro}
            autoCapitalize="characters"
            maxLength={2}
            placeholder="SP"
          />
          <CampoTexto
            rotulo="Especialidade"
            value={campos.especialidade}
            aoMudar={definir('especialidade')}
            erro={erros.especialidade}
            placeholder="Ex.: Neurologia"
          />
        </>
      ) : null}

      {ehAtendente ? (
        <CampoTexto
          rotulo="Cargo"
          value={campos.cargo}
          aoMudar={definir('cargo')}
          erro={erros.cargo}
          placeholder="Ex.: Recepção"
        />
      ) : null}

      <CampoTexto
        rotulo="E-mail"
        value={campos.email}
        aoMudar={definir('email')}
        erro={erros.email}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="nome@exemplo.com"
      />
      <CampoTexto
        rotulo="Telefone"
        value={campos.telefone}
        aoMudar={definir('telefone')}
        formatar={formatarTelefone}
        erro={erros.telefone}
        keyboardType="phone-pad"
        placeholder="(00) 00000-0000"
      />

      {ehPaciente ? (
        <>
          <Subtitulo style={{ marginTop: espacamento.sm }}>Endereço</Subtitulo>
          <View>
            <CampoTexto
              rotulo="CEP"
              value={campos.cep}
              aoMudar={aoMudarCep}
              formatar={formatarCEP}
              erro={erros.cep ?? erroCep}
              keyboardType="number-pad"
              placeholder="00000-000"
            />
            {buscandoCep ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacamento.xs, marginTop: espacamento.xs }}>
                <ActivityIndicator size="small" color={cores.primaria} />
                <Legenda>Buscando endereço…</Legenda>
              </View>
            ) : null}
          </View>
          <CampoTexto
            rotulo="Logradouro"
            value={campos.logradouro}
            aoMudar={definir('logradouro')}
            erro={erros.logradouro}
            placeholder="Rua, avenida…"
          />
          <View style={{ flexDirection: 'row', gap: espacamento.md }}>
            <CampoTexto
              rotulo="Número"
              value={campos.numero}
              aoMudar={definir('numero')}
              erro={erros.numero}
              estiloContainer={{ flex: 1 }}
            />
            <CampoTexto
              rotulo="Complemento"
              value={campos.complemento}
              aoMudar={definir('complemento')}
              placeholder="Opcional"
              estiloContainer={{ flex: 1 }}
            />
          </View>
          <CampoTexto rotulo="Bairro" value={campos.bairro} aoMudar={definir('bairro')} erro={erros.bairro} />
          <View style={{ flexDirection: 'row', gap: espacamento.md }}>
            <CampoTexto
              rotulo="Cidade"
              value={campos.cidade}
              aoMudar={definir('cidade')}
              erro={erros.cidade}
              estiloContainer={{ flex: 2 }}
            />
            <CampoTexto
              rotulo="UF"
              value={campos.uf}
              aoMudar={(v) => definir('uf')(v.toUpperCase().slice(0, 2))}
              erro={erros.uf}
              autoCapitalize="characters"
              maxLength={2}
              estiloContainer={{ flex: 1 }}
            />
          </View>

          <Interruptor
            rotulo="Precisa de responsável?"
            descricao="Menor de idade ou paciente que precisa de responsável legal"
            valor={campos.precisa_responsavel}
            aoMudar={definir('precisa_responsavel')}
          />
          {campos.precisa_responsavel ? (
            <>
              <CampoTexto
                rotulo="Nome do responsável"
                value={campos.resp_nome}
                aoMudar={definir('resp_nome')}
                erro={erros.resp_nome}
              />
              <CampoTexto
                rotulo="CPF do responsável"
                value={campos.resp_cpf}
                aoMudar={definir('resp_cpf')}
                formatar={formatarCPF}
                erro={erros.resp_cpf}
                keyboardType="number-pad"
                placeholder="000.000.000-00"
              />
              <CampoTexto
                rotulo="Parentesco"
                value={campos.resp_parentesco}
                aoMudar={definir('resp_parentesco')}
                erro={erros.resp_parentesco}
                placeholder="Ex.: Mãe"
              />
              <CampoTexto
                rotulo="Telefone do responsável"
                value={campos.resp_telefone}
                aoMudar={definir('resp_telefone')}
                formatar={formatarTelefone}
                erro={erros.resp_telefone}
                keyboardType="phone-pad"
                placeholder="(00) 00000-0000"
              />
            </>
          ) : null}
        </>
      ) : null}

      <Interruptor
        rotulo="Usuário ativo"
        descricao="Usuários inativos não conseguem entrar no aplicativo"
        valor={campos.ativo}
        aoMudar={definir('ativo')}
      />

      {editando && ehPaciente && documentos ? <DocumentosSomenteLeitura paciente={documentos} /> : null}
    </TelaFormulario>
  );
}
