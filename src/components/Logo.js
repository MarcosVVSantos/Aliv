// Marca do Aliv: onda abstrata dentro de um círculo (sugere alívio e
// respiração). Usar em toda tela que precise da marca — login, splash,
// cabeçalho da área clínica. Nunca usar cruz, "+" ou folha de cannabis
// (ver CONTEXTO.md, seção 5).

import Svg, { Circle, Path } from 'react-native-svg';

import { useTema } from '../theme/AcessibilidadeContext';

export default function Logo({ tamanho = 64, variante = 'cheio' }) {
  const { cores } = useTema();
  const cheio = variante === 'cheio';

  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 64 64">
      <Circle
        cx={32}
        cy={32}
        r={30}
        fill={cheio ? cores.primaria : 'none'}
        stroke={cheio ? 'none' : cores.primaria}
        strokeWidth={cheio ? 0 : 2.5}
      />
      <Path
        d="M14 34c4-8 10-8 14 0s10 8 14 0"
        stroke={cheio ? cores.branco : cores.primaria}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M14 24c4-6 10-6 14 0s10 6 14 0"
        stroke={cheio ? cores.branco : cores.primaria}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
        opacity={0.55}
      />
    </Svg>
  );
}
