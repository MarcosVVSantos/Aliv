// Documentos e receitas — ver CONTEXTO.md, seção 7.10. Mostra autorização
// da Anvisa e os termos de consentimento assinados, que o protótipo original
// esquecia.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import CabecalhoTela from '../../../src/components/CabecalhoTela';
import Cartao from '../../../src/components/Cartao';
import EstadoVazio from '../../../src/components/EstadoVazio';
import Selo from '../../../src/components/Selo';
import { Corpo, CorpoSecundario, Subtitulo } from '../../../src/components/Texto';
import TelaCarregando from '../../../src/components/TelaCarregando';
import useSessao from '../../../src/hooks/useSessao';
import { obterDocumentos } from '../../../src/services/usuarioService';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../../src/theme/espacamento';
import { situacaoAutorizacao } from '../../../src/utils/anvisa';
import { formatarData } from '../../../src/utils/formatadores';

const SELO_SITUACAO = {
  vigente: { texto: 'Vigente', tom: 'sucesso' },
  vence_em_breve: { texto: 'Vence em breve', tom: 'atencao' },
  vencida: { texto: 'Vencida', tom: 'perigo' },
  sem_validade: { texto: 'Sem validade cadastrada', tom: 'neutro' },
};

export default function Documentos() {
  const { cores } = useTema();
  const { sessao } = useSessao();
  const [documentos, setDocumentos] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    if (!sessao) return;
    setCarregando(true);
    setErro('');
    obterDocumentos(sessao.uid)
      .then(setDocumentos)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [sessao]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo }}>
        <CabecalhoTela titulo="Documentos e receitas" />
        <TelaCarregando />
      </View>
    );
  }

  if (erro) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo }}>
        <CabecalhoTela titulo="Documentos e receitas" />
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
      <CabecalhoTela titulo="Documentos e receitas" />
      <ScrollView contentContainerStyle={{ padding: espacamento.lg, gap: espacamento.md }}>
        <Subtitulo>Autorizações Anvisa</Subtitulo>
        {(documentos?.autorizacoesAnvisa ?? []).map((autorizacao) => {
          const situacao = situacaoAutorizacao(autorizacao);
          // Um valor manual que ainda não tem selo definido acima (ex.: uma
          // decisão nova) aparece com o texto exatamente como foi gravado —
          // ver src/utils/anvisa.js.
          const selo = SELO_SITUACAO[situacao] ?? { texto: situacao, tom: 'neutro' };
          return (
            <Cartao key={autorizacao.numero}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Corpo>{autorizacao.numero}</Corpo>
                  <CorpoSecundario>
                    {autorizacao.dataValidade ? `Válida até ${formatarData(autorizacao.dataValidade)}` : 'Sem validade cadastrada'}
                  </CorpoSecundario>
                </View>
                <Selo texto={selo.texto} tom={selo.tom} />
              </View>
            </Cartao>
          );
        })}

        <Subtitulo style={{ marginTop: espacamento.md }}>Termos de consentimento assinados</Subtitulo>
        {(documentos?.termos ?? []).map((termo, indice) => (
          <Cartao key={indice}>
            <Corpo>Versão {termo.versao}</Corpo>
            <CorpoSecundario>Assinado em {formatarData(termo.dataAssinatura)}</CorpoSecundario>
          </Cartao>
        ))}
      </ScrollView>
    </View>
  );
}
