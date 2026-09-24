// Busca de endereço pelo CEP na API pública ViaCEP. Usada no cadastro do
// paciente e no formulário de usuários do CRUD.

import { apenasDigitos } from './formatadores';

// Devolve { logradouro, bairro, cidade, uf }. Lança Error com mensagem em
// português quando o CEP não existe ou a API não responde.
export async function buscarEnderecoPorCep(cep) {
  const digitos = apenasDigitos(cep);
  if (digitos.length !== 8) throw new Error('CEP inválido.');

  let json;
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
    json = await resposta.json();
  } catch {
    throw new Error('Não foi possível buscar o CEP agora. Preencha manualmente.');
  }

  if (json.erro) throw new Error('CEP não encontrado.');

  return {
    logradouro: json.logradouro ?? '',
    bairro: json.bairro ?? '',
    cidade: json.localidade ?? '',
    uf: json.uf ?? '',
  };
}
