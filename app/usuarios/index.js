// Listagem de usuários (collection `usuarios`), com filtro por tipo.

import TelaListagem from '../../src/components/TelaListagem';
import { TIPOS_USUARIO } from '../../src/components/formularios/FormularioUsuario';
import { listarUsuarios, nomeDoUsuario, removerUsuario } from '../../src/services/usuarioService';
import { formatarCPF, formatarTelefone } from '../../src/utils/formatadores';

const FILTRO = {
  valorInicial: 'todos',
  opcoes: [{ valor: 'todos', rotulo: 'Todos' }, ...TIPOS_USUARIO],
};

function rotuloDoTipo(tipo) {
  return TIPOS_USUARIO.find((t) => t.valor === tipo)?.rotulo ?? tipo;
}

// Campo que identifica cada tipo: CPF do paciente, conselho do profissional...
function camposDoUsuario(usuario) {
  const campos = [
    { rotulo: 'E-mail', valor: usuario.email },
    { rotulo: 'Telefone', valor: formatarTelefone(usuario.telefone) },
  ];

  if (usuario.tipo === 'paciente') {
    campos.unshift({ rotulo: 'CPF', valor: formatarCPF(usuario.paciente?.cpf) });
  } else if (usuario.tipo === 'profissional') {
    const p = usuario.profissional ?? {};
    campos.unshift({
      rotulo: 'Registro',
      valor: `${p.conselho ?? ''} ${p.num_registro ?? ''}-${p.uf_registro ?? ''} · ${p.especialidade ?? ''}`,
    });
  } else if (usuario.tipo === 'atendente') {
    campos.unshift({ rotulo: 'Cargo', valor: usuario.atendente?.cargo });
  }

  return campos;
}

export default function ListaUsuarios() {
  return (
    <TelaListagem
      titulo="Usuários"
      nomeSingular="usuário"
      filtro={FILTRO}
      carregar={listarUsuarios}
      excluir={(usuario) => removerUsuario(usuario.id)}
      rotaNovo="/usuarios/novo"
      rotaEditar={(usuario) => ({ pathname: '/usuarios/[id]', params: { id: usuario.id } })}
      tituloItem={nomeDoUsuario}
      seloItem={(usuario) => ({
        texto: usuario.ativo === false ? `${rotuloDoTipo(usuario.tipo)} · inativo` : rotuloDoTipo(usuario.tipo),
        tom: usuario.ativo === false ? 'neutro' : 'sucesso',
      })}
      camposItem={camposDoUsuario}
      textoBusca={(usuario) =>
        `${nomeDoUsuario(usuario)} ${usuario.email} ${usuario.paciente?.cpf ?? ''} ${
          usuario.profissional?.especialidade ?? ''
        }`
      }
    />
  );
}
