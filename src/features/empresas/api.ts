import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import type { Empresa } from '@/lib/tipos';

export type EmpresaComContagem = Empresa & { avaliacoes: { count: number }[] };
export type NovaEmpresa = Database['public']['Tables']['empresas']['Insert'];

export function useEmpresas() {
  return useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('*, avaliacoes(count)').order('razao_social');
      if (error) throw error;
      return data as EmpresaComContagem[];
    },
  });
}

export function useEmpresa(id: string | undefined) {
  return useQuery({
    queryKey: ['empresa', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('*').eq('id', id ?? '').maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAvaliacoesDaEmpresa(empresaId: string | undefined) {
  return useQuery({
    queryKey: ['avaliacoes-da-empresa', empresaId],
    enabled: Boolean(empresaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('id, titulo, periodo_referencia, status, criado_em')
        .eq('empresa_id', empresaId ?? '')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSalvarEmpresa() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: NovaEmpresa }) => {
      if (id) {
        const { data, error } = await supabase.from('empresas').update(dados).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from('empresas').insert(dados).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void cliente.invalidateQueries({ queryKey: ['empresas'] }).then(() => cliente.invalidateQueries({ queryKey: ['empresa'] })),
  });
}

export function useExcluirEmpresa() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('empresas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void cliente.invalidateQueries({ queryKey: ['empresas'] }),
  });
}
