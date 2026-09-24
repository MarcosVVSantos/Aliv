// Login — ver CONTEXTO.md, seção 7.2. Logo é a onda, nunca "+" (⚠️).

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import Botao from '../../src/components/Botao';
import CampoTexto from '../../src/components/CampoTexto';
import Logo from '../../src/components/Logo';
import { CorpoSecundario, Legenda, TituloGrande } from '../../src/components/Texto';
import { entrar } from '../../src/services/authService';
import { useTema } from '../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../src/theme/espacamento';
import { validarCampoObrigatorio, validarEmail } from '../../src/utils/validadores';

export default function Login() {
  const router = useRouter();
  const { cores } = useTema();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function lidarComEntrar() {
    setErro('');
    if (!validarEmail(email)) {
      setErro('Informe um e-mail válido.');
      return;
    }
    if (!validarCampoObrigatorio(senha)) {
      setErro('Informe sua senha.');
      return;
    }

    setEnviando(true);
    try {
      const sessao = await entrar(email, senha);
      router.replace(sessao.tipo === 'paciente' ? '/paciente/inicio' : '/clinico/agenda');
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[estilos.conteudo, { backgroundColor: cores.fundo }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={estilos.cabecalho}>
        <Logo tamanho={64} />
        <TituloGrande style={{ color: cores.primaria, marginTop: espacamento.sm }}>
          Aliv
        </TituloGrande>
      </View>

      <View style={{ gap: espacamento.md }}>
        <CampoTexto
          rotulo="E-mail"
          value={email}
          aoMudar={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder="seuemail@exemplo.com"
        />
        <CampoTexto
          rotulo="Senha"
          value={senha}
          aoMudar={setSenha}
          senha
          autoCapitalize="none"
          placeholder="Sua senha"
        />

        {erro ? <Legenda style={{ color: cores.terracotaEscura }}>{erro}</Legenda> : null}

        <Botao titulo="Entrar" onPress={lidarComEntrar} carregando={enviando} />

        <Botao
          titulo="Esqueci minha senha"
          variante="texto"
          onPress={() => router.push('/(auth)/esqueci-senha')}
        />
      </View>

      <View style={estilos.divisor}>
        <View style={[estilos.linha, { backgroundColor: cores.borda }]} />
        <Legenda>ou</Legenda>
        <View style={[estilos.linha, { backgroundColor: cores.borda }]} />
      </View>

      <Botao
        titulo="Criar conta de paciente"
        variante="secundario"
        onPress={() => router.push('/(auth)/cadastro/dados-pessoais')}
      />

      <CorpoSecundario style={estilos.rodape}>
        Profissionais recebem acesso pela clínica
      </CorpoSecundario>

      <Botao titulo="Voltar ao menu principal" variante="texto" onPress={() => router.replace('/')} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: espacamento.lg,
    paddingVertical: espacamento.xl,
    gap: espacamento.lg,
  },
  cabecalho: {
    alignItems: 'center',
    marginBottom: espacamento.sm,
  },
  divisor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
  },
  linha: {
    flex: 1,
    height: 1,
  },
  rodape: {
    textAlign: 'center',
    marginTop: espacamento.sm,
  },
});
