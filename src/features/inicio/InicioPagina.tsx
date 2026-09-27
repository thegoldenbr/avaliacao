import { CircleAlert, CircleCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarca } from '@/features/marca/useMarca';

/** Provisório (Fase 1): confirma que o app conversa com o Supabase. O painel real chega na Fase 2/4. */
export default function InicioPagina() {
  const { data, isPending, error } = useMarca();

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-[1.625rem] font-semibold tracking-tight">Início</h1>
      <div className="flex flex-col gap-2" aria-live="polite">
        <h2 className="text-xl font-semibold">Conexão com o banco</h2>
        {isPending ? (
          <Skeleton className="h-6 w-64" />
        ) : error ? (
          <p className="flex items-start gap-2 text-error">
            <CircleAlert className="mt-0.5 size-5 flex-none" aria-hidden="true" />
            <span>
              Não foi possível ler a marca no Supabase: {error.message}. Confira se as migrations foram aplicadas e se as
              variáveis do projeto estão corretas.
            </span>
          </p>
        ) : (
          <p className="flex items-start gap-2 text-success">
            <CircleCheck className="mt-0.5 size-5 flex-none" aria-hidden="true" />
            <span>Conectado. Empresa principal: {data.nome}.</span>
          </p>
        )}
      </div>
    </section>
  );
}
