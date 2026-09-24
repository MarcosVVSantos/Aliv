// Validação de campos de formulário. Cada função devolve `true`/`false`;
// a mensagem de erro fica na tela, que conhece o contexto do campo.

import { apenasDigitos } from './formatadores';

// Algoritmo oficial de dígito verificador do CPF (módulo 11). Rejeita
// sequências repetidas (111.111.111-11 etc.), que passariam no cálculo mas
// não são CPFs válidos.
export function validarCPF(cpf) {
  const digitos = apenasDigitos(cpf);
  if (digitos.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  const calcularDigito = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i += 1) {
      soma += Number(base[i]) * (base.length + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const digito1 = calcularDigito(digitos.slice(0, 9));
  const digito2 = calcularDigito(digitos.slice(0, 10));

  return digito1 === Number(digitos[9]) && digito2 === Number(digitos[10]);
}

export function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? '').trim());
}

export function validarTelefone(telefone) {
  const digitos = apenasDigitos(telefone);
  return digitos.length === 10 || digitos.length === 11;
}

export function validarCEP(cep) {
  return apenasDigitos(cep).length === 8;
}

// Regra simples e explícita pro usuário: mínimo 6 caracteres. Não é o app
// que guarda a senha (fica no Firebase Auth), então a validação aqui é só
// UX, não segurança de armazenamento.
export function validarSenha(senha) {
  return String(senha ?? '').length >= 6;
}

export function validarCampoObrigatorio(valor) {
  return String(valor ?? '').trim().length > 0;
}

export function validarDataNascimento(data) {
  if (!data) return false;
  const d = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(d.getTime())) return false;
  return d < new Date();
}
