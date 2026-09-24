// Área do paciente. Só entra quem tem sessão de paciente: sem sessão vai
// para o login, e profissional/atendente vai para a área clínica.

import { Redirect, Stack } from 'expo-router';

import ContainerWeb from '../../src/components/ContainerWeb';
import TelaCarregando from '../../src/components/TelaCarregando';
import useSessao from '../../src/hooks/useSessao';

export default function LayoutPaciente() {
  const { sessao, carregando } = useSessao();

  if (carregando) return <TelaCarregando />;
  if (!sessao) return <Redirect href="/(auth)/login" />;
  if (sessao.tipo !== 'paciente') return <Redirect href="/clinico/agenda" />;

  return (
    <ContainerWeb>
      <Stack screenOptions={{ headerShown: false }} />
    </ContainerWeb>
  );
}
