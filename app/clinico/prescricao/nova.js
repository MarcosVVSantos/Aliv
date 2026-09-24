// Nova prescrição — ver CONTEXTO.md, seção 7.13. Layout denso, com os
// campos que o protótipo esquecia: tipo de receituário, validade e CID.

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import Botao from '../../../src/components/Botao';
import CabecalhoTela from '../../../src/components/CabecalhoTela';
import CampoHorarios from '../../../src/components/CampoHorarios';
import CampoTexto from '../../../src/components/CampoTexto';
import Cartao from '../../../src/components/Cartao';
import Chip from '../../../src/components/Chip';
import Selo from '../../../src/components/Selo';
import { Corpo, CorpoSecundario, Legenda, Subtitulo } from '../../../src/components/Texto';
import useSessao from '../../../src/hooks/useSessao';
import { emitirPrescricao, salvarRascunhoPrescricao } from '../../../src/services/prescricaoService';
import { listarProdutos } from '../../../src/services/produtoService';
import { obterUsuario } from '../../../src/services/usuarioService';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { alvoToqueMinimo, espacamento } from '../../../src/theme/espacamento';
import { calcularIdade, formatarCPF, numeroDeTexto } from '../../../src/utils/formatadores';
import { avisar } from '../../../src/utils/dialogo';
import { normalizarHorarios } from '../../../src/utils/prescricao';
import { nomeExibicaoProduto } from '../../../src/utils/produto';

const SINTOMAS_ALVO = ['Ansiedade', 'Dor crônica', 'Insônia', 'Crise convulsiva', 'Náusea', 'Outro'];
const TIPOS_RECEITUARIO = ['Receituário de Controle Especial (Tipo B2)', 'Receita simples'];

function novoItem(produto) {
  return {
    chave: `${produto.id}-${Date.now()}`,
    produtoId: produto.id,
    produtoNome: nomeExibicaoProduto(produto.nome, produto.teorCbd, produto.volumeMl),
    teorCbd: produto.teorCbd,
    teorThc: produto.teorThc,
    doseInicial: '',
    unidadeDose: 'gotas',
    viaAdministracao: '',
    horarios: ['08:00', '20:00'],
    duracaoDias: '',
    instrucoesUso: '',
  };
}

// Os campos de texto viram números; o que estiver vazio ou inválido vai como
// null (o rascunho aceita item incompleto, a emissão valida no serviço).
function itensParaServico(itens) {
  const numeroOuNull = (texto) => {
    const n = numeroDeTexto(texto);
    return Number.isNaN(n) ? null : n;
  };
  return itens.map((item) => ({
    produtoId: item.produtoId,
    doseInicial: numeroOuNull(item.doseInicial),
    unidadeDose: item.unidadeDose,
    viaAdministracao: item.viaAdministracao,
    horarios: item.horarios,
    duracaoDias: numeroOuNull(item.duracaoDias),
    instrucoesUso: item.instrucoesUso,
  }));
}

export default function NovaPrescricao() {
  const router = useRouter();
  const { pacienteId } = useLocalSearchParams();
  const { cores } = useTema();
  const { sessao } = useSessao();

  const [paciente, setPaciente] = useState(null);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [escolhendoProduto, setEscolhendoProduto] = useState(false);

  const [justificativa, setJustificativa] = useState('');
  const [tipoReceituario, setTipoReceituario] = useState(TIPOS_RECEITUARIO[0]);
  const [diasValidade, setDiasValidade] = useState('365');
  const [cid, setCid] = useState('');
  const [sintomaAlvo, setSintomaAlvo] = useState(null);
  const [itens, setItens] = useState([]);
  // Depois do primeiro "Salvar rascunho", salvar de novo atualiza o mesmo
  // documento (e emitir emite esse rascunho) em vez de criar outro.
  const [rascunhoId, setRascunhoId] = useState(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (pacienteId) obterUsuario(pacienteId).then(setPaciente).catch((e) => setErro(e.message));
    listarProdutos().then(setProdutosDisponiveis).catch((e) => setErro(e.message));
  }, [pacienteId]);

  function atualizarItem(chave, campo, valor) {
    setItens((atual) => atual.map((item) => (item.chave === chave ? { ...item, [campo]: valor } : item)));
  }

  function removerItem(chave) {
    setItens((atual) => atual.filter((item) => item.chave !== chave));
  }

  function adicionarProduto(produto) {
    setItens((atual) => [...atual, novoItem(produto)]);
    setEscolhendoProduto(false);
  }

  function validar() {
    if (!cid.trim()) return 'Informe o CID.';
    if (!justificativa.trim()) return 'A justificativa clínica é obrigatória.';
    if (itens.length === 0) return 'Adicione pelo menos um item à prescrição.';
    for (const item of itens) {
      if (!item.doseInicial || !item.unidadeDose || !item.viaAdministracao || !item.duracaoDias) {
        return 'Preencha todos os campos obrigatórios de cada item.';
      }
      if (!normalizarHorarios(item.horarios)?.length) {
        return 'Adicione pelo menos um horário de dose em cada item.';
      }
    }
    return null;
  }

  async function lidarComSalvarRascunho() {
    setSalvando(true);
    setErro('');
    try {
      // Rascunho aceita tudo incompleto: só paciente e profissional são exigidos.
      const { id } = await salvarRascunhoPrescricao({
        id: rascunhoId,
        pacienteId,
        profissionalId: sessao.uid,
        justificativa,
        tipoReceituario,
        cid,
        sintomaAlvo,
        itens: itensParaServico(itens),
      });
      setRascunhoId(id);
      avisar('Rascunho salvo', 'A prescrição ainda não foi emitida.');
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function lidarComEmitir() {
    const mensagemErro = validar();
    setErro(mensagemErro ?? '');
    if (mensagemErro) return;

    setSalvando(true);
    try {
      await emitirPrescricao({
        id: rascunhoId,
        consultaId: null,
        pacienteId,
        profissionalId: sessao.uid,
        justificativa,
        tipoReceituario,
        cid,
        sintomaAlvo,
        diasValidade: Number(diasValidade) || 365,
        itens: itensParaServico(itens),
      });
      avisar('Prescrição emitida', 'A receita foi emitida com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  const idade = paciente?.paciente?.dataNascimento ? calcularIdade(paciente.paciente.dataNascimento) : null;

  return (
    <View style={{ flex: 1 }}>
      <CabecalhoTela titulo="Nova prescrição" />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={[estilos.faixaPaciente, { backgroundColor: cores.verdeClaro }]}>
          <Corpo>{paciente?.paciente?.nomeCompleto ?? '...'}</Corpo>
          <CorpoSecundario>
            {paciente?.paciente?.cpf ? formatarCPF(paciente.paciente.cpf) : ''}
            {idade ? ` · ${idade} anos` : ''}
          </CorpoSecundario>
        </View>

        <Cartao>
          <Subtitulo>Justificativa clínica</Subtitulo>
          <CampoTexto
            rotulo="Alternativas terapêuticas prévias"
            value={justificativa}
            aoMudar={setJustificativa}
            multiline
            placeholder="Descreva os tratamentos convencionais já tentados…"
          />
          <Legenda style={{ marginTop: espacamento.xs, color: cores.terracotaEscura }}>
            Obrigatório para emissão da prescrição, conforme protocolo clínico.
          </Legenda>
        </Cartao>

        <Cartao>
          <Subtitulo>Detalhes da receita</Subtitulo>
          <View style={{ gap: espacamento.sm, marginTop: espacamento.sm }}>
            <Legenda>Tipo de receituário</Legenda>
            <View style={estilos.grupoChips}>
              {TIPOS_RECEITUARIO.map((tipo) => (
                <Chip key={tipo} texto={tipo} selecionado={tipoReceituario === tipo} onPress={() => setTipoReceituario(tipo)} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: espacamento.sm }}>
              <CampoTexto
                rotulo="Validade (dias)"
                value={diasValidade}
                aoMudar={setDiasValidade}
                keyboardType="number-pad"
                estiloContainer={{ flex: 1 }}
              />
              <CampoTexto
                rotulo="CID"
                value={cid}
                aoMudar={setCid}
                autoCapitalize="characters"
                placeholder="Ex.: F41.1"
                estiloContainer={{ flex: 1 }}
              />
            </View>
            <Legenda>Sintoma alvo</Legenda>
            <View style={estilos.grupoChips}>
              {SINTOMAS_ALVO.map((sintoma) => (
                <Chip key={sintoma} texto={sintoma} selecionado={sintomaAlvo === sintoma} onPress={() => setSintomaAlvo(sintoma)} />
              ))}
            </View>
          </View>
        </Cartao>

        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Subtitulo>Itens da prescrição</Subtitulo>
          </View>

          <View style={{ gap: espacamento.sm, marginTop: espacamento.sm }}>
            {itens.map((item) => (
              <Cartao key={item.chave}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Corpo style={{ flex: 1 }}>{item.produtoNome}</Corpo>
                  <Pressable onPress={() => removerItem(item.chave)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={20} color={cores.terracotaEscura} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', gap: espacamento.xs, marginTop: espacamento.xs }}>
                  <Selo texto={`CBD ${item.teorCbd}mg/mL`} tom="sucesso" />
                  <Selo texto={`THC ${item.teorThc}mg/mL`} tom="neutro" />
                </View>

                <View style={{ flexDirection: 'row', gap: espacamento.sm, marginTop: espacamento.sm }}>
                  <CampoTexto
                    rotulo="Dose inicial"
                    value={item.doseInicial}
                    aoMudar={(v) => atualizarItem(item.chave, 'doseInicial', v)}
                    keyboardType="decimal-pad"
                    estiloContainer={{ flex: 1 }}
                  />
                  <CampoTexto
                    rotulo="Unidade"
                    value={item.unidadeDose}
                    aoMudar={(v) => atualizarItem(item.chave, 'unidadeDose', v)}
                    estiloContainer={{ flex: 1 }}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: espacamento.sm, marginTop: espacamento.sm }}>
                  <CampoTexto
                    rotulo="Via de administração"
                    value={item.viaAdministracao}
                    aoMudar={(v) => atualizarItem(item.chave, 'viaAdministracao', v)}
                    estiloContainer={{ flex: 1 }}
                  />
                  <CampoTexto
                    rotulo="Duração (dias)"
                    value={item.duracaoDias}
                    aoMudar={(v) => atualizarItem(item.chave, 'duracaoDias', v)}
                    keyboardType="number-pad"
                    estiloContainer={{ flex: 1 }}
                  />
                </View>
                <View style={{ marginTop: espacamento.sm }}>
                  <CampoHorarios
                    valor={item.horarios}
                    aoMudar={(v) => atualizarItem(item.chave, 'horarios', v)}
                  />
                </View>
                <CampoTexto
                  rotulo="Instruções de uso"
                  value={item.instrucoesUso}
                  aoMudar={(v) => atualizarItem(item.chave, 'instrucoesUso', v)}
                  multiline
                  estiloContainer={{ marginTop: espacamento.sm }}
                />
              </Cartao>
            ))}

            {escolhendoProduto ? (
              <Cartao>
                <Legenda style={{ marginBottom: espacamento.sm }}>Escolha um produto</Legenda>
                {produtosDisponiveis.map((produto) => (
                  <Pressable key={produto.id} onPress={() => adicionarProduto(produto)} style={estilos.linhaProduto}>
                    <Corpo>{nomeExibicaoProduto(produto.nome, produto.teorCbd, produto.volumeMl)}</Corpo>
                    <CorpoSecundario>
                      CBD {produto.teorCbd}mg/mL · THC {produto.teorThc}mg/mL
                    </CorpoSecundario>
                  </Pressable>
                ))}
              </Cartao>
            ) : null}

            <Botao
              titulo="+ Adicionar produto"
              variante="secundario"
              onPress={() => setEscolhendoProduto((v) => !v)}
            />
          </View>
        </View>

        {erro ? <Legenda style={{ color: cores.terracotaEscura }}>{erro}</Legenda> : null}
      </ScrollView>

      <View style={[estilos.rodape, { borderTopColor: cores.borda, backgroundColor: cores.fundo }]}>
        <Botao
          titulo="Salvar rascunho"
          variante="secundario"
          tamanhoCompleto={false}
          estilo={{ flex: 1 }}
          onPress={lidarComSalvarRascunho}
        />
        <Botao
          titulo="Emitir prescrição"
          tamanhoCompleto={false}
          estilo={{ flex: 1 }}
          carregando={salvando}
          onPress={lidarComEmitir}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: espacamento.md,
    gap: espacamento.md,
    paddingBottom: espacamento.xxl,
  },
  faixaPaciente: {
    borderRadius: 12,
    padding: espacamento.sm,
  },
  grupoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento.xs,
  },
  linhaProduto: {
    minHeight: alvoToqueMinimo,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E3DFD6',
  },
  rodape: {
    flexDirection: 'row',
    gap: espacamento.sm,
    padding: espacamento.md,
    borderTopWidth: 1,
  },
});
