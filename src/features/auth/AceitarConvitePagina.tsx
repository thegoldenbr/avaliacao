import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { AuthLayout } from './AuthLayout';
import { DefinirSenhaForm } from './DefinirSenhaForm';

type Estado = 'verificando' | 'pronto' | 'invalido';

/**
 * Destino do link de convite gerado pela Edge Function: /?token_hash=...&type=invite#/aceitar-convite.
 * O token_hash fica na query (antes do #), então funciona com HashRouter; verifyOtp abre a sessão.
 */
export default function AceitarConvitePagina() {
  const navegar = useNavigate();
  const [estado, setEstado] = useState<Estado>('verificando');

  useEffect(() => {
    const parametros = new URLSearchParams(location.search);
    const tokenHash = parametros.get('token_hash');
    const tipo = parametros.get('type');
    if (!tokenHash || (tipo !== 'invite' && tipo !== 'recovery')) {
      setEstado('invalido');
      return;
    }
    let ativo = true;
    void supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo }).then(({ error }) => {
      if (!ativo) return;
      setEstado(error ? 'invalido' : 'pronto');
      // Tira o token da barra de endereço para não ser reaproveitado nem compartilhado sem querer.
      if (!error) history.replaceState(null, '', `${location.pathname}#/aceitar-convite`);
    });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <AuthLayout titulo="Bem-vindo(a)" subtitulo="Crie sua senha para acessar o sistema.">
      {estado === 'verificando' ? <Skeleton className="h-40 w-full" /> : null}
      {estado === 'pronto' ? <DefinirSenhaForm rotuloBotao="Criar senha e entrar" onConcluido={() => navegar('/', { replace: true })} /> : null}
      {estado === 'invalido' ? (
        <div className="flex flex-col gap-4">
          <p role="alert" className="text-error">
            Este convite expirou ou já foi usado. Peça a um administrador que gere um novo link.
          </p>
          <Link to="/login" className="flex min-h-11 items-center text-primary underline underline-offset-4">
            Ir para o login
          </Link>
        </div>
      ) : null}
    </AuthLayout>
  );
}
