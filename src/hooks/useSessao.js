// Pequeno hook de conveniência sobre authService.observarSessao — não está
// na árvore de pastas do CONTEXTO.md (seção 4), mas evita repetir o mesmo
// useEffect de sessão em toda tela das tabs e da área clínica.

import { useEffect, useState } from 'react';

import { obterSessaoAtual, observarSessao } from '../services/authService';

export default function useSessao() {
  const [sessao, setSessao] = useState(obterSessaoAtual());
  const [carregando, setCarregando] = useState(sessao === null);

  useEffect(() => {
    return observarSessao((atual) => {
      setSessao(atual);
      setCarregando(false);
    });
  }, []);

  return { sessao, carregando };
}
