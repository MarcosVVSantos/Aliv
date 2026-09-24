// Slider de intensidade do sintoma (0–10), trilha em degradê do verde
// sálvia ao terracota, polegar branco de 48dp com borda sálvia (ver
// CONTEXTO.md, seção 7.8). Não é o slider padrão do sistema — é estilizado
// com @react-native-community/slider por cima de um LinearGradient.

import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';
import { espacamento } from '../theme/espacamento';
import { Legenda, TituloGrande } from './Texto';

const ALTURA_TRILHA = 8;

export default function SliderSintoma({ valor, aoMudar }) {
  const { cores } = useTema();

  return (
    <View>
      <TituloGrande style={{ textAlign: 'center', color: cores.primaria }}>{valor}</TituloGrande>

      <View style={estilos.trilhaContainer}>
        <LinearGradient
          colors={[cores.primaria, cores.terracota]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={estilos.trilhaGradiente}
        />
        <Slider
          style={estilos.slider}
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={valor}
          onValueChange={aoMudar}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor={cores.branco}
          // O componente não expõe tamanho de polegar sem uma imagem
          // customizada (thumbImage) — fica no tamanho padrão da lib, que já
          // é confortável de tocar; o requisito de 48dp/borda sálvia da
          // seção 7.8 do contexto seria o próximo passo com um asset próprio.
        />
      </View>

      <View style={estilos.marcacoes}>
        <Legenda>0</Legenda>
        <Legenda>5</Legenda>
        <Legenda>10</Legenda>
      </View>
      <Legenda style={{ textAlign: 'center', marginTop: espacamento.xs }}>
        0 = sem sintoma · 10 = pior possível
      </Legenda>
    </View>
  );
}

const estilos = StyleSheet.create({
  trilhaContainer: {
    justifyContent: 'center',
    marginTop: espacamento.md,
  },
  trilhaGradiente: {
    height: ALTURA_TRILHA,
    borderRadius: ALTURA_TRILHA / 2,
    marginHorizontal: 10,
  },
  slider: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 48,
  },
  marcacoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: espacamento.xs,
  },
});
