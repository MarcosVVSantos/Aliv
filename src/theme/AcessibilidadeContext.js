// Contexto de acessibilidade — as duas chaves da tela de Perfil precisam
// funcionar de verdade (ver CONTEXTO.md, seção 5). Envolve o app inteiro no
// app/_layout.js raiz e persiste a escolha em AsyncStorage, para sobreviver
// a reabertura do app.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { ESCALA_GRANDE, ESCALA_NORMAL, obterTipografia } from './tipografia';
import { obterCores } from './cores';

const CHAVE_STORAGE = '@aliv/acessibilidade';

const AcessibilidadeContext = createContext(null);

export function AcessibilidadeProvider({ children }) {
  const [textoGrande, setTextoGrande] = useState(false);
  const [altoContraste, setAltoContraste] = useState(false);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const salvo = await AsyncStorage.getItem(CHAVE_STORAGE);
        if (salvo) {
          const { textoGrande: tg, altoContraste: ac } = JSON.parse(salvo);
          setTextoGrande(Boolean(tg));
          setAltoContraste(Boolean(ac));
        }
      } catch {
        // Sem valor salvo ou storage indisponível — segue com o padrão.
      } finally {
        setCarregado(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!carregado) return;
    AsyncStorage.setItem(
      CHAVE_STORAGE,
      JSON.stringify({ textoGrande, altoContraste })
    ).catch(() => {});
  }, [textoGrande, altoContraste, carregado]);

  const valor = useMemo(() => {
    const escala = textoGrande ? ESCALA_GRANDE : ESCALA_NORMAL;
    return {
      textoGrande,
      altoContraste,
      carregado,
      alternarTextoGrande: () => setTextoGrande((v) => !v),
      alternarAltoContraste: () => setAltoContraste((v) => !v),
      cores: obterCores(altoContraste),
      tipografia: obterTipografia(escala),
    };
  }, [textoGrande, altoContraste, carregado]);

  return (
    <AcessibilidadeContext.Provider value={valor}>
      {children}
    </AcessibilidadeContext.Provider>
  );
}

// Nome pedido no CONTEXTO.md (contexto de acessibilidade), mas também expõe
// `cores`/`tipografia` já resolvidos — é o hook de tema do app inteiro.
export function useAcessibilidade() {
  const contexto = useContext(AcessibilidadeContext);
  if (!contexto) {
    throw new Error(
      'useAcessibilidade precisa ser usado dentro de <AcessibilidadeProvider>.'
    );
  }
  return contexto;
}

// Alias mais curto para uso em componentes de tela (cores + tipografia).
export const useTema = useAcessibilidade;
