import { useToast } from '@/components/ui/toast';
import { mensagemDeErro } from '@/lib/erros';
import { useEditorQuestionario } from '../api';

/** Mutações do editor com aviso de erro padronizado. */
export function useAcoesEditor(questionarioId: string) {
  const editor = useEditorQuestionario(questionarioId);
  const { notificar } = useToast();

  async function executar(operacao: Promise<unknown>, falha = 'Não foi possível salvar a alteração.') {
    try {
      await operacao;
    } catch (erro) {
      notificar(mensagemDeErro(erro, falha), 'erro');
    }
  }

  return { editor, executar };
}
