// Controla o passo atual e a barra de progresso do cadastro (ver
// CONTEXTO.md, seção 4 e 7.3).

import { Stack, usePathname } from 'expo-router';
import { View } from 'react-native';

import BarraProgresso from '../../../src/components/BarraProgresso';
import CabecalhoTela from '../../../src/components/CabecalhoTela';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../../src/theme/espacamento';
import { CadastroProvider } from '../../../src/hooks/useCadastro';

const PASSOS = [
  { rota: 'dados-pessoais', nome: 'Dados pessoais' },
  { rota: 'endereco', nome: 'Endereço' },
  { rota: 'responsavel', nome: 'Responsável legal' },
  { rota: 'termo', nome: 'Termo de consentimento' },
];

export default function LayoutCadastro() {
  const pathname = usePathname();
  const { cores } = useTema();

  const indice = PASSOS.findIndex((p) => pathname.endsWith(p.rota));
  const passoAtual = indice >= 0 ? indice + 1 : 1;
  const nomePasso = PASSOS[indice >= 0 ? indice : 0].nome;

  return (
    <CadastroProvider>
      <View style={{ flex: 1, backgroundColor: cores.fundo }}>
        <CabecalhoTela titulo="Criar conta de paciente" />
        <View style={{ paddingHorizontal: espacamento.lg, paddingBottom: espacamento.md }}>
          <BarraProgresso passoAtual={passoAtual} totalPassos={4} nomePasso={nomePasso} />
        </View>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="dados-pessoais" />
          <Stack.Screen name="endereco" />
          <Stack.Screen name="responsavel" />
          <Stack.Screen name="termo" />
        </Stack>
      </View>
    </CadastroProvider>
  );
}
