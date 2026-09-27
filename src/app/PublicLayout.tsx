import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { AlternarTema } from '@/features/tema/AlternarTema';
import { LogoMarca } from '@/features/marca/LogoMarca';

/** Páginas sem login (formulário de resposta e dashboard do cliente): marca no topo e conteúdo em coluna única. */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface px-4 py-3.5">
        <div className="mx-auto flex max-w-[860px] items-center justify-between gap-4">
          <LogoMarca />
          <AlternarTema />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[860px] flex-1 px-4 py-6 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
