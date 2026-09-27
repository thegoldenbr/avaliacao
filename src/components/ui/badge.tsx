import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const TONS = {
  neutro: 'border-border-strong bg-surface-alt text-foreground',
  ok: 'border-success text-success',
  aviso: 'border-warning text-warning',
  erro: 'border-error text-error',
  info: 'border-primary text-primary',
} as const;

interface BadgeProps {
  tom?: keyof typeof TONS;
  children: ReactNode;
  className?: string;
}

export function Badge({ tom = 'neutro', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[0.8125rem] font-semibold', TONS[tom], className)}>
      {children}
    </span>
  );
}
