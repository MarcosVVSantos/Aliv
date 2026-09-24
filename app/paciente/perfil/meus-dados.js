import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import Botao from '../../../src/components/Botao';
import CabecalhoTela from '../../../src/components/CabecalhoTela';
import CampoTexto from '../../../src/components/CampoTexto';
import EstadoVazio from '../../../src/components/EstadoVazio';
import { Subtitulo } from '../../../src/components/Texto';
import TelaCarregando from '../../../src/components/TelaCarregando';
import useSessao from '../../../src/hooks/useSessao';
import { obterUsuario, atualizarDadosPaciente } from '../../../src/services/usuarioService';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../../src/theme/espacamento';
import { formatarCEP, formatarTelefone } from '../../../src/utils/formatadores';
import { avisar } from '../../../src/utils/dialogo';

export default function MeusDados() {
  const { cores } = useTema();
  const { sessao } = useSessao();

  const [nomeCompleto, setNomeCompleto] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    if (!sessao) return;
    setCarregando(true);
    setErro('');
    obterUsuario(sessao.uid)
      .then((usuario) => {
        setNomeCompleto(usuario.paciente?.nomeCompleto ?? '');
        setTelefone(usuario.telefone ?? '');
        setEmail(usuario.email ?? '');
        setEndereco(usuario.paciente?.endereco ?? {});
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [sessao]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  async function lidarComSalvar() {
    setSalvando(true);
    try {
      await atualizarDadosPaciente(sessao.uid, { nomeCompleto, telefone, email, endereco });
      avisar('Dados atualizados', 'Suas informações foram salvas.');
    } catch (e) {
      avisar('Não foi possível salvar', e.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo }}>
        <CabecalhoTela titulo="Meus dados" />
        <TelaCarregando />
      </View>
    );
  }

  if (erro) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo }}>
        <CabecalhoTela titulo="Meus dados" />
        <EstadoVazio
          icone="alert-circle-outline"
          titulo="Não foi possível carregar"
          texto={erro}
          tituloBotao="Tentar novamente"
          aoPressionarBotao={carregar}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <CabecalhoTela titulo="Meus dados" />
      <ScrollView contentContainerStyle={{ padding: espacamento.lg, gap: espacamento.md }}>
        <CampoTexto rotulo="Nome completo" value={nomeCompleto} aoMudar={setNomeCompleto} />
        <CampoTexto
          rotulo="Telefone"
          value={telefone}
          aoMudar={setTelefone}
          formatar={formatarTelefone}
          keyboardType="phone-pad"
        />
        <CampoTexto rotulo="E-mail" value={email} aoMudar={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <Subtitulo style={{ marginTop: espacamento.sm }}>Endereço</Subtitulo>
        <CampoTexto
          rotulo="CEP"
          value={endereco.cep ?? ''}
          aoMudar={(v) => setEndereco((a) => ({ ...a, cep: v }))}
          formatar={formatarCEP}
          keyboardType="number-pad"
        />
        <CampoTexto
          rotulo="Logradouro"
          value={endereco.logradouro ?? ''}
          aoMudar={(v) => setEndereco((a) => ({ ...a, logradouro: v }))}
        />
        <View style={{ flexDirection: 'row', gap: espacamento.md }}>
          <CampoTexto
            rotulo="Número"
            value={endereco.numero ?? ''}
            aoMudar={(v) => setEndereco((a) => ({ ...a, numero: v }))}
            estiloContainer={{ flex: 1 }}
          />
          <CampoTexto
            rotulo="Complemento"
            value={endereco.complemento ?? ''}
            aoMudar={(v) => setEndereco((a) => ({ ...a, complemento: v }))}
            estiloContainer={{ flex: 1 }}
          />
        </View>
        <CampoTexto
          rotulo="Bairro"
          value={endereco.bairro ?? ''}
          aoMudar={(v) => setEndereco((a) => ({ ...a, bairro: v }))}
        />
        <View style={{ flexDirection: 'row', gap: espacamento.md }}>
          <CampoTexto
            rotulo="Cidade"
            value={endereco.cidade ?? ''}
            aoMudar={(v) => setEndereco((a) => ({ ...a, cidade: v }))}
            estiloContainer={{ flex: 2 }}
          />
          <CampoTexto
            rotulo="UF"
            value={endereco.uf ?? ''}
            aoMudar={(v) => setEndereco((a) => ({ ...a, uf: v.toUpperCase().slice(0, 2) }))}
            estiloContainer={{ flex: 1 }}
          />
        </View>

        <Botao titulo="Salvar" onPress={lidarComSalvar} carregando={salvando} />
      </ScrollView>
    </View>
  );
}
