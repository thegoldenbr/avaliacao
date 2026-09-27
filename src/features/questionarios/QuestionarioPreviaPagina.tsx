import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { EscalaNota } from '@/components/ui/escala-nota';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuestionario } from './api';

const ROTULO_MIN_PADRAO = 'Discordo totalmente';
const ROTULO_MAX_PADRAO = 'Concordo totalmente';

/** Pré-visualização "como o respondente verá": um grupo por etapa, sem pesos. Nada é salvo. */
export default function QuestionarioPreviaPagina() {
  const { id } = useParams();
  const { data: q, isPending } = useQuestionario(id);
  const [etapa, setEtapa] = useState(0);
  const [notas, setNotas] = useState<Record<string, number>>({});

  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (!q || q.grupos.length === 0) {
    return <p role="alert">Este questionário ainda não tem grupos para pré-visualizar. <Link to={`/questionarios/${id ?? ''}`} className="text-primary underline">Voltar ao editor</Link></p>;
  }

  const grupo = q.grupos[Math.min(etapa, q.grupos.length - 1)];
  if (!grupo) return null;
  const respondidas = Object.keys(notas).length;
  const total = q.grupos.reduce((soma, g) => soma + g.perguntas.length, 0);

  return (
    <section className="mx-auto flex max-w-[680px] flex-col gap-6">
      <Link to={`/questionarios/${q.id}`} className="flex min-h-11 items-center gap-1 text-primary underline underline-offset-4">
        <ChevronLeft className="size-4" aria-hidden="true" />Voltar ao editor
      </Link>
      <p className="rounded-controle border border-border p-3 text-sm text-muted">Pré-visualização: é assim que a empresa avaliada verá o formulário. As notas escolhidas aqui não são salvas.</p>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-muted"><span>Parte {etapa + 1} de {q.grupos.length} · {grupo.nome}</span><span className="tabular-nums">{respondidas} de {total}</span></div>
        <div role="progressbar" aria-label="Progresso" aria-valuemin={0} aria-valuemax={total} aria-valuenow={respondidas} className="h-2 overflow-hidden rounded-full border border-border bg-surface-alt">
          <div className="h-full bg-primary" style={{ width: `${total ? (respondidas / total) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-10">
        {grupo.perguntas.map((p, i) => (
          <fieldset key={p.id} className="flex flex-col gap-3">
            <legend className="text-lg font-semibold leading-snug">{i + 1}. {p.enunciado}</legend>
            {p.texto_apoio ? <p className="text-muted">{p.texto_apoio}</p> : null}
            <EscalaNota nome={p.enunciado} valor={notas[p.id] ?? null} onChange={(n) => setNotas((atual) => ({ ...atual, [p.id]: n }))} rotuloMin={p.rotulo_min ?? ROTULO_MIN_PADRAO} rotuloMax={p.rotulo_max ?? ROTULO_MAX_PADRAO} />
          </fieldset>
        ))}
        {grupo.perguntas.length === 0 ? <p className="text-muted">Este grupo ainda não tem perguntas.</p> : null}
      </div>

      <div className="flex gap-3">
        <button type="button" className="min-h-11 flex-1 rounded-controle border border-border-strong font-semibold hover:bg-surface-alt disabled:opacity-50" onClick={() => setEtapa((e) => e - 1)} disabled={etapa === 0}>Anterior</button>
        <button type="button" className="min-h-11 flex-1 rounded-controle bg-primary font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-50" onClick={() => setEtapa((e) => e + 1)} disabled={etapa >= q.grupos.length - 1}>Próxima</button>
      </div>
    </section>
  );
}
