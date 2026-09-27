import { Link, useParams } from 'react-router-dom';
import { Archive, ArchiveRestore, ChevronRight, Eye, Info, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, botao } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { percentuais } from '../pesos';
import { useQuestionario, useUsoDoQuestionario } from '../api';
import { CampoAoSair } from './CampoAoSair';
import { GrupoCard } from './GrupoCard';
import { ListaOrdenavel } from './Ordenacao';
import { useAcoesEditor } from './useAcoesEditor';

function Editor({ id }: { id: string }) {
  const { data: q } = useQuestionario(id);
  const { data: uso } = useUsoDoQuestionario(id);
  const { editor, executar } = useAcoesEditor(id);
  if (!q) return null;

  const pctGrupos = percentuais(q.grupos.map((g) => g.peso));
  const totalPerguntas = q.grupos.reduce((soma, g) => soma + g.perguntas.length, 0);

  function handleAdicionarGrupo() {
    if (!q) return;
    const ordem = q.grupos.reduce((maior, g) => Math.max(maior, g.ordem), 0) + 1;
    void executar(editor.criarGrupo.mutateAsync({ questionario_id: id, nome: 'Novo grupo', nome_curto: `Grupo ${ordem}`, peso: 1, ordem }));
  }

  function handleMoverGrupo(indice: number, direcao: -1 | 1) {
    if (!q) return;
    const ids = q.grupos.map((g) => g.id);
    const destino = indice + direcao;
    if (destino < 0 || destino >= ids.length) return;
    [ids[indice], ids[destino]] = [ids[destino] as string, ids[indice] as string];
    void executar(editor.reordenar.mutateAsync({ tabela: 'grupos', ids }));
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <Link to="/questionarios" className="underline underline-offset-4">Questionários</Link>
          <ChevronRight className="size-4" aria-hidden="true" />
          {q.titulo}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[260px] flex-1">
            <CampoAoSair id="q-titulo" rotulo="Título do questionário" valor={q.titulo} obrigatorio maxLength={160} onSalvar={(v) => void executar(editor.questionario.mutateAsync({ titulo: v }))} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {q.arquivado ? <Badge>Arquivado</Badge> : null}
            <Link to={`/questionarios/${id}/previa`} className={botao({ variant: 'secondary' })}><Eye className="size-4" aria-hidden="true" />Pré-visualizar</Link>
            <Button variant="secondary" onClick={() => void executar(editor.questionario.mutateAsync({ arquivado: !q.arquivado }))}>
              {q.arquivado ? <ArchiveRestore className="size-4" aria-hidden="true" /> : <Archive className="size-4" aria-hidden="true" />}
              {q.arquivado ? 'Desarquivar' : 'Arquivar'}
            </Button>
          </div>
        </div>
        <CampoAoSair id="q-descricao" rotulo="Descrição (opcional)" valor={q.descricao ?? ''} multilinha maxLength={500} onSalvar={(v) => void executar(editor.questionario.mutateAsync({ descricao: v || null }))} />
        <p className="text-sm text-muted">{q.grupos.length} {q.grupos.length === 1 ? 'grupo' : 'grupos'} · {totalPerguntas} {totalPerguntas === 1 ? 'pergunta' : 'perguntas'}. As alterações são salvas ao sair de cada campo.</p>
        {uso ? (
          <p className="flex items-start gap-2 rounded-controle border border-primary p-3">
            <Info className="mt-0.5 size-5 flex-none text-primary" aria-hidden="true" />
            Este modelo já foi usado em {uso} {uso === 1 ? 'avaliação' : 'avaliações'}. Editar aqui não altera essas avaliações: cada uma guarda a própria cópia das perguntas.
          </p>
        ) : null}
      </header>

      {q.grupos.length === 0 ? (
        <p className="py-6 text-muted">Este questionário ainda não tem grupos. Comece adicionando o primeiro tema (por exemplo, “Finanças”).</p>
      ) : (
        <div className="flex flex-col gap-4">
          <ListaOrdenavel ids={q.grupos.map((g) => g.id)} onReordenar={(ids) => void executar(editor.reordenar.mutateAsync({ tabela: 'grupos', ids }))}>
            {q.grupos.map((g, i) => (
              <GrupoCard key={g.id} questionarioId={id} grupo={g} posicao={i + 1} total={q.grupos.length} percentualNaNota={pctGrupos[i] ?? 0} onMover={(d) => handleMoverGrupo(i, d)} />
            ))}
          </ListaOrdenavel>
        </div>
      )}
      <Button variant="secondary" className="self-start" onClick={handleAdicionarGrupo}><Plus className="size-5" aria-hidden="true" />Adicionar grupo</Button>
      <p className="text-sm text-muted">No celular, use os botões de subir e descer; no computador também dá para arrastar pela alça.</p>
    </section>
  );
}

export default function QuestionarioEditorPagina() {
  const { id } = useParams();
  const { data, isPending, error } = useQuestionario(id);
  if (isPending) return <div aria-busy="true" className="flex flex-col gap-3"><Skeleton className="h-10 w-72" /><Skeleton className="h-48 w-full" /></div>;
  if (error || !data || !id) return <p role="alert">Questionário não encontrado. <Link to="/questionarios" className="text-primary underline">Voltar para a lista</Link></p>;
  return <Editor id={id} />;
}
