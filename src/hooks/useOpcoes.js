// Carrega as opções de um select a partir de um serviço (ex.: pacientes,
// profissionais, produtos). Devolve { opcoes, itens, carregando, erro } — `itens`
// são os registros originais, para quando a tela precisa de mais campos.

import { useEffect, useState } from 'react';

// `carregar()` → Promise<[item]>; `paraOpcao(item)` → { valor, rotulo, descricao? }
export default function useOpcoes(carregar, paraOpcao) {
  const [itens, setItens] = useState([]);
  const [opcoes, setOpcoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let cancelado = false;
    carregar()
      .then((lista) => {
        if (cancelado) return;
        setItens(lista);
        setOpcoes(lista.map(paraOpcao));
      })
      .catch((e) => {
        if (!cancelado) setErro(e.message);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
    // As funções são recriadas a cada render; a carga acontece uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { opcoes, itens, carregando, erro };
}
