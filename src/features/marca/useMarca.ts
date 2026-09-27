import { useQuery } from '@tanstack/react-query';
import { obterMarca } from '@/lib/rpc';

/** Marca da empresa principal (nome, logo e cor de destaque), lida pela RPC pública. */
export function useMarca() {
  return useQuery({ queryKey: ['marca'], queryFn: obterMarca, staleTime: 5 * 60_000, retry: false });
}
