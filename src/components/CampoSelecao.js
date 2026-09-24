// Select: campo que mostra a opção escolhida e abre uma janela com a lista.
// Usado para escolher paciente, profissional, consulta, produto e valores
// de listas fixas. Com muitas opções, mostra um campo de busca.

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { alvoToqueMinimo, espacamento } from '../theme/espacamento';
import { normalizarTexto } from '../utils/formatadores';
import CampoTexto from './CampoTexto';
import Sobreposicao from './Sobreposicao';
import { Corpo, CorpoSecundario, Legenda, Subtitulo } from './Texto';

const LIMITE_PARA_BUSCA = 8;

// opcoes: [{ valor, rotulo, descricao? }]
export default function CampoSelecao({
  rotulo,
  valor,
  opcoes,
  aoMudar,
  placeholder = 'Selecione',
  erro,
  desabilitado = false,
  carregando = false,
  textoVazio = 'Nenhuma opção disponível.',
}) {
  const { cores, tipografia } = useTema();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const selecionada = opcoes.find((o) => o.valor === valor);
  const termo = normalizarTexto(busca);
  const filtradas = termo
    ? opcoes.filter((o) => normalizarTexto(`${o.rotulo} ${o.descricao ?? ''}`).includes(termo))
    : opcoes;

  function abrir() {
    if (desabilitado) return;
    setBusca('');
    setAberto(true);
  }

  function escolher(opcao) {
    aoMudar(opcao.valor);
    setAberto(false);
  }

  return (
    <View style={estilos.container}>
      {rotulo ? (
        <Legenda style={{ marginBottom: espacamento.xs, color: cores.textoSecundario }}>{rotulo}</Legenda>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        accessibilityState={{ disabled: desabilitado }}
        onPress={abrir}
        style={[
          estilos.campo,
          {
            borderColor: erro ? cores.terracotaEscura : cores.borda,
            backgroundColor: desabilitado ? cores.verdeClaro : cores.card,
            opacity: desabilitado ? 0.7 : 1,
          },
        ]}
      >
        <Corpo
          numberOfLines={1}
          style={{
            flex: 1,
            color: selecionada ? cores.textoPrincipal : cores.textoSecundario,
          }}
        >
          {selecionada?.rotulo ?? placeholder}
        </Corpo>
        {carregando ? (
          <ActivityIndicator size="small" color={cores.primaria} />
        ) : (
          <Ionicons name="chevron-down" size={20} color={cores.textoSecundario} />
        )}
      </Pressable>
      {erro ? (
        <Legenda style={{ marginTop: espacamento.xs, color: cores.terracotaEscura }}>{erro}</Legenda>
      ) : null}

      <Sobreposicao visivel={aberto} aoFechar={() => setAberto(false)}>
        <Subtitulo style={{ marginBottom: espacamento.sm }}>{rotulo ?? 'Selecione'}</Subtitulo>
        {opcoes.length > LIMITE_PARA_BUSCA ? (
          <CampoTexto
            value={busca}
            aoMudar={setBusca}
            placeholder="Buscar"
            estiloContainer={{ marginBottom: espacamento.sm }}
          />
        ) : null}
        <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
          {filtradas.length === 0 ? (
            <CorpoSecundario style={{ paddingVertical: espacamento.md }}>{textoVazio}</CorpoSecundario>
          ) : (
            filtradas.map((opcao) => {
              const ativa = opcao.valor === valor;
              return (
                <Pressable
                  key={String(opcao.valor)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativa }}
                  onPress={() => escolher(opcao)}
                  style={[estilos.opcao, { borderBottomColor: cores.borda }]}
                >
                  <View style={{ flex: 1 }}>
                    <Corpo style={ativa ? { fontFamily: tipografia.subtitulo.fontFamily } : null}>
                      {opcao.rotulo}
                    </Corpo>
                    {opcao.descricao ? <Legenda>{opcao.descricao}</Legenda> : null}
                  </View>
                  {ativa ? <Ionicons name="checkmark" size={22} color={cores.primaria} /> : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </Sobreposicao>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    width: '100%',
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: alvoToqueMinimo,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: espacamento.md,
    gap: espacamento.sm,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: alvoToqueMinimo,
    paddingVertical: espacamento.sm,
    borderBottomWidth: 1,
    gap: espacamento.sm,
  },
});
