import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { urlBase } from '@/lib/urls';
import type { PapelUsuario } from '@/lib/tipos';

type Tabelas = Database['public']['Tables'];

export function useConfiguracoes() {
  return useQuery({
    queryKey: ['configuracoes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('configuracoes').select('*').eq('id', true).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useSalvarConfiguracoes() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Tabelas['configuracoes']['Update']) => {
      const { data, error } = await supabase.from('configuracoes').update(patch).eq('id', true).select();
      if (error) throw error;
      // A RLS não devolve erro quando o usuário não é admin: só não altera nenhuma linha.
      if (!data || data.length === 0) throw { code: '42501' };
    },
    onSuccess: () => Promise.all([cliente.invalidateQueries({ queryKey: ['configuracoes'] }), cliente.invalidateQueries({ queryKey: ['marca'] })]),
  });
}

/** Envia a logo para o bucket público "marca" e devolve o endereço público. */
export async function enviarLogo(arquivo: File): Promise<string> {
  const extensao = (arquivo.name.split('.').pop() ?? 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const caminho = `logo-${Date.now()}.${extensao}`;
  const { error } = await supabase.storage.from('marca').upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return supabase.storage.from('marca').getPublicUrl(caminho).data.publicUrl;
}

export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase.from('perfis').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });
}

export function useAtualizarUsuario() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { papel?: PapelUsuario; ativo?: boolean } }) => {
      const { data, error } = await supabase.from('perfis').update(patch).eq('id', id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw { code: '42501' };
    },
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export interface ConviteGerado {
  link: string;
  usuario_id: string;
  tipo: 'invite' | 'recovery';
}

/** Chama a Edge Function convidar-usuario (só admin). Devolve o link para o admin enviar. */
export function useConvidarUsuario() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: async (dados: { email: string; nome: string; papel: PapelUsuario }): Promise<ConviteGerado> => {
      const { data, error } = await supabase.functions.invoke<ConviteGerado>('convidar-usuario', {
        body: { ...dados, url_base: urlBase() },
      });
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const corpo = (await error.context.json().catch(() => null)) as { erro?: string } | null;
          throw new Error(corpo?.erro ?? 'Não foi possível gerar o convite.');
        }
        throw new Error('Sem conexão com o servidor. Verifique sua internet e tente de novo.');
      }
      if (!data) throw new Error('Resposta vazia do servidor.');
      return data;
    },
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}
