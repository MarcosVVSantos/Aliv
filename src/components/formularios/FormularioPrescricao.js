// Formulário de prescrição — usado no cadastro (/prescricoes/nova) e na
// alteração (/prescricoes/[id]). A lista `itens` é dinâmica (mínimo 1).
// As cópias (`paciente_nome`, `profissional_nome`, `produto_nome`,
// `teor_cbd`, `teor_thc`, `volume_ml`) não aparecem aqui: o serviço as preenche.
// A posologia em texto ("2 gotas, via sublingual, 2× ao dia") também não é
// gravada: sai de dose, unidade, via e `horarios`.

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Botao from '../Botao';
import CampoHorarios from '../CampoHorarios';
import CampoSelecao from '../CampoSelecao';
import CampoTexto from '../CampoTexto';
import Cartao from '../Cartao';
import TelaFormulario from '../TelaFormulario';
import { CorpoSecundario, Legenda, Subtitulo } from '../Texto';
import useFormularioCrud from '../../hooks/useFormularioCrud';
import useOpcoes from '../../hooks/useOpcoes';
import { listarConsultas } from '../../services/consultaService';
import {
  atualizarPrescricao,
  criarPrescricao,
  obterPrescricaoDoc,
} from '../../services/prescricaoService';
import { listarTodosProdutos } from '../../services/produtoService';
import { listarUsuarios, nomeDoUsuario } from '../../services/usuarioService';
import { useTema } from '../../theme/AcessibilidadeContext';
import { alvoToqueMinimo, espacamento } from '../../theme/espacamento';
import {
  dataDeTextoBR,
  formatarCPF,
  formatarData,
  formatarDataDigitada,
  formatarDataHora,
  numeroDeTexto,
  numeroParaTexto,
} from '../../utils/formatadores';
import { normalizarHorarios } from '../../utils/prescricao';
import { nomeExibicaoProduto } from '../../utils/produto';
import { validarCampoObrigatorio } from '../../utils/validadores';

const comoOpcoes = (valores) => valores.map((v) => ({ valor: v, rotulo: v }));

const TIPOS_RECEITUARIO = comoOpcoes(['Receituário de Controle Especial (Tipo B2)', 'Receita simples']);
const SINTOMAS_ALVO = comoOpcoes(['Ansiedade', 'Dor crônica', 'Insônia', 'Crise convulsiva', 'Náusea', 'Outro']);
const UNIDADES_DOSE = comoOpcoes(['gotas', 'mg', 'ml', 'cápsulas']);
const VIAS = comoOpcoes(['Sublingual', 'Oral', 'Tópica', 'Inalatória']);
// Só o que é gravado: "vencida" e "vence em breve" são calculados da validade.
const STATUS = [
  { valor: 'rascunho', rotulo: 'Rascunho' },
  { valor: 'ativa', rotulo: 'Ativa' },
  { valor: 'cancelada', rotulo: 'Cancelada' },
];

// Se o documento traz um valor fora da lista (ex.: cadastrado pela área
// clínica), ele entra como opção para não sumir ao editar.
function comValorAtual(opcoes, valor) {
  if (!valor || opcoes.some((o) => o.valor === valor)) return opcoes;
  return [...opcoes, { valor, rotulo: valor }];
}

let contadorItens = 0;
function novoItem(dados = {}) {
  contadorItens += 1;
  return {
    chave: `item-${contadorItens}`,
    produto_id: '',
    dose_inicial: '',
    unidade_dose: 'gotas',
    via_administracao: 'Sublingual',
    horarios: ['08:00', '20:00'],
    duracao_dias: '',
    instrucoes_uso: '',
    ...dados,
  };
}

function criarEstadoInicial() {
  return {
    consulta_id: '',
    paciente_id: '',
    profissional_id: '',
    data_emissao: '',
    data_validade: '',
    tipo_receituario: TIPOS_RECEITUARIO[0].valor,
    justificativa_clinica: '',
    cid: '',
    status: 'ativa',
    sintoma_alvo: '',
    itens: [novoItem()],
  };
}

function paraCampos(prescricao) {
  return {
    consulta_id: prescricao.consulta_id ?? '',
    paciente_id: prescricao.paciente_id ?? '',
    profissional_id: prescricao.profissional_id ?? '',
    data_emissao: prescricao.data_emissao ? formatarData(prescricao.data_emissao) : '',
    data_validade: prescricao.data_validade ? formatarData(prescricao.data_validade) : '',
    tipo_receituario: prescricao.tipo_receituario ?? '',
    justificativa_clinica: prescricao.justificativa_clinica ?? '',
    cid: prescricao.cid ?? '',
    // Prescrição do modelo v1 com status 'vencida' gravado: a situação real vem da validade.
    status: STATUS.some((o) => o.valor === prescricao.status) ? prescricao.status : 'ativa',
    sintoma_alvo: prescricao.sintoma_alvo ?? '',
    itens: (prescricao.itens ?? []).map((item) =>
      novoItem({
        produto_id: item.produto_id ?? '',
        dose_inicial: numeroParaTexto(item.dose_inicial),
        unidade_dose: item.unidade_dose ?? '',
        via_administracao: item.via_administracao ?? '',
        horarios: item.horarios ?? [],
        duracao_dias: numeroParaTexto(item.duracao_dias),
        instrucoes_uso: item.instrucoes_uso ?? '',
      })
    ),
  };
}

// Rascunho e cancelada só exigem paciente e profissional. Ativa (emitida) exige
// tudo: datas, CID, justificativa e itens completos, com pelo menos um horário.
function validar(c, modo) {
  const erros = {};
  const emitida = c.status === 'ativa';
  // Consulta obrigatória só no cadastro de uma receita emitida: prescrições
  // emitidas pela área clínica nascem sem consulta e precisam continuar editáveis.
  if (modo === 'novo' && emitida && !c.consulta_id) erros.consulta_id = 'Selecione a consulta.';
  if (!c.paciente_id) erros.paciente_id = 'Selecione o paciente.';
  if (!c.profissional_id) erros.profissional_id = 'Selecione o profissional.';

  const emissao = dataDeTextoBR(c.data_emissao);
  const validade = dataDeTextoBR(c.data_validade);
  if ((emitida || c.data_emissao) && !emissao) erros.data_emissao = 'Informe uma data válida (dd/mm/aaaa).';
  if (emitida || c.data_validade) {
    if (!validade) erros.data_validade = 'Informe uma data válida (dd/mm/aaaa).';
    else if (emissao && validade < emissao) erros.data_validade = 'A validade não pode ser antes da emissão.';
  }

  if (!emitida) return erros;

  if (!c.tipo_receituario) erros.tipo_receituario = 'Selecione o tipo de receituário.';
  if (!validarCampoObrigatorio(c.cid)) erros.cid = 'Informe o CID.';
  if (!validarCampoObrigatorio(c.justificativa_clinica)) erros.justificativa_clinica = 'Informe a justificativa clínica.';
  if (!c.sintoma_alvo) erros.sintoma_alvo = 'Selecione o sintoma alvo.';

  // Cardinalidade 1,n: nunca sem itens.
  if (c.itens.length === 0) {
    erros.itens = 'Adicione pelo menos um produto.';
  } else {
    const errosItens = {};
    c.itens.forEach((item) => {
      const e = {};
      if (!item.produto_id) e.produto_id = 'Selecione o produto.';
      if (!(numeroDeTexto(item.dose_inicial) > 0)) e.dose_inicial = 'Informe um número maior que zero.';
      if (!item.unidade_dose) e.unidade_dose = 'Selecione a unidade.';
      if (!item.via_administracao) e.via_administracao = 'Selecione a via.';
      if (!normalizarHorarios(item.horarios)?.length) e.horarios = 'Adicione pelo menos um horário.';
      if (!(numeroDeTexto(item.duracao_dias) > 0)) e.duracao_dias = 'Informe os dias de tratamento.';
      if (Object.keys(e).length > 0) errosItens[item.chave] = e;
    });
    if (Object.keys(errosItens).length > 0) erros.itensDetalhe = errosItens;
  }

  return erros;
}

function paraDocumento(c) {
  return {
    consulta_id: c.consulta_id || null,
    paciente_id: c.paciente_id,
    profissional_id: c.profissional_id,
    data_emissao: dataDeTextoBR(c.data_emissao),
    data_validade: dataDeTextoBR(c.data_validade),
    tipo_receituario: c.tipo_receituario,
    justificativa_clinica: c.justificativa_clinica,
    cid: c.cid.trim(),
    status: c.status,
    sintoma_alvo: c.sintoma_alvo,
    itens: c.itens.map((item) => {
      // Em rascunho os campos numéricos podem estar vazios.
      const dose = numeroDeTexto(item.dose_inicial);
      const duracao = numeroDeTexto(item.duracao_dias);
      return {
        produto_id: item.produto_id,
        dose_inicial: Number.isNaN(dose) ? null : dose,
        unidade_dose: item.unidade_dose,
        via_administracao: item.via_administracao,
        horarios: item.horarios,
        duracao_dias: Number.isNaN(duracao) ? null : duracao,
        instrucoes_uso: item.instrucoes_uso.trim(),
      };
    }),
  };
}

export default function FormularioPrescricao({ modo, id }) {
  const { cores } = useTema();
  const editando = modo === 'editar';
  const [estadoInicial] = useState(criarEstadoInicial);

  const consultas = useOpcoes(
    () => listarConsultas('todas'),
    (c) => ({
      valor: c.id,
      rotulo: `${c.paciente_nome} — ${formatarDataHora(c.data_hora)}`,
      descricao: c.profissional_nome,
    })
  );
  const pacientes = useOpcoes(
    () => listarUsuarios('paciente'),
    (u) => ({ valor: u.id, rotulo: nomeDoUsuario(u), descricao: formatarCPF(u.paciente?.cpf) })
  );
  const profissionais = useOpcoes(
    () => listarUsuarios('profissional'),
    (u) => ({ valor: u.id, rotulo: nomeDoUsuario(u), descricao: u.profissional?.especialidade })
  );
  const produtos = useOpcoes(
    async () => {
      const lista = await listarTodosProdutos();
      return lista.filter((p) => p.ativo !== false);
    },
    (p) => ({
      valor: p.id,
      rotulo: nomeExibicaoProduto(p.nome, p.teor_cbd, p.volume_ml),
      descricao: `CBD ${numeroParaTexto(p.teor_cbd)} · THC ${numeroParaTexto(p.teor_thc)} mg/mL`,
    })
  );

  const { campos, setCampos, erros, setErros, definir, propsTela } = useFormularioCrud({
    modo,
    id,
    estadoInicial,
    carregar: obterPrescricaoDoc,
    paraCampos,
    validar: (c) => validar(c, modo),
    salvar: (c, { modo: m, id: registroId }) =>
      m === 'editar' ? atualizarPrescricao(registroId, paraDocumento(c)) : criarPrescricao(paraDocumento(c)),
    rotaLista: '/prescricoes',
  });

  // Ao escolher a consulta, paciente e profissional vêm dela (continuam editáveis).
  function aoEscolherConsulta(consultaId) {
    definir('consulta_id')(consultaId);
    const consulta = consultas.itens.find((c) => c.id === consultaId);
    if (consulta) {
      setCampos((atual) => ({
        ...atual,
        consulta_id: consultaId,
        paciente_id: consulta.paciente_id,
        profissional_id: consulta.profissional_id,
        // O CID da prescrição é uma cópia do CID registrado na consulta.
        cid: atual.cid || consulta.evolucao?.cid || '',
      }));
    }
  }

  function atualizarItem(chave, campo, valor) {
    setCampos((atual) => ({
      ...atual,
      itens: atual.itens.map((item) => (item.chave === chave ? { ...item, [campo]: valor } : item)),
    }));
    // Editar o campo limpa o erro dele.
    setErros((atual) =>
      atual.itensDetalhe?.[chave]?.[campo]
        ? {
            ...atual,
            itensDetalhe: { ...atual.itensDetalhe, [chave]: { ...atual.itensDetalhe[chave], [campo]: undefined } },
          }
        : atual
    );
  }

  function adicionarItem() {
    setCampos((atual) => ({ ...atual, itens: [...atual.itens, novoItem()] }));
  }

  function removerItem(chave) {
    setCampos((atual) => ({ ...atual, itens: atual.itens.filter((item) => item.chave !== chave) }));
  }

  const errosItens = erros.itensDetalhe ?? {};

  return (
    <TelaFormulario titulo={editando ? 'Alterar prescrição' : 'Cadastrar prescrição'} {...propsTela}>
      <CampoSelecao
        rotulo="Consulta"
        valor={campos.consulta_id}
        opcoes={consultas.opcoes}
        carregando={consultas.carregando}
        aoMudar={aoEscolherConsulta}
        erro={erros.consulta_id ?? (consultas.erro || undefined)}
        placeholder={editando ? 'Sem consulta vinculada' : 'Selecione a consulta'}
        textoVazio="Nenhuma consulta cadastrada."
      />
      <CampoSelecao
        rotulo="Paciente"
        valor={campos.paciente_id}
        opcoes={pacientes.opcoes}
        carregando={pacientes.carregando}
        aoMudar={definir('paciente_id')}
        erro={erros.paciente_id ?? (pacientes.erro || undefined)}
        textoVazio="Nenhum paciente cadastrado."
      />
      <CampoSelecao
        rotulo="Profissional"
        valor={campos.profissional_id}
        opcoes={profissionais.opcoes}
        carregando={profissionais.carregando}
        aoMudar={definir('profissional_id')}
        erro={erros.profissional_id ?? (profissionais.erro || undefined)}
        textoVazio="Nenhum profissional cadastrado."
      />
      <View style={{ flexDirection: 'row', gap: espacamento.md }}>
        <CampoTexto
          rotulo="Data de emissão"
          value={campos.data_emissao}
          aoMudar={definir('data_emissao')}
          formatar={formatarDataDigitada}
          erro={erros.data_emissao}
          keyboardType="number-pad"
          placeholder="dd/mm/aaaa"
          estiloContainer={{ flex: 1 }}
        />
        <CampoTexto
          rotulo="Data de validade"
          value={campos.data_validade}
          aoMudar={definir('data_validade')}
          formatar={formatarDataDigitada}
          erro={erros.data_validade}
          keyboardType="number-pad"
          placeholder="dd/mm/aaaa"
          estiloContainer={{ flex: 1 }}
        />
      </View>
      <CampoSelecao
        rotulo="Tipo de receituário"
        valor={campos.tipo_receituario}
        opcoes={comValorAtual(TIPOS_RECEITUARIO, campos.tipo_receituario)}
        aoMudar={definir('tipo_receituario')}
        erro={erros.tipo_receituario}
      />
      <CampoTexto
        rotulo="CID"
        value={campos.cid}
        aoMudar={definir('cid')}
        erro={erros.cid}
        autoCapitalize="characters"
        placeholder="Ex.: F41.1"
      />
      <CampoTexto
        rotulo="Justificativa clínica"
        value={campos.justificativa_clinica}
        aoMudar={definir('justificativa_clinica')}
        erro={erros.justificativa_clinica}
        multiline
        placeholder="Alternativas terapêuticas prévias e motivo da prescrição"
      />
      <CampoSelecao
        rotulo="Sintoma alvo"
        valor={campos.sintoma_alvo}
        opcoes={comValorAtual(SINTOMAS_ALVO, campos.sintoma_alvo)}
        aoMudar={definir('sintoma_alvo')}
        erro={erros.sintoma_alvo}
      />
      <CampoSelecao rotulo="Status" valor={campos.status} opcoes={STATUS} aoMudar={definir('status')} />

      <View style={estilos.cabecalhoItens}>
        <Subtitulo style={{ flex: 1 }}>Itens da prescrição</Subtitulo>
        <Legenda>{campos.itens.length} {campos.itens.length === 1 ? 'item' : 'itens'}</Legenda>
      </View>
      {erros.itens ? <Legenda style={{ color: cores.terracotaEscura }}>{erros.itens}</Legenda> : null}

      {campos.itens.map((item, indice) => {
        const e = errosItens[item.chave] ?? {};
        return (
          <Cartao key={item.chave} estilo={{ gap: espacamento.md }}>
            <View style={estilos.cabecalhoItens}>
              <CorpoSecundario style={{ flex: 1 }}>Produto {indice + 1}</CorpoSecundario>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remover produto ${indice + 1}`}
                onPress={() => removerItem(item.chave)}
                style={estilos.remover}
              >
                <Ionicons name="trash-outline" size={22} color={cores.terracotaEscura} />
              </Pressable>
            </View>
            <CampoSelecao
              rotulo="Produto"
              valor={item.produto_id}
              opcoes={produtos.opcoes}
              carregando={produtos.carregando}
              aoMudar={(v) => atualizarItem(item.chave, 'produto_id', v)}
              erro={e.produto_id ?? (produtos.erro || undefined)}
              textoVazio="Nenhum produto ativo cadastrado."
            />
            <View style={{ flexDirection: 'row', gap: espacamento.md }}>
              <CampoTexto
                rotulo="Dose inicial"
                value={item.dose_inicial}
                aoMudar={(v) => atualizarItem(item.chave, 'dose_inicial', v)}
                erro={e.dose_inicial}
                keyboardType="decimal-pad"
                placeholder="2"
                estiloContainer={{ flex: 1 }}
              />
              <View style={{ flex: 1 }}>
                <CampoSelecao
                  rotulo="Unidade"
                  valor={item.unidade_dose}
                  opcoes={comValorAtual(UNIDADES_DOSE, item.unidade_dose)}
                  aoMudar={(v) => atualizarItem(item.chave, 'unidade_dose', v)}
                  erro={e.unidade_dose}
                />
              </View>
            </View>
            <CampoSelecao
              rotulo="Via de administração"
              valor={item.via_administracao}
              opcoes={comValorAtual(VIAS, item.via_administracao)}
              aoMudar={(v) => atualizarItem(item.chave, 'via_administracao', v)}
              erro={e.via_administracao}
            />
            <CampoHorarios
              valor={item.horarios}
              aoMudar={(v) => atualizarItem(item.chave, 'horarios', v)}
              erro={e.horarios}
            />
            <CampoTexto
              rotulo="Duração (dias)"
              value={item.duracao_dias}
              aoMudar={(v) => atualizarItem(item.chave, 'duracao_dias', v)}
              erro={e.duracao_dias}
              keyboardType="number-pad"
              placeholder="30"
            />
            <CampoTexto
              rotulo="Instruções de uso"
              value={item.instrucoes_uso}
              aoMudar={(v) => atualizarItem(item.chave, 'instrucoes_uso', v)}
              multiline
              placeholder="Ex.: aguardar 60 segundos sob a língua antes de engolir"
            />
          </Cartao>
        );
      })}

      <Botao titulo="+ Adicionar produto" variante="secundario" onPress={adicionarItem} />
    </TelaFormulario>
  );
}

const estilos = StyleSheet.create({
  cabecalhoItens: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
  },
  remover: {
    width: alvoToqueMinimo,
    height: alvoToqueMinimo,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
