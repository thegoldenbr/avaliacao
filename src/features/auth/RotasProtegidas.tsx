import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from './AuthProvider';

function Carregando() {
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4 p-6" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function AvisoDeAcesso({ titulo, texto }: { titulo: string; texto: string }) {
  const { sair } = useAuth();
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="flex max-w-[440px] flex-col items-start gap-4">
        <ShieldAlert className="size-8 text-warning" aria-hidden="true" />
        <h1 className="text-[1.625rem] font-semibold tracking-tight">{titulo}</h1>
        <p className="text-muted">{texto}</p>
        <Button variant="secondary" onClick={() => void sair()}>
          Sair
        </Button>
      </div>
    </div>
  );
}

/** Exige login e perfil ativo. Sem perfil, o usuário não enxerga nenhum dado (RLS). */
export function RotaProtegida() {
  const { carregando, sessao, perfil } = useAuth();
  const local = useLocation();

  if (carregando) return <Carregando />;
  if (!sessao) return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  if (!perfil || !perfil.ativo) {
    return (
      <AvisoDeAcesso
        titulo="Sem acesso ao sistema"
        texto="Sua conta existe, mas ainda não foi liberada (ou foi desativada). Peça a um administrador para convidar você ou reativar seu acesso."
      />
    );
  }
  return <Outlet />;
}

/** Só administradores (configurações e usuários). Deve ficar dentro de RotaProtegida. */
export function RotaAdmin() {
  const { perfil } = useAuth();
  if (perfil?.papel !== 'admin') {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-[1.625rem] font-semibold tracking-tight">Acesso restrito</h1>
        <p className="text-muted">Esta área é só para administradores.</p>
      </section>
    );
  }
  return <Outlet />;
}
