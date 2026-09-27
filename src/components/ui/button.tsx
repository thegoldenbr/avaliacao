import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const botao = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-controle border border-transparent px-4 text-[0.9375rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary hover:bg-primary-hover',
        secondary: 'border-border-strong bg-surface text-foreground hover:bg-surface-alt',
        ghost: 'text-foreground hover:bg-surface-alt',
        danger: 'border-error bg-surface text-error hover:bg-surface-alt',
      },
      size: {
        default: '',
        icone: 'w-11 px-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof botao> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, type = 'button', ...props }: ButtonProps) {
  const Componente = asChild ? Slot : 'button';
  return <Componente className={cn(botao({ variant, size }), className)} type={asChild ? undefined : type} {...props} />;
}
