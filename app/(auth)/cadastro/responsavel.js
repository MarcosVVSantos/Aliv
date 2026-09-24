// Passo 3 de 4 — ver CONTEXTO.md, seção 7.3.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import CampoTexto from '../../../src/components/CampoTexto';
import Interruptor from '../../../src/components/Interruptor';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../../src/theme/espacamento';
import { formatarCPF, formatarTelefone } from '../../../src/utils/formatadores';
import { validarCPF, validarCampoObrigatorio, validarTelefone } from '../../../src/utils/validadores';
import { useCadastro } from '../../../src/hooks/useCadastro';
import RodapeCadastro from '../../../src/components/RodapeCadastro';

export default function Responsavel() {
  const router = useRouter();
  const { cores } = useTema();
  const { dados, atualizarPasso } = useCadastro();
  const [erros, setErros] = useState({});

  const r = dados.responsavelLegal;
  const definir = (campo) => (valor) => atualizarPasso('responsavelLegal', { [campo]: valor });

  function validar() {
    if (!r.necessario) {
      setErros({});
      return true;
    }
    const novosErros = {};
    if (!validarCampoObrigatorio(r.nome)) novosErros.nome = 'Informe o nome do responsável.';
    if (!validarCPF(r.cpf)) novosErros.cpf = 'CPF inválido.';
    if (!validarCampoObrigatorio(r.parentesco)) novosErros.parentesco = 'Informe o parentesco.';
    if (!validarTelefone(r.telefone)) novosErros.telefone = 'Telefone inválido.';

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  function avancar() {
    if (!validar()) return;
    router.push('/(auth)/cadastro/termo');
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: espacamento.lg, gap: espacamento.md }}>
        <View style={{ backgroundColor: cores.card, borderRadius: 16, padding: espacamento.md }}>
          <Interruptor
            rotulo="O paciente é menor ou precisa de responsável?"
            valor={r.necessario}
            aoMudar={definir('necessario')}
          />
        </View>

        {r.necessario ? (
          <>
            <CampoTexto
              rotulo="Nome do responsável"
              value={r.nome}
              aoMudar={definir('nome')}
              erro={erros.nome}
            />
            <CampoTexto
              rotulo="CPF do responsável"
              value={r.cpf}
              aoMudar={definir('cpf')}
              formatar={formatarCPF}
              erro={erros.cpf}
              keyboardType="number-pad"
              placeholder="000.000.000-00"
            />
            <CampoTexto
              rotulo="Parentesco"
              value={r.parentesco}
              aoMudar={definir('parentesco')}
              erro={erros.parentesco}
              placeholder="Ex.: mãe, pai, tutor…"
            />
            <CampoTexto
              rotulo="Telefone do responsável"
              value={r.telefone}
              aoMudar={definir('telefone')}
              formatar={formatarTelefone}
              erro={erros.telefone}
              keyboardType="phone-pad"
              placeholder="(00) 00000-0000"
            />
          </>
        ) : null}
      </ScrollView>
      <RodapeCadastro aoVoltar={() => router.back()} aoAvancar={avancar} />
    </View>
  );
}
