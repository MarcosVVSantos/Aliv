import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AvisoGlobal from '../src/components/AvisoGlobal';
import { AcessibilidadeProvider } from '../src/theme/AcessibilidadeContext';
import useFontesCarregadas from '../src/theme/useFontesCarregadas';

// Chamado em escopo de módulo (não dentro de componente/hook), como pede a
// documentação do expo-splash-screen — senão o splash pode já estar
// escondido quando este código roda.
SplashScreen.preventAutoHideAsync();

export default function LayoutRaiz() {
  const fontesCarregadas = useFontesCarregadas();

  useEffect(() => {
    if (fontesCarregadas) SplashScreen.hideAsync();
  }, [fontesCarregadas]);

  if (!fontesCarregadas) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AcessibilidadeProvider>
          <StatusBar style="dark" />
          {/* Sem filhos explícitos: cada arquivo em app/ já vira uma rota
              sozinho, e screenOptions abaixo se aplica a todas elas. Pastas
              com o próprio _layout.js (auth, paciente, clinico) viram uma
              única entrada aqui; as pastas do CRUD (usuarios, consultas,
              prescricoes, produtos, registros) registram as rotas direto
              neste Stack raiz. */}
          <Stack screenOptions={{ headerShown: false }} />
          <AvisoGlobal />
        </AcessibilidadeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
