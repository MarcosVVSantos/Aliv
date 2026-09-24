// Perfil — ver CONTEXTO.md, seção 7.10.
// ⚠️ "Paciente desde" precisa ser igual ou anterior à primeira consulta —
// no mock, data_cadastro (mar/2025) é anterior à primeira consulta (abr/2025).

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import Avatar from '../../../src/components/Avatar';
import Cartao from '../../../src/components/Cartao';
import Interruptor from '../../../src/components/Interruptor';
import ItemLista from '../../../src/components/ItemLista';
import { CorpoSecundario, Legenda, Titulo } from '../../../src/components/Texto';
import useSessao from '../../../src/hooks/useSessao';
import { sair } from '../../../src/services/authService';
import { obterUsuario } from '../../../src/services/usuarioService';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../../src/theme/espacamento';
import { formatarMesAno } from '../../../src/utils/formatadores';
import { avisar } from '../../../src/utils/dialogo';

export default function Perfil() {
  const router = useRouter();
  const { cores, textoGrande, altoContraste, alternarTextoGrande, alternarAltoContraste } = useTema();
  const { sessao } = useSessao();
  const [usuario, setUsuario] = useState(null);
  const [erro, setErro] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!sessao) return;
      setErro('');
      obterUsuario(sessao.uid)
        .then(setUsuario)
        .catch((e) => setErro(e.message));
    }, [sessao])
  );

  async function lidarComSair() {
    await sair();
    router.replace('/(auth)/login');
  }

  return (
    <ScrollView style={{ backgroundColor: cores.fundo }} contentContainerStyle={estilos.conteudo}>
      <Titulo>Perfil</Titulo>

      {erro ? (
        <Cartao estilo={{ backgroundColor: cores.terracotaClara }}>
          <CorpoSecundario style={{ color: cores.terracotaEscura }}>{erro}</CorpoSecundario>
        </Cartao>
      ) : null}

      <View style={estilos.cabecalho}>
        <Avatar nome={usuario?.paciente?.nomeCompleto ?? ''} tamanho={64} />
        <View>
          <Titulo>{usuario?.paciente?.nomeCompleto ?? '...'}</Titulo>
          {usuario?.dataCadastro ? (
            <CorpoSecundario>Paciente desde {formatarMesAno(usuario.dataCadastro)}</CorpoSecundario>
          ) : null}
        </View>
      </View>

      <View style={estilos.secao}>
        <ItemLista icone="person-outline" titulo="Meus dados" onPress={() => router.push('/paciente/perfil/meus-dados')} />
        <ItemLista
          icone="document-text-outline"
          titulo="Documentos e receitas"
          onPress={() => router.push('/paciente/perfil/documentos')}
        />
        <ItemLista
          icone="chatbubbles-outline"
          titulo="Contato da clínica"
          onPress={() => router.push('/paciente/perfil/contato')}
        />
      </View>

      <View style={estilos.secao}>
        <Legenda style={{ marginBottom: espacamento.xs }}>ACESSIBILIDADE</Legenda>
        <Interruptor rotulo="Texto grande" valor={textoGrande} aoMudar={alternarTextoGrande} />
        <Interruptor
          rotulo="Alto contraste"
          descricao="Escurece textos e reforça bordas"
          valor={altoContraste}
          aoMudar={alternarAltoContraste}
        />
      </View>

      <View style={estilos.secao}>
        <ItemLista
          icone="notifications-outline"
          titulo="Notificações"
          onPress={() => avisar('Notificações', 'Você não tem notificações novas.')}
        />
        <ItemLista icone="help-circle-outline" titulo="Ajuda e suporte" onPress={() => router.push('/paciente/perfil/contato')} />
        <ItemLista icone="log-out-outline" titulo="Sair" cor={cores.terracotaEscura} onPress={lidarComSair} />
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: espacamento.lg,
    gap: espacamento.lg,
    paddingBottom: espacamento.xxl,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.md,
  },
  secao: {
    gap: 2,
  },
});
