import { useLocalSearchParams } from 'expo-router';

import FormularioProduto from '../../src/components/formularios/FormularioProduto';

export default function AlterarProduto() {
  const { id } = useLocalSearchParams();
  return <FormularioProduto modo="editar" id={id} />;
}
