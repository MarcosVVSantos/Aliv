// Esqueleto das telas de cadastro e alteração: cabeçalho com voltar,
// conteúdo rolável e rodapé fixo com as ações. O mesmo esqueleto serve para
// as 5 collections.

import { ScrollView, StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { espacamento } from '../theme/espacamento';
import Botao from './Botao';
import CabecalhoTela from './CabecalhoTela';
import ContainerWeb from './ContainerWeb';
import EstadoVazio from './EstadoVazio';
import TelaCarregando from './TelaCarregando';
import { Legenda } from './Texto';

export default function TelaFormulario({
  titulo,
  modo = 'novo', // 'novo' | 'editar'
  carregando = false, // carregando os dados do registro (modo editar)
  erroCarga,
  aoTentarNovamente,
  salvando = false,
  erroGeral,
  aoSalvar,
  aoCancelar,
  children,
}) {
  const { cores } = useTema();
  const editando = modo === 'editar';

  let conteudo;
  if (carregando) {
    conteudo = <TelaCarregando />;
  } else if (erroCarga) {
    conteudo = (
      <EstadoVazio
        icone="alert-circle-outline"
        titulo="Não foi possível carregar"
        texto={erroCarga}
        tituloBotao="Tentar novamente"
        aoPressionarBotao={aoTentarNovamente}
      />
    );
  } else {
    conteudo = (
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    );
  }

  const mostrarRodape = !carregando && !erroCarga;

  return (
    <ContainerWeb>
      <CabecalhoTela titulo={titulo} aoVoltar={aoCancelar} />
      <View style={{ flex: 1 }}>{conteudo}</View>
      {mostrarRodape ? (
        <View style={[estilos.rodape, { borderTopColor: cores.borda, backgroundColor: cores.fundo }]}>
          {erroGeral ? (
            <Legenda style={{ color: cores.terracotaEscura, marginBottom: espacamento.sm }}>{erroGeral}</Legenda>
          ) : null}
          <View style={estilos.botoes}>
            {editando ? (
              <Botao
                titulo="Cancelar"
                variante="secundario"
                tamanhoCompleto={false}
                desabilitado={salvando}
                onPress={aoCancelar}
                estilo={estilos.botao}
              />
            ) : null}
            <Botao
              titulo={editando ? 'Salvar alterações' : 'Salvar'}
              tamanhoCompleto={false}
              carregando={salvando}
              onPress={aoSalvar}
              estilo={estilos.botao}
            />
          </View>
        </View>
      ) : null}
    </ContainerWeb>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: espacamento.lg,
    paddingTop: espacamento.sm,
    gap: espacamento.md,
  },
  rodape: {
    padding: espacamento.md,
    borderTopWidth: 1,
  },
  botoes: {
    flexDirection: 'row',
    gap: espacamento.sm,
  },
  botao: {
    flex: 1,
  },
});
