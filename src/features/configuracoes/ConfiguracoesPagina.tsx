import { SlidersHorizontal } from 'lucide-react';
import { EmConstrucao } from '@/features/comum/EmConstrucao';

export default function ConfiguracoesPagina() {
  return (
    <EmConstrucao
      titulo="Configurações"
      fase="Fase 2"
      icone={SlidersHorizontal}
      detalhe="Marca, textos padrão, escala, faixas de classificação e usuários."
    />
  );
}
