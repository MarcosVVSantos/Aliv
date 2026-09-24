// Renderiza os avisos de `avisar()` (src/utils/dialogo.js) na web. Montado
// uma vez no layout raiz.

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { espacamento } from '../theme/espacamento';
import { registrarOuvinteDeAviso } from '../utils/dialogo';
import Botao from './Botao';
import Sobreposicao from './Sobreposicao';
import { Corpo, Subtitulo } from './Texto';

export default function AvisoGlobal() {
  const { cores } = useTema();
  const [aviso, setAviso] = useState(null);

  useEffect(() => registrarOuvinteDeAviso(setAviso), []);

  function fechar(botao) {
    setAviso(null);
    botao?.onPress?.();
  }

  const botoes = aviso?.botoes ?? [];
  // O último botão é o "principal" (como no Alert nativo, que o coloca à direita).
  const ultimo = botoes[botoes.length - 1];

  return (
    <Sobreposicao visivel={Boolean(aviso)} aoFechar={() => fechar(botoes.length === 1 ? ultimo : null)}>
      <Subtitulo>{aviso?.titulo}</Subtitulo>
      {aviso?.mensagem ? (
        <Corpo style={{ marginTop: espacamento.sm, color: cores.textoSecundario }}>{aviso.mensagem}</Corpo>
      ) : null}
      <View style={estilos.botoes}>
        {botoes.map((botao, indice) => (
          <Botao
            key={`${botao.text}-${indice}`}
            titulo={botao.text ?? 'OK'}
            variante={indice === botoes.length - 1 ? 'primario' : 'secundario'}
            tamanhoCompleto={false}
            onPress={() => fechar(botao)}
            estilo={estilos.botao}
          />
        ))}
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
