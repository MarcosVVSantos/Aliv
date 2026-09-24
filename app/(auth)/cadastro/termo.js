// Passo 4 de 4 — ver CONTEXTO.md, seção 7.3. Botão só habilita depois de
// marcar "Li e aceito".

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import CaixaSelecao from '../../../src/components/CaixaSelecao';
import { Corpo, Legenda, Subtitulo } from '../../../src/components/Texto';
import { cadastrarPaciente } from '../../../src/services/authService';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../../src/theme/espacamento';
import { dataDeTextoBR } from '../../../src/utils/formatadores';
import { useCadastro } from '../../../src/hooks/useCadastro';
import RodapeCadastro from '../../../src/components/RodapeCadastro';

const TEXTO_TERMO = `Ao aceitar este termo, você concorda com o tratamento com produtos à base de cannabis medicinal conduzido pela equipe da clínica Aliv, mediante prescrição de profissional habilitado.

Você declara estar ciente de que:

• O tratamento é acompanhado por profissionais de saúde e depende de avaliação clínica contínua;
• Os dados registrados no Diário de sintomas (doses, intensidade dos sintomas, efeitos colaterais) serão usados pela equipe clínica para ajustar sua prescrição;
• A prescrição segue as normas da Anvisa para produtos à base de cannabis, e a autorização de uso tem validade determinada, renovável mediante nova avaliação;
• Seus dados pessoais e de saúde são tratados conforme a Lei Geral de Proteção de Dados (LGPD) e usados apenas para fins do seu acompanhamento clínico;
• Você pode revogar este consentimento a qualquer momento, entrando em contato com a clínica.

Este é um documento de demonstração, usado apenas no protótipo acadêmico do Aliv.`;

export default function Termo() {
  const router = useRouter();
  const { cores } = useTema();
  const { dados, atualizarPasso } = useCadastro();
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function concluir() {
    if (!dados.termo.aceito) return;
    setErro('');
    setEnviando(true);
    try {
      await cadastrarPaciente({
        dadosPessoais: {
          ...dados.dadosPessoais,
          dataNascimento: dataDeTextoBR(dados.dadosPessoais.dataNascimento),
        },
        endereco: dados.endereco,
        responsavelLegal: dados.responsavelLegal,
        termo: dados.termo,
      });
      router.replace('/paciente/inicio');
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: espacamento.lg, gap: espacamento.md }}>
        <Subtitulo>Termo de consentimento</Subtitulo>
        <View
          style={{
            backgroundColor: cores.card,
            borderRadius: 16,
            padding: espacamento.md,
            maxHeight: 320,
          }}
        >
          <ScrollView>
            <Corpo style={{ color: cores.textoSecundario }}>{TEXTO_TERMO}</Corpo>
          </ScrollView>
        </View>

        <CaixaSelecao
          rotulo="Li e aceito o termo de consentimento"
          marcado={dados.termo.aceito}
          aoMudar={(valor) => atualizarPasso('termo', { aceito: valor })}
        />

        {erro ? <Legenda style={{ color: cores.terracotaEscura }}>{erro}</Legenda> : null}
      </ScrollView>
      <RodapeCadastro
        aoVoltar={() => router.back()}
        aoAvancar={concluir}
        tituloAvancar="Concluir cadastro"
        avancarDesabilitado={!dados.termo.aceito}
        avancando={enviando}
      />
    </View>
  );
}
