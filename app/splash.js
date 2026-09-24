// Splash — ver CONTEXTO.md, seção 7.1. Mostra só a marca e a assinatura
// enquanto a sessão persistida é verificada e, em seguida, segue para o menu
// principal (rota `/`).

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import Logo from '../src/components/Logo';
import { Corpo, TituloGrande } from '../src/components/Texto';
import { observarSessao } from '../src/services/authService';
import { useTema } from '../src/theme/AcessibilidadeContext';
import { espacamento } from '../src/theme/espacamento';
import { estadoApp } from '../src/utils/estadoApp';

// Tempo mínimo na tela, para a marca não piscar quando a sessão carrega
// instantaneamente.
const DURACAO_MINIMA_MS = 1200;

export default function Splash() {
  const router = useRouter();
  const { cores } = useTema();
  const [sessaoVerificada, setSessaoVerificada] = useState(false);
  const [tempoMinimoPassou, setTempoMinimoPassou] = useState(false);

  useEffect(() => observarSessao(() => setSessaoVerificada(true)), []);

  useEffect(() => {
    const espera = setTimeout(() => setTempoMinimoPassou(true), DURACAO_MINIMA_MS);
    return () => clearTimeout(espera);
  }, []);

  const pronta = sessaoVerificada && tempoMinimoPassou;

  useEffect(() => {
    if (!pronta) return;
    estadoApp.splashVista = true;
    router.replace('/');
  }, [pronta, router]);

  return (
    <View style={[estilos.base, { backgroundColor: cores.fundo }]}>
      <Logo tamanho={96} />
      <TituloGrande style={{ color: cores.primaria, marginTop: espacamento.md }}>
        Aliv
      </TituloGrande>
      <Corpo
        style={{
          color: cores.textoSecundario,
          marginTop: espacamento.xs,
          textAlign: 'center',
        }}
      >
        Cuidado que acompanha{'\n'}seu tratamento
      </Corpo>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacamento.lg,
  },
});
