// Passo 2 de 4 — ver CONTEXTO.md, seção 7.3. CEP preenche automaticamente
// logradouro, bairro, cidade e UF via ViaCEP.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import CampoTexto from '../../../src/components/CampoTexto';
import { Legenda } from '../../../src/components/Texto';
import { useTema } from '../../../src/theme/AcessibilidadeContext';
import { espacamento } from '../../../src/theme/espacamento';
import { apenasDigitos, formatarCEP } from '../../../src/utils/formatadores';
import { buscarEnderecoPorCep } from '../../../src/utils/viacep';
import { validarCEP, validarCampoObrigatorio } from '../../../src/utils/validadores';
import { useCadastro } from '../../../src/hooks/useCadastro';
import RodapeCadastro from '../../../src/components/RodapeCadastro';

export default function Endereco() {
  const router = useRouter();
  const { cores } = useTema();
  const { dados, atualizarPasso } = useCadastro();
  const [erros, setErros] = useState({});
  const [buscandoCep, setBuscandoCep] = useState(false);

  const e = dados.endereco;
  const definir = (campo) => (valor) => atualizarPasso('endereco', { [campo]: valor });

  async function lidarComMudancaCep(textoFormatado) {
    definir('cep')(textoFormatado);
    const digitos = apenasDigitos(textoFormatado);
    if (digitos.length !== 8) return;

    setBuscandoCep(true);
    setErros((atual) => ({ ...atual, cep: undefined }));
    try {
      atualizarPasso('endereco', await buscarEnderecoPorCep(digitos));
    } catch (erro) {
      setErros((atual) => ({ ...atual, cep: erro.message }));
    } finally {
      setBuscandoCep(false);
    }
  }

  function validar() {
    const novosErros = {};
    if (!validarCEP(e.cep)) novosErros.cep = 'CEP inválido.';
    if (!validarCampoObrigatorio(e.logradouro)) novosErros.logradouro = 'Informe o logradouro.';
    if (!validarCampoObrigatorio(e.numero)) novosErros.numero = 'Informe o número.';
    if (!validarCampoObrigatorio(e.bairro)) novosErros.bairro = 'Informe o bairro.';
    if (!validarCampoObrigatorio(e.cidade)) novosErros.cidade = 'Informe a cidade.';
    if (!validarCampoObrigatorio(e.uf)) novosErros.uf = 'Informe a UF.';

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  function avancar() {
    if (!validar()) return;
    router.push('/(auth)/cadastro/responsavel');
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: espacamento.lg, gap: espacamento.md }}>
        <View>
          <CampoTexto
            rotulo="CEP"
            value={e.cep}
            aoMudar={lidarComMudancaCep}
            formatar={formatarCEP}
            erro={erros.cep}
            keyboardType="number-pad"
            placeholder="00000-000"
          />
          {buscandoCep ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacamento.xs, marginTop: espacamento.xs }}>
              <ActivityIndicator size="small" color={cores.primaria} />
              <Legenda>Buscando endereço…</Legenda>
            </View>
          ) : null}
        </View>
        <CampoTexto
          rotulo="Logradouro"
          value={e.logradouro}
          aoMudar={definir('logradouro')}
          erro={erros.logradouro}
          placeholder="Rua, avenida…"
        />
        <View style={{ flexDirection: 'row', gap: espacamento.md }}>
          <CampoTexto
            rotulo="Número"
            value={e.numero}
            aoMudar={definir('numero')}
            erro={erros.numero}
            keyboardType="number-pad"
            estiloContainer={{ flex: 1 }}
          />
          <CampoTexto
            rotulo="Complemento"
            value={e.complemento}
            aoMudar={definir('complemento')}
            placeholder="Opcional"
            estiloContainer={{ flex: 1 }}
          />
        </View>
        <CampoTexto
          rotulo="Bairro"
          value={e.bairro}
          aoMudar={definir('bairro')}
          erro={erros.bairro}
        />
        <View style={{ flexDirection: 'row', gap: espacamento.md }}>
          <CampoTexto
            rotulo="Cidade"
            value={e.cidade}
            aoMudar={definir('cidade')}
            erro={erros.cidade}
            estiloContainer={{ flex: 2 }}
          />
          <CampoTexto
            rotulo="UF"
            value={e.uf}
            aoMudar={(v) => definir('uf')(v.toUpperCase().slice(0, 2))}
            erro={erros.uf}
            autoCapitalize="characters"
            maxLength={2}
            estiloContainer={{ flex: 1 }}
          />
        </View>
      </ScrollView>
      <RodapeCadastro aoVoltar={() => router.back()} aoAvancar={avancar} />
    </View>
  );
}
