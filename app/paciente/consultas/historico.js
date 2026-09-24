// Existe como rota separada só porque a árvore de pastas da seção 4 do
// CONTEXTO.md lista `consultas/historico.js` — mas a seção 7.6 pede as duas
// visões (Próximas/Histórico) na mesma tela. Então aqui só repassamos pra
// paciente/(tabs)/consultas com o Histórico já selecionado, sem duplicar a UI.

import { Redirect } from 'expo-router';

export default function HistoricoConsultas() {
  return <Redirect href="/paciente/consultas?aba=historico" />;
}
