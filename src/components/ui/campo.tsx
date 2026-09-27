import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CampoProps {
  id: string;
  rotulo: ReactNode;
  ajuda?: string;
  erro?: string;
  children: ReactNode;
  className?: string;
}

/** Rótulo sempre visível, ajuda e erro junto ao campo. O campo filho deve usar `propsDoCampo`. */
export function Campo({ id, rotulo, ajuda, erro, children, className }: CampoProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[0.9375rem] font-medium">
        {rotulo}
      </label>
      {children}
      {ajuda ? (
        <p id={`${id}-ajuda`} className="text-sm text-muted">
          {ajuda}
        </p>
      ) : null}
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="flex items-start gap-1.5 text-sm text-error">
          <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
          {erro}
        </p>
      ) : null}
    </div>
  );
}

/** Atributos de acessibilidade que ligam o campo à ajuda e ao erro. */
export function propsDoCampo(id: string, erro?: string, ajuda?: string) {
  const descricao = [ajuda ? `${id}-ajuda` : null, erro ? `${id}-erro` : null].filter(Boolean).join(' ');
  return {
    id,
    'aria-invalid': erro ? (true as const) : undefined,
    'aria-describedby': descricao || undefined,
  };
}
