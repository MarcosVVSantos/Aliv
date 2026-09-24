import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import Botao from '../../src/components/Botao';
import CabecalhoTela from '../../src/components/CabecalhoTela';
import CampoTexto from '../../src/components/CampoTexto';
import { CorpoSecundario, Legenda, Titulo } from '../../src/components/Texto';
import { recuperarSenha } from '../../src/services/authService';
import { useTema } from '../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../src/theme/espacamento';
import { validarEmail } from '../../src/utils/validadores';

export default function EsqueciSenha() {
  const router = useRouter();
  const { cores } = useTema();

  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function lidarComEnviar() {
    setErro('');
    if (!validarEmail(email)) {
      setErro('Informe um e-mail válido.');
      return;
    }

    setEnviando(true);
    try {
      await recuperarSenha(email);
      setEnviado(true);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <CabecalhoTela titulo="Recuperar senha" />
      <View style={{ padding: espacamento.lg, gap: espacamento.md }}>
        <Titulo>Esqueceu sua senha?</Titulo>
        <CorpoSecundario>
          Informe o e-mail da sua conta. Vamos enviar um link para você criar uma senha nova.
        </CorpoSecundario>

        {enviado ? (
          <CorpoSecundario style={{ color: cores.primaria }}>
            Se esse e-mail estiver cadastrado, você vai receber o link em instantes.
          </CorpoSecundario>
        ) : (
          <>
            <CampoTexto
              rotulo="E-mail"
              value={email}
              aoMudar={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="seuemail@exemplo.com"
            />
            {erro ? <Legenda style={{ color: cores.terracotaEscura }}>{erro}</Legenda> : null}
            <Botao titulo="Enviar link de recuperação" onPress={lidarComEnviar} carregando={enviando} />
          </>
        )}

        <Botao titulo="Voltar para o login" variante="texto" onPress={() => router.back()} />
      </View>
    </View>
  );
}
