// Estado compartilhado entre os 4 passos do cadastro. Vive só na memória
// dessa navegação — nada é salvo de verdade até o passo 4 chamar
// authService.cadastrarPaciente(). Fica em src/hooks (não em app/) porque
// qualquer arquivo dentro de app/ é escaneado como rota pelo Expo Router,
// mesmo com nome começando com "_" — só "_layout" é especial.

import { createContext, useContext, useState } from 'react';

const CadastroContext = createContext(null);

const estadoInicial = {
  dadosPessoais: {
    nomeCompleto: '',
    cpf: '',
    dataNascimento: '', // string mascarada dd/mm/aaaa, convertida no passo 4
    sexo: '',
    telefone: '',
    email: '',
    senha: '',
  },
  endereco: {
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  },
  responsavelLegal: {
    necessario: false,
    nome: '',
    cpf: '',
    parentesco: '',
    telefone: '',
  },
  termo: {
    aceito: false,
    versao: '1.0',
  },
};

export function CadastroProvider({ children }) {
  const [dados, setDados] = useState(estadoInicial);

  function atualizarPasso(chave, valores) {
    setDados((atual) => ({ ...atual, [chave]: { ...atual[chave], ...valores } }));
  }

  return (
    <CadastroContext.Provider value={{ dados, atualizarPasso }}>
      {children}
    </CadastroContext.Provider>
  );
}

export function useCadastro() {
  const contexto = useContext(CadastroContext);
  if (!contexto) {
    throw new Error('useCadastro precisa ser usado dentro de <CadastroProvider>.');
  }
  return contexto;
}
