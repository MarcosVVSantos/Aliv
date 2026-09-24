// Lista de horários do dia ("08:00", "20:00") de um item de prescrição. Tocar
// num horário já adicionado o remove. Os horários dizem *quando* cada dose é
// esperada — "2× ao dia" é calculado a partir da quantidade deles.

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import Botao from './Botao';
import CampoTexto from './CampoTexto';
import Chip from './Chip';
import { Legenda } from './Texto';
import { useTema } from '../theme/AcessibilidadeContext';
import { espacamento } from '../theme/espacamento';
import { formatarHoraDigitada, horaDeTexto } from '../utils/formatadores';
import { normalizarHorarios } from '../utils/prescricao';

export default function CampoHorarios({ rotulo = 'Horários das doses', valor = [], aoMudar, erro }) {
  const { cores } = useTema();
  const [texto, setTexto] = useState('');
  const [erroLocal, setErroLocal] = useState('');

  function adicionar() {
    const hora = horaDeTexto(texto);
    if (!hora) {
      setErroLocal('Informe um horário válido (00:00 a 23:59).');
      return;
    }
    const horario = `${String(hora.hora).padStart(2, '0')}:${String(hora.minuto).padStart(2, '0')}`;
    aoMudar(normalizarHorarios([...valor, horario]));
    setTexto('');
    setErroLocal('');
  }

  function remover(horario) {
    aoMudar(valor.filter((h) => h !== horario));
  }

  return (
    <View style={{ gap: espacamento.sm }}>
      <Legenda style={{ color: cores.textoSecundario }}>{rotulo}</Legenda>
      {valor.length > 0 ? (
        <View style={estilos.chips}>
          {valor.map((horario) => (
            <Chip key={horario} texto={`${horario}  ✕`} selecionado onPress={() => remover(horario)} />
          ))}
        </View>
      ) : null}
      <View style={estilos.linha}>
        <CampoTexto
          value={texto}
          aoMudar={(t) => {
            setTexto(t);
            setErroLocal('');
          }}
          formatar={formatarHoraDigitada}
          keyboardType="number-pad"
          placeholder="HH:mm"
          erro={erroLocal || undefined}
          estiloContainer={{ flex: 1 }}
        />
        <Botao titulo="Adicionar" variante="secundario" tamanhoCompleto={false} onPress={adicionar} />
      </View>
      {erro ? <Legenda style={{ color: cores.terracotaEscura }}>{erro}</Legenda> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento.sm,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacamento.sm,
  },
});
