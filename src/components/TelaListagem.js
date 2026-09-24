// Listagem padrão do CRUD — a mesma tela para as 5 collections. Cuida de
// busca em memória, botão "+ Cadastrar", cartões com Editar/Excluir,
// confirmação de exclusão e dos estados carregando / vazio / erro.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { espacamento } from '../theme/espacamento';
import { normalizarTexto } from '../utils/formatadores';
import Botao from './Botao';
import CabecalhoTela from './CabecalhoTela';
import CampoTexto from './CampoTexto';
import Cartao from './Cartao';
import Chip from './Chip';
import ContainerWeb from './ContainerWeb';
import EstadoVazio from './EstadoVazio';
import ModalConfirmacao from './ModalConfirmacao';
import Selo from './Selo';
import { Corpo, CorpoSecundario, Legenda, Subtitulo } from './Texto';

// Props:
//  titulo, nomeSingular      "Produtos", "produto"
//  carregar(filtro)          → Promise<[item]> (cada item precisa de `id`)
//  excluir(item)             → Promise<void>
//  rotaNovo                  ex.: '/produtos/novo'
//  rotaEditar(item)          → href da alteração
//  tituloItem(item)          nome mostrado no cartão e na confirmação
//  seloItem(item)            { texto, tom } opcional
//  camposItem(item)          [{ rotulo, valor }] — de 2 a 4 campos
//  textoBusca(item)          texto em que a busca procura
//  filtro                    { opcoes: [{ valor, rotulo }], valorInicial } opcional
export default function TelaListagem({
  titulo,
  nomeSingular,
  carregar,
  excluir,
  rotaNovo,
  rotaEditar,
  tituloItem,
  seloItem,
  camposItem,
  textoBusca,
  filtro,
}) {
  const router = useRouter();
  const { cores } = useTema();

  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [valorFiltro, setValorFiltro] = useState(filtro?.valorInicial);
  const [paraExcluir, setParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      setItens(await carregar(valorFiltro));
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
    // `carregar` é recriada a cada render da tela; só o filtro deve disparar
    // uma nova busca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorFiltro]);

  // Recarrega ao voltar do cadastro/alteração e ao trocar o filtro.
  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar])
  );

  const visiveis = useMemo(() => {
    const termo = normalizarTexto(busca.trim());
    if (!termo) return itens;
    return itens.filter((item) => normalizarTexto(textoBusca(item)).includes(termo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, busca]);

  async function confirmarExclusao() {
    setExcluindo(true);
    setErroExclusao('');
    try {
      await excluir(paraExcluir);
      setParaExcluir(null);
      await recarregar();
    } catch (e) {
      setErroExclusao(e.message);
    } finally {
      setExcluindo(false);
    }
  }

  function cancelarExclusao() {
    setParaExcluir(null);
    setErroExclusao('');
  }

  function corpo() {
    if (carregando) {
      return (
        <View style={estilos.centro}>
          <ActivityIndicator size="large" color={cores.primaria} />
          <CorpoSecundario style={{ marginTop: espacamento.sm }}>Carregando...</CorpoSecundario>
        </View>
      );
    }

    if (erro) {
      return (
        <EstadoVazio
          icone="alert-circle-outline"
          titulo="Não foi possível carregar"
          texto={erro}
          tituloBotao="Tentar novamente"
          aoPressionarBotao={recarregar}
        />
      );
    }

    if (itens.length === 0) {
      return (
        <EstadoVazio
          icone="file-tray-outline"
          titulo={`Nenhum ${nomeSingular} cadastrado`}
          texto="Use o botão abaixo para fazer o primeiro cadastro."
          tituloBotao="+ Cadastrar"
          aoPressionarBotao={() => router.push(rotaNovo)}
        />
      );
    }

    if (visiveis.length === 0) {
      return (
        <EstadoVazio
          icone="search-outline"
          titulo="Nenhum resultado"
          texto={`Nada encontrado para "${busca.trim()}".`}
        />
      );
    }

    return (
      <View style={{ gap: espacamento.md }}>
        <Legenda>
          {visiveis.length} {visiveis.length === 1 ? 'registro' : 'registros'}
        </Legenda>
        {visiveis.map((item) => {
          const selo = seloItem?.(item);
          return (
            <Cartao key={item.id}>
              <View style={estilos.linhaTitulo}>
                <Subtitulo style={{ flex: 1 }} numberOfLines={2}>
                  {tituloItem(item)}
                </Subtitulo>
                {selo ? <Selo texto={selo.texto} tom={selo.tom} /> : null}
              </View>
              <View style={{ marginTop: espacamento.sm, gap: 2 }}>
                {camposItem(item).map((campo) => (
                  <View key={campo.rotulo} style={estilos.campo}>
                    <Corpo style={{ color: cores.textoSecundario }}>{campo.rotulo}: </Corpo>
                    <Corpo style={{ flex: 1 }}>{campo.valor || '—'}</Corpo>
                  </View>
                ))}
              </View>
              <View style={estilos.acoes}>
                <Botao
                  titulo="Editar"
                  icone="create-outline"
                  variante="secundario"
                  tamanhoCompleto={false}
                  estilo={estilos.acao}
                  onPress={() => router.push(rotaEditar(item))}
                />
                <Botao
                  titulo="Excluir"
                  icone="trash-outline"
                  variante="perigo"
                  tamanhoCompleto={false}
                  estilo={estilos.acao}
                  onPress={() => setParaExcluir(item)}
                />
              </View>
            </Cartao>
          );
        })}
      </View>
    );
  }

  return (
    <ContainerWeb>
      <CabecalhoTela titulo={titulo} aoVoltar={() => router.replace('/')} />
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Botao
          titulo="+ Cadastrar"
          onPress={() => router.push(rotaNovo)}
          estilo={{ backgroundColor: cores.terracota, borderColor: cores.terracota }}
        />

        <View style={estilos.busca}>
          <Ionicons name="search-outline" size={20} color={cores.textoSecundario} />
          <CampoTexto
            value={busca}
            aoMudar={setBusca}
            placeholder={`Buscar ${nomeSingular}`}
            estiloContainer={{ flex: 1 }}
          />
        </View>

        {filtro ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.filtros}>
            {filtro.opcoes.map((opcao) => (
              <Chip
                key={opcao.valor}
                texto={opcao.rotulo}
                selecionado={opcao.valor === valorFiltro}
                onPress={() => setValorFiltro(opcao.valor)}
              />
            ))}
          </ScrollView>
        ) : null}

        {corpo()}
      </ScrollView>

      <ModalConfirmacao
        visivel={Boolean(paraExcluir)}
        mensagem={
          paraExcluir
            ? `Deseja excluir "${tituloItem(paraExcluir)}"? Essa ação não pode ser desfeita.`
            : ''
        }
        erro={erroExclusao}
        processando={excluindo}
        aoConfirmar={confirmarExclusao}
        aoCancelar={cancelarExclusao}
      />
    </ContainerWeb>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: espacamento.lg,
    paddingTop: espacamento.sm,
    gap: espacamento.md,
    paddingBottom: espacamento.xxl,
  },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
  },
  filtros: {
    gap: espacamento.sm,
  },
  centro: {
    alignItems: 'center',
    paddingVertical: espacamento.xxl,
  },
  linhaTitulo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacamento.sm,
  },
  campo: {
    flexDirection: 'row',
  },
  acoes: {
    flexDirection: 'row',
    gap: espacamento.sm,
    marginTop: espacamento.md,
  },
  acao: {
    flex: 1,
  },
});
