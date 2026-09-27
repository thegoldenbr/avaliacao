import { ClipboardCheck } from 'lucide-react';
import { EmConstrucao } from '@/features/comum/EmConstrucao';

export default function AvaliacoesPagina() {
  return (
    <EmConstrucao
      titulo="Avaliações"
      fase="Fase 3"
      icone={ClipboardCheck}
      detalhe="Criação com cópia do questionário, links de resposta e acompanhamento."
    />
  );
}
