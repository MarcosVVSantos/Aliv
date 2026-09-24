// Listagem de registros diários (collection raiz `registros_diarios`).

import TelaListagem from '../../src/components/TelaListagem';
import { listarRegistros, removerRegistro } from '../../src/services/registroService';
import { formatarData } from '../../src/utils/formatadores';

// Os três estados de efeitos adversos: relatou, marcou "Nenhum" ou não preencheu.
function textoEfeitos(registro) {
  const efeitos = (registro.efeitos_adversos ?? []).map((e) => e.descricao);
  if (efeitos.length > 0) return efeitos.join(', ');
  return registro.sem_efeitos_adversos ? 'Nenhum' : 'Não preenchido';
}

export default function ListaRegistros() {
  return (
    <TelaListagem
      titulo="Registros diários"
      nomeSingular="registro"
      carregar={() => listarRegistros()}
      excluir={(registro) => removerRegistro(registro.id)}
      rotaNovo="/registros/novo"
      rotaEditar={(registro) => ({ pathname: '/registros/[id]', params: { id: registro.id } })}
      tituloItem={(registro) => `${registro.paciente_nome} — ${formatarData(registro.data)}`}
      seloItem={(registro) => ({
        texto: `Sintoma ${registro.escala_sintoma}/10`,
        tom: registro.escala_sintoma >= 7 ? 'perigo' : 'sucesso',
      })}
      camposItem={(registro) => [
        { rotulo: 'Paciente', valor: registro.paciente_nome },
        { rotulo: 'Humor', valor: registro.humor },
        { rotulo: 'Efeitos', valor: textoEfeitos(registro) },
      ]}
      textoBusca={(registro) =>
        `${registro.paciente_nome} ${formatarData(registro.data)} ${registro.humor ?? ''} ${registro.observacao ?? ''}`
      }
    />
  );
}
