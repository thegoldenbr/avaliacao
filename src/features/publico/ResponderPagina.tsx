import { ClipboardCheck } from 'lucide-react';
import { EmConstrucao } from '@/features/comum/EmConstrucao';

/** Rota /#/responder/:token. O token fica no fragmento da URL e não é enviado ao servidor. */
export default function ResponderPagina() {
  return <EmConstrucao titulo="Responder avaliação" fase="Fase 3" icone={ClipboardCheck} detalhe="Formulário público com escala de 0 a 10." />;
}
