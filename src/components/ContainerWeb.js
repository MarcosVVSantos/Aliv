// Fundo da tela + coluna central. Na web o conteúdo fica limitado a ~720px e
// centralizado, para formulário e lista não esticarem em monitor largo.

import { Platform, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';

export const LARGURA_MAXIMA_WEB = 720;

export default function ContainerWeb({ children, estilo }) {
  const { cores } = useTema();

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <View
        style={[
          { flex: 1, width: '100%' },
          Platform.OS === 'web' && { maxWidth: LARGURA_MAXIMA_WEB, alignSelf: 'center' },
          estilo,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
