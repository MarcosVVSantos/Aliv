import { useLocalSearchParams } from 'expo-router';

import FormularioPrescricao from '../../src/components/formularios/FormularioPrescricao';

export default function AlterarPrescricao() {
  const { id } = useLocalSearchParams();
  return <FormularioPrescricao modo="editar" id={id} />;
}
