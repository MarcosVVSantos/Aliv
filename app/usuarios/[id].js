import { useLocalSearchParams } from 'expo-router';

import FormularioUsuario from '../../src/components/formularios/FormularioUsuario';

export default function AlterarUsuario() {
  const { id } = useLocalSearchParams();
  return <FormularioUsuario modo="editar" id={id} />;
}
