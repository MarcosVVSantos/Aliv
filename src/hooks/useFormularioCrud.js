// Lógica comum dos formulários de cadastro e alteração do CRUD: estado dos
// campos, carga do registro (modo "editar"), validação, salvar e voltar para
// a listagem. Cada formulário só informa como validar e como salvar.

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

// Opções:
//  modo            'novo' | 'editar'
//  id              id do registro (modo editar)
//  estadoInicial   valores dos campos num cadastro novo
//  carregar(id)    → Promise<documento>   (modo editar)
//  paraCampos(doc) → valores dos campos a partir do documento
//  validar(campos) → { campo: 'mensagem' } — objeto vazio quando válido
//  salvar(campos, { modo, id }) → Promise
//  rotaLista       para onde voltar quando não houver histórico (link direto)
export default function useFormularioCrud({
  modo,
  id,
  estadoInicial,
  carregar,
  paraCampos,
  validar,
  salvar,
  rotaLista,
}) {
  const router = useRouter();
  const editando = modo === 'editar';

  const [campos, setCampos] = useState(estadoInicial);
  const [erros, setErros] = useState({});
  const [carregando, setCarregando] = useState(editando);
  const [erroCarga, setErroCarga] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState('');
  const [tentativa, setTentativa] = useState(0);

  // Só atualiza estado nos callbacks da promessa; o estado inicial já é
  // "carregando" no modo editar. `tentativa` refaz a carga ("Tentar de novo").
  useEffect(() => {
    if (!editando) return undefined;
    let cancelado = false;
    carregar(id)
      .then((documento) => {
        if (cancelado) return;
        setCampos(paraCampos(documento));
        setErroCarga('');
      })
      .catch((e) => {
        if (!cancelado) setErroCarga(e.message);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
    // `carregar` e `paraCampos` são recriadas a cada render; só o id e a
    // tentativa devem disparar uma nova carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando, id, tentativa]);

  function carregarRegistro() {
    setCarregando(true);
    setErroCarga('');
    setTentativa((n) => n + 1);
  }

  // Devolve o setter de um campo; editar o campo limpa o erro dele.
  const definir = (campo) => (valor) => {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => (atual[campo] ? { ...atual, [campo]: undefined } : atual));
  };

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace(rotaLista);
  }

  async function enviar() {
    setErroGeral('');
    const novosErros = validar(campos);
    setErros(novosErros);
    if (Object.values(novosErros).some(Boolean)) {
      setErroGeral('Corrija os campos destacados antes de salvar.');
      return;
    }

    setSalvando(true);
    try {
      await salvar(campos, { modo, id });
      voltar();
    } catch (e) {
      setErroGeral(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return {
    campos,
    setCampos,
    erros,
    setErros,
    definir,
    enviar,
    voltar,
    carregarRegistro,
    propsTela: {
      modo,
      carregando,
      erroCarga,
      aoTentarNovamente: carregarRegistro,
      salvando,
      erroGeral,
      aoSalvar: enviar,
      aoCancelar: voltar,
    },
  };
}
