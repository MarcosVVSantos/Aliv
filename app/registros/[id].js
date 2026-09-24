import { useLocalSearchParams } from 'expo-router';

import FormularioRegistro from '../../src/components/formularios/FormularioRegistro';

export default function AlterarRegistro() {
  const { id } = useLocalSearchParams();
  return <FormularioRegistro modo="editar" id={id} />;
}
