import type { ReactNode } from 'react';
import { LogoMarca } from '@/features/marca/LogoMarca';

interface AuthLayoutProps {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}

/** Moldura das telas de acesso (login, recuperação, convite). */
export function AuthLayout({ titulo, subtitulo, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <div className="flex w-full max-w-[420px] flex-col gap-8">
        <div className="flex flex-col gap-2">
          <LogoMarca className="mb-4" />
          <h1 className="text-[1.625rem] font-semibold tracking-tight">{titulo}</h1>
          {subtitulo ? <p className="text-muted">{subtitulo}</p> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
