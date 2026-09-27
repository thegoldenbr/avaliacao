import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const base =
  'min-h-11 w-full rounded-controle border border-border-strong bg-surface px-3 text-foreground placeholder:text-muted aria-[invalid=true]:border-error disabled:cursor-not-allowed disabled:opacity-60';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(base, className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select className={cn(base, className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(base, 'min-h-24 resize-y py-2', className)} {...props} />;
}
