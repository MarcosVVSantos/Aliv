// Wrappers finos de <Text> que já aplicam a tipografia do tema — evita
// repetir `style={[tipografia.corpo, { color: cores.textoPrincipal }]}` em
// toda tela.

import { Text } from 'react-native';

import { useTema } from '../theme/AcessibilidadeContext';

function TextoBase({ variante, corPadrao, style, ...props }) {
  const { cores, tipografia } = useTema();
  return (
    <Text
      style={[tipografia[variante], { color: cores[corPadrao] }, style]}
      {...props}
    />
  );
}

export function TituloGrande(props) {
  return <TextoBase variante="tituloGrande" corPadrao="textoPrincipal" {...props} />;
}

export function Titulo(props) {
  return <TextoBase variante="titulo" corPadrao="textoPrincipal" {...props} />;
}

export function Subtitulo(props) {
  return <TextoBase variante="subtitulo" corPadrao="textoPrincipal" {...props} />;
}

export function Corpo(props) {
  return <TextoBase variante="corpo" corPadrao="textoPrincipal" {...props} />;
}

export function CorpoMedio(props) {
  return <TextoBase variante="corpoMedio" corPadrao="textoPrincipal" {...props} />;
}

export function CorpoSecundario(props) {
  return <TextoBase variante="corpo" corPadrao="textoSecundario" {...props} />;
}

export function Legenda(props) {
  return <TextoBase variante="legenda" corPadrao="textoSecundario" {...props} />;
}
