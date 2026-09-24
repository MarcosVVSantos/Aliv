// Confirmação de ação destrutiva (excluir). Próprio, sem Alert.alert, para
// funcionar igual no celular e no navegador.

import { StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { espacamento } from '../theme/espacamento';
import Botao from './Botao';
import Sobreposicao from './Sobreposicao';
import { Corpo, Legenda, Subtitulo } from './Texto';

export default function ModalConfirmacao({
  visivel,
  titulo = 'Confirmar exclusão',
  mensagem,
  erro,
  textoConfirmar = 'Excluir',
  processando = false,
  aoConfirmar,
  aoCancelar,
}) {
  const { cores } = useTema();

  return (
    <Sobreposicao visivel={visivel} aoFechar={processando ? undefined : aoCancelar}>
      <Subtitulo>{titulo}</Subtitulo>
      <Corpo style={{ marginTop: espacamento.sm, color: cores.textoSecundario }}>{mensagem}</Corpo>
      {erro ? (
        <Legenda style={{ marginTop: espacamento.sm, color: cores.terracotaEscura }}>{erro}</Legenda>
      ) : null}
      <View style={estilos.botoes}>
        <Botao
          titulo="Cancelar"
          variante="secundario"
          tamanhoCompleto={false}
          desabilitado={processando}
          onPress={aoCancelar}
          estilo={estilos.botao}
        />
        <Botao
          titulo={textoConfirmar}
          variante="destrutivo"
          tamanhoCompleto={false}
          carregando={processando}
          onPress={aoConfirmar}
          estilo={estilos.botao}
        />
      </View>
    </Sobreposicao>
  );
}

const estilos = StyleSheet.create({
  botoes: {
    flexDirection: 'row',
    gap: espacamento.sm,
    marginTop: espacamento.lg,
  },
  botao: {
    flex: 1,
  },
});
