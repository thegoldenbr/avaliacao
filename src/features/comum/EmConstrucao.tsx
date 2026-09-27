import type { LucideIcon } from 'lucide-react';

interface EmConstrucaoProps {
  titulo: string;
  fase: string;
  icone: LucideIcon;
  detalhe?: string;
}

/** Estado provisório das telas que ainda não foram implementadas. */
export function EmConstrucao({ titulo, fase, icone: Icone, detalhe }: EmConstrucaoProps) {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-[1.625rem] font-semibold tracking-tight">{titulo}</h1>
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <Icone className="size-7 text-muted" aria-hidden="true" />
        <p className="font-medium">Esta tela chega na {fase}.</p>
        {detalhe ? <p className="max-w-[60ch] text-muted">{detalhe}</p> : null}
      </div>
    </section>
  );
}
