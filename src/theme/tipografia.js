// Tipografia única do app — Plus Jakarta Sans em todo lugar, botões e chips
// incluídos (ver CONTEXTO.md, seção 5). Carregada via
// @expo-google-fonts/plus-jakarta-sans, ver src/theme/useFontesCarregadas.js.

export const familias = {
  regular: 'PlusJakartaSans_400Regular',
  medio: 'PlusJakartaSans_500Medium',
  semiNegrito: 'PlusJakartaSans_600SemiBold',
  negrito: 'PlusJakartaSans_700Bold',
};

// Escala base. `escala` multiplica tudo — é o que a chave "Texto grande" do
// perfil altera (ver AcessibilidadeContext). Corpo nunca fica abaixo de 16px,
// mesmo na escala normal.
const escalaBase = {
  legenda: 14,
  corpo: 16,
  corpoGrande: 17,
  subtitulo: 20,
  titulo: 24,
  tituloGrande: 30,
};

export function obterTipografia(escala = 1) {
  const tamanho = (px) => Math.round(px * escala);

  return {
    legenda: {
      fontFamily: familias.medio,
      fontSize: tamanho(escalaBase.legenda),
      lineHeight: tamanho(escalaBase.legenda) * 1.4,
    },
    corpo: {
      fontFamily: familias.regular,
      fontSize: tamanho(escalaBase.corpo),
      lineHeight: tamanho(escalaBase.corpo) * 1.5,
    },
    corpoMedio: {
      fontFamily: familias.medio,
      fontSize: tamanho(escalaBase.corpo),
      lineHeight: tamanho(escalaBase.corpo) * 1.5,
    },
    corpoGrande: {
      fontFamily: familias.regular,
      fontSize: tamanho(escalaBase.corpoGrande),
      lineHeight: tamanho(escalaBase.corpoGrande) * 1.5,
    },
    subtitulo: {
      fontFamily: familias.semiNegrito,
      fontSize: tamanho(escalaBase.subtitulo),
      lineHeight: tamanho(escalaBase.subtitulo) * 1.3,
    },
    titulo: {
      fontFamily: familias.negrito,
      fontSize: tamanho(escalaBase.titulo),
      lineHeight: tamanho(escalaBase.titulo) * 1.25,
    },
    tituloGrande: {
      fontFamily: familias.negrito,
      fontSize: tamanho(escalaBase.tituloGrande),
      lineHeight: tamanho(escalaBase.tituloGrande) * 1.2,
    },
    botao: {
      fontFamily: familias.semiNegrito,
      fontSize: tamanho(escalaBase.corpo),
      lineHeight: tamanho(escalaBase.corpo) * 1.2,
    },
  };
}

export const ESCALA_NORMAL = 1;
export const ESCALA_GRANDE = 1.2;
