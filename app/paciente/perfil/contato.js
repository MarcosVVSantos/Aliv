// Contato da clínica / Central de ajuda — as duas entradas do menu ("Falar
// com a clínica", "Central de ajuda" e "Ajuda e suporte") levam para cá.

import { Ionicons } from '@expo/vector-icons';
import { Linking, ScrollView, View } from 'react-native';

import CabecalhoTela from '../../../src/components/CabecalhoTela';
import Cartao from '../../../src/components/Cartao';
import { Corpo, CorpoSecundario, Subtitulo } from '../../../src/components/Texto';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../../src/theme/espacamento';

const PERGUNTAS_FREQUENTES = [
  {
    pergunta: 'Como eu ajusto o horário de uma dose?',
    resposta: 'No Diário, toque em "Ajustar" na dose do dia e informe a quantidade e o horário reais.',
  },
  {
    pergunta: 'Minha receita está vencendo, o que eu faço?',
    resposta: 'Na aba Tratamento, toque em "Solicitar renovação" assim que o banner de vencimento aparecer.',
  },
  {
    pergunta: 'Posso trocar de profissional?',
    resposta: 'Fale com a recepção da clínica pelos canais abaixo para reorganizar seu acompanhamento.',
  },
];

export default function Contato() {
  const { cores } = useTema();

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <CabecalhoTela titulo="Contato e ajuda" />
      <ScrollView contentContainerStyle={{ padding: espacamento.lg, gap: espacamento.md }}>
        <Cartao>
          <Subtitulo>Fale com a clínica</Subtitulo>
          <View style={{ gap: espacamento.sm, marginTop: espacamento.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacamento.sm }}>
              <Ionicons name="call-outline" size={20} color={cores.primaria} />
              <Corpo onPress={() => Linking.openURL('tel:+551140028922')}>(11) 4002-8922</Corpo>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacamento.sm }}>
              <Ionicons name="mail-outline" size={20} color={cores.primaria} />
              <Corpo onPress={() => Linking.openURL('mailto:contato@alivclinica.com.br')}>
                contato@alivclinica.com.br
              </Corpo>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacamento.sm }}>
              <Ionicons name="time-outline" size={20} color={cores.primaria} />
              <Corpo>Segunda a sexta, 8h às 18h</Corpo>
            </View>
          </View>
        </Cartao>

        <Subtitulo>Perguntas frequentes</Subtitulo>
        {PERGUNTAS_FREQUENTES.map((item) => (
          <Cartao key={item.pergunta}>
            <Corpo>{item.pergunta}</Corpo>
            <CorpoSecundario style={{ marginTop: espacamento.xs }}>{item.resposta}</CorpoSecundario>
          </Cartao>
        ))}
      </ScrollView>
    </View>
  );
}
