// Tab bar de 5 itens do paciente (ver CONTEXTO.md, seção 4).

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { familias } from '../../../src/theme/tipografia';

const ICONES = {
  inicio: 'home',
  tratamento: 'medkit',
  consultas: 'calendar',
  diario: 'book',
  perfil: 'person-circle',
};

export default function LayoutTabs() {
  const { cores } = useTema();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoSecundario,
        tabBarStyle: {
          backgroundColor: cores.card,
          borderTopColor: cores.borda,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: familias.medio,
          fontSize: 14,
        },
        tabBarIcon: ({ color, focused }) => (
          <Ionicons
            name={focused ? ICONES[route.name] : `${ICONES[route.name]}-outline`}
            size={24}
            color={color}
          />
        ),
      })}
    >
      <Tabs.Screen name="inicio" options={{ title: 'Início' }} />
      <Tabs.Screen name="tratamento" options={{ title: 'Tratamento' }} />
      <Tabs.Screen name="consultas" options={{ title: 'Consultas' }} />
      <Tabs.Screen name="diario" options={{ title: 'Diário' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
