import { FileText } from 'lucide-react';
import { EmConstrucao } from '@/features/comum/EmConstrucao';

export default function QuestionariosPagina() {
  return (
    <EmConstrucao
      titulo="Questionários"
      fase="Fase 2"
      icone={FileText}
      detalhe="Aqui a empresa avaliadora cadastra os grupos e as perguntas, com pesos, escala invertida e ordem."
    />
  );
}
