import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Perfil } from '@/lib/tipos';

interface ValorAuth {
  /** Verdadeiro enquanto a sessão (ou o perfil dela) ainda está sendo lida. */
  carregando: boolean;
  sessao: Session | null;
  perfil: Perfil | null;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
}

const AuthContexto = createContext<ValorAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const clienteConsultas = useQueryClient();
  const [sessao, setSessao] = useState<Session | null>(null);
  const [sessaoLida, setSessaoLida] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setSessaoLida(true);
    });
    // Não chamar o Supabase de dentro deste callback (risco de deadlock): só atualizar o estado.
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao);
      setSessaoLida(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const usuarioId = sessao?.user.id;
  const consultaPerfil = useQuery({
    queryKey: ['perfil', usuarioId],
    enabled: Boolean(usuarioId),
    queryFn: async () => {
      const { data, error } = await supabase.from('perfis').select('*').eq('id', usuarioId ?? '').maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const entrar = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
    clienteConsultas.clear();
  }, [clienteConsultas]);

  const valor = useMemo<ValorAuth>(
    () => ({
      carregando: !sessaoLida || (Boolean(usuarioId) && consultaPerfil.isPending),
      sessao,
      perfil: consultaPerfil.data ?? null,
      entrar,
      sair,
    }),
    [sessaoLida, usuarioId, consultaPerfil.isPending, consultaPerfil.data, sessao, entrar, sair],
  );

  return <AuthContexto.Provider value={valor}>{children}</AuthContexto.Provider>;
}

export function useAuth(): ValorAuth {
  const valor = useContext(AuthContexto);
  if (!valor) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return valor;
}
