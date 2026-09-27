import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

interface DialogoProps {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  children: ReactNode;
}

/** Diálogo modal nativo (<dialog>): foco preso, Esc fecha, leitores de tela anunciam o título. */
export function Dialogo({ aberto, onFechar, titulo, children }: DialogoProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      aria-labelledby="dialogo-titulo"
      className="m-auto w-[min(92vw,520px)] rounded-cartao border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      {aberto ? (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 id="dialogo-titulo" className="text-xl font-semibold">
              {titulo}
            </h2>
            <Button variant="ghost" size="icone" onClick={onFechar} aria-label="Fechar">
              <X className="size-5" aria-hidden="true" />
            </Button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
