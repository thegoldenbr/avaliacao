import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './AuthProvider';
import { DefinirSenhaForm } from './DefinirSenhaForm';

/**
 * Destino do e-mail "Esqueci minha senha". O link traz ?code=... na query (antes do #): o supabase-js troca o
 * código por uma sessão sozinho (PKCE); aqui só esperamos a sessão existir e pedimos a nova senha.
 */
export default function RedefinirSenhaPagina() {
  const { carregando, sessao } = useAuth();
  const navegar = useNavigate();

  return (
    <AuthLayout titulo="Criar nova senha">
      {carregando ? (
        <Skeleton className="h-40 w-full" />
      ) : sessao ? (
        <DefinirSenhaForm rotuloBotao="Salvar nova senha" onConcluido={() => navegar('/', { replace: true })} />
      ) : (
        <div className="flex flex-col gap-4">
          <p role="alert" className="text-error">
            Este link expirou ou já foi usado. Peça um novo link para continuar.
          </p>
          <Link to="/esqueci-senha" className="flex min-h-11 items-center text-primary underline underline-offset-4">
            Pedir novo link
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
