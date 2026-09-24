import { useLocalSearchParams } from 'expo-router';

import FormularioConsulta from '../../src/components/formularios/FormularioConsulta';

export default function AlterarConsulta() {
  const { id } = useLocalSearchParams();
  return <FormularioConsulta modo="editar" id={id} />;
}
