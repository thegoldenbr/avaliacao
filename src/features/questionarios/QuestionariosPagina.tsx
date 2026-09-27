import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, FileText, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { mensagemDeErro } from '@/lib/erros';
import { formatarData } from '@/lib/formatacao';
import { useCriarQuestionario, useDuplicarQuestionario, useQuestionarios } from './api';

export default function QuestionariosPagina() {
  const navegar = useNavigate();
  const { notificar } = useToast();
  const { data, isPending, error } = useQuestionarios();
  const criar = useCriarQuestionario();
  const duplicar = useDuplicarQuestionario();
  const [mostrarArquivados, setMostrarArquivados] = useState(false);

  async function handleCriar() {
    try {
      const novo = await criar.mutateAsync({ titulo: 'Novo questionário' });
      navegar(`/questionarios/${novo.id}`);
    } catch (e) {
      notificar(mensagemDeErro(e, 'Não foi possível criar o questionário.'), 'erro');
    }
  }

  async function handleDuplicar(id: string) {
    try {
      const novoId = await duplicar.mutateAsync(id);
      notificar('Questionário duplicado.');
      navegar(`/questionarios/${novoId}`);
    } catch (e) {
      notificar(mensagemDeErro(e, 'Não foi possível duplicar o questionário.'), 'erro');
    }
  }

  const visiveis = (data ?? []).filter((q) => mostrarArquivados || !q.arquivado);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.625rem] font-semibold tracking-tight">Questionários</h1>
          <p className="max-w-[60ch] text-muted">Modelos reutilizáveis: você cadastra os grupos e as perguntas, e cada avaliação guarda a própria cópia.</p>
        </div>
        <Button onClick={() => void handleCriar()} disabled={criar.isPending}>
          <Plus className="size-5" aria-hidden="true" />
          Novo questionário
        </Button>
      </header>

      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" className="size-5 accent-primary" checked={mostrarArquivados} onChange={(e) => setMostrarArquivados(e.target.checked)} />
        Mostrar arquivados
      </label>

      {isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error ? (
        <p role="alert" className="text-error">Não foi possível carregar os questionários. Atualize a página e tente de novo.</p>
      ) : visiveis.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
          <FileText className="size-7 text-muted" aria-hidden="true" />
          <p className="font-medium">Nenhum questionário ainda.</p>
          <p className="max-w-[50ch] text-muted">Crie um modelo, adicione grupos (temas) e perguntas com nota de 0 a 10.</p>
        </div>
      ) : (
        <ul>
          {visiveis.map((q) => {
            const totalPerguntas = q.grupos.reduce((soma, g) => soma + (g.perguntas[0]?.count ?? 0), 0);
            return (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3.5">
                <div>
                  <Link to={`/questionarios/${q.id}`} className="font-semibold underline-offset-4 hover:underline">{q.titulo}</Link>
                  <p className="text-sm text-muted">
                    {q.grupos.length} {q.grupos.length === 1 ? 'grupo' : 'grupos'} · {totalPerguntas} {totalPerguntas === 1 ? 'pergunta' : 'perguntas'} · atualizado em {formatarData(q.atualizado_em)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {q.arquivado ? <Badge>Arquivado</Badge> : null}
                  <Button variant="secondary" onClick={() => void handleDuplicar(q.id)} disabled={duplicar.isPending}>
                    <Copy className="size-4" aria-hidden="true" />
                    Duplicar
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
