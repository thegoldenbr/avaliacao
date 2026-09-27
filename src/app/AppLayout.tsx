import { Suspense, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Building2, ClipboardCheck, FileText, Home, MoreHorizontal, PanelLeft, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlternarTema } from '@/features/tema/AlternarTema';
import { LogoMarca } from '@/features/marca/LogoMarca';

interface ItemNavegacao {
  para: string;
  rotulo: string;
  icone: LucideIcon;
  fim?: boolean;
}

const ITENS: ItemNavegacao[] = [
  { para: '/', rotulo: 'Início', icone: Home, fim: true },
  { para: '/empresas', rotulo: 'Empresas', icone: Building2 },
  { para: '/avaliacoes', rotulo: 'Avaliações', icone: ClipboardCheck },
  { para: '/questionarios', rotulo: 'Questionários', icone: FileText },
];
const ITEM_CONFIG: ItemNavegacao = { para: '/configuracoes', rotulo: 'Configurações', icone: SlidersHorizontal };
const ITEM_MAIS: ItemNavegacao = { para: '/configuracoes', rotulo: 'Mais', icone: MoreHorizontal };

function lerLateralRecolhida(): boolean {
  try {
    return localStorage.getItem('lateral-recolhida') === '1';
  } catch {
    return false;
  }
}

function BarraLateral({ recolhida, onAlternar }: { recolhida: boolean; onAlternar: () => void }) {
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen flex-col gap-6 border-r border-border bg-surface p-4 lg:flex',
        recolhida ? 'w-[76px]' : 'w-[248px]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <LogoMarca compacta={recolhida} className={cn(recolhida && 'hidden')} />
        <Button
          variant="ghost"
          size="icone"
          onClick={onAlternar}
          aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!recolhida}
        >
          <PanelLeft className="size-5" aria-hidden="true" />
        </Button>
      </div>
      <nav aria-label="Principal" className="flex flex-col gap-0.5">
        {[...ITENS, ITEM_CONFIG].map(({ para, rotulo, icone: Icone, fim }) => (
          <NavLink
            key={para}
            to={para}
            end={fim}
            title={rotulo}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-controle px-3 font-medium text-muted hover:bg-surface-alt hover:text-foreground',
                isActive && 'bg-primary-soft font-semibold text-foreground',
              )
            }
          >
            <Icone className="size-5 flex-none" aria-hidden="true" />
            <span className={cn(recolhida && 'sr-only')}>{rotulo}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex items-center justify-between">
        <AlternarTema />
      </div>
    </aside>
  );
}

function NavegacaoInferior() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {[...ITENS, ITEM_MAIS].map(({ para, rotulo, icone: Icone, fim }) => (
        <NavLink
          key={rotulo}
          to={para}
          end={fim}
          className={({ isActive }) =>
            cn(
              'flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-xs text-muted',
              isActive && 'font-semibold text-primary',
            )
          }
        >
          <Icone className="size-5" aria-hidden="true" />
          {rotulo}
        </NavLink>
      ))}
    </nav>
  );
}

/** Área interna: barra lateral recolhível no desktop, navegação inferior no celular. */
export function AppLayout() {
  const [recolhida, setRecolhida] = useState(lerLateralRecolhida);

  function handleAlternarLateral() {
    setRecolhida((atual) => {
      try {
        localStorage.setItem('lateral-recolhida', atual ? '0' : '1');
      } catch {
        // sem armazenamento: a preferência vale só nesta sessão
      }
      return !atual;
    });
  }

  return (
    <div className="flex min-h-screen">
      <BarraLateral recolhida={recolhida} onAlternar={handleAlternarLateral} />
      <main className="mx-auto w-full max-w-[1100px] min-w-0 px-4 pt-5 pb-[calc(88px+env(safe-area-inset-bottom))] lg:px-10 lg:pt-8 lg:pb-12">
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <Outlet />
        </Suspense>
      </main>
      <NavegacaoInferior />
    </div>
  );
}
