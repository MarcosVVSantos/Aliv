// Passo 1 de 4 — ver CONTEXTO.md, seção 7.3.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import CampoTexto from '../../../src/components/CampoTexto';
import SeletorSegmentado from '../../../src/components/SeletorSegmentado';
import { Legenda } from '../../../src/components/Texto';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../../src/theme/espacamento';
import {
  dataDeTextoBR,
  formatarCPF,
  formatarDataDigitada,
  formatarTelefone,
} from '../../../src/utils/formatadores';
import {
  validarCPF,
  validarCampoObrigatorio,
  validarDataNascimento,
  validarEmail,
  validarSenha,
  validarTelefone,
} from '../../../src/utils/validadores';
import { useCadastro } from '../../../src/hooks/useCadastro';
import RodapeCadastro from '../../../src/components/RodapeCadastro';

const OPCOES_SEXO = [
  { valor: 'Feminino', rotulo: 'Feminino' },
  { valor: 'Masculino', rotulo: 'Masculino' },
  { valor: 'Outro', rotulo: 'Outro' },
];

export default function DadosPessoais() {
  const router = useRouter();
  const { cores } = useTema();
  const { dados, atualizarPasso } = useCadastro();
  const [erros, setErros] = useState({});

  const d = dados.dadosPessoais;
  const definir = (campo) => (valor) => atualizarPasso('dadosPessoais', { [campo]: valor });

  function validar() {
    const novosErros = {};
    if (!validarCampoObrigatorio(d.nomeCompleto)) novosErros.nomeCompleto = 'Informe o nome completo.';
    if (!validarCPF(d.cpf)) novosErros.cpf = 'CPF inválido.';
    if (!validarDataNascimento(dataDeTextoBR(d.dataNascimento))) {
      novosErros.dataNascimento = 'Informe uma data de nascimento válida.';
    }
    if (!d.sexo) novosErros.sexo = 'Selecione uma opção.';
    if (!validarTelefone(d.telefone)) novosErros.telefone = 'Telefone inválido.';
    if (!validarEmail(d.email)) novosErros.email = 'E-mail inválido.';
    if (!validarSenha(d.senha)) novosErros.senha = 'A senha precisa ter pelo menos 6 caracteres.';

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  function avancar() {
    if (!validar()) return;
    router.push('/(auth)/cadastro/endereco');
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: espacamento.lg, gap: espacamento.md }}>
        <CampoTexto
          rotulo="Nome completo"
          value={d.nomeCompleto}
          aoMudar={definir('nomeCompleto')}
          erro={erros.nomeCompleto}
          placeholder="Seu nome completo"
        />
        <CampoTexto
          rotulo="CPF"
          value={d.cpf}
          aoMudar={definir('cpf')}
          formatar={formatarCPF}
          erro={erros.cpf}
          keyboardType="number-pad"
          placeholder="000.000.000-00"
        />
        <CampoTexto
          rotulo="Data de nascimento"
          value={d.dataNascimento}
          aoMudar={definir('dataNascimento')}
          formatar={formatarDataDigitada}
          erro={erros.dataNascimento}
          keyboardType="number-pad"
          placeholder="dd/mm/aaaa"
        />
        <View>
          <Legenda style={{ marginBottom: espacamento.xs, color: cores.textoSecundario }}>
            Sexo
          </Legenda>
          <SeletorSegmentado opcoes={OPCOES_SEXO} valor={d.sexo} aoMudar={definir('sexo')} />
          {erros.sexo ? (
            <Legenda style={{ marginTop: espacamento.xs, color: cores.terracotaEscura }}>
              {erros.sexo}
            </Legenda>
          ) : null}
        </View>
        <CampoTexto
          rotulo="Telefone"
          value={d.telefone}
          aoMudar={definir('telefone')}
          formatar={formatarTelefone}
          erro={erros.telefone}
          keyboardType="phone-pad"
          placeholder="(00) 00000-0000"
        />
        <CampoTexto
          rotulo="E-mail"
          value={d.email}
          aoMudar={definir('email')}
          erro={erros.email}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="seuemail@exemplo.com"
        />
        <CampoTexto
          rotulo="Senha"
          value={d.senha}
          aoMudar={definir('senha')}
          erro={erros.senha}
          senha
          autoCapitalize="none"
          placeholder="Mínimo 6 caracteres"
        />
      </ScrollView>
      <RodapeCadastro mostrarVoltar={false} aoAvancar={avancar} />
    </View>
  );
}
