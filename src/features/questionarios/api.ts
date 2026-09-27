import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import type { Grupo, Pergunta, Questionario } from '@/lib/tipos';

export type GrupoCompleto = Grupo & { perguntas: Pergunta[] };
export type QuestionarioCompleto = Questionario & { grupos: GrupoCompleto[] };

type Tabelas = Database['public']['Tables'];
const CHAVE = (id: string | undefined) => ['questionario', id] as const;

export function useQuestionarios() {
  return useQuery({
    queryKey: ['questionarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questionarios')
        .select('*, grupos(id, perguntas(count))')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useQuestionario(id: string | undefined) {
  return useQuery({
    queryKey: CHAVE(id),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questionarios')
        .select('*, grupos(*, perguntas(*))')
        .eq('id', id ?? '')
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const grupos = [...data.grupos]
        .sort((a, b) => a.ordem - b.ordem)
        .map((g) => ({ ...g, perguntas: [...g.perguntas].sort((a, b) => a.ordem - b.ordem) }));
      return { ...data, grupos } as QuestionarioCompleto;
    },
  });
}

/** Quantas avaliações já foram criadas a partir deste modelo (elas guardam a própria cópia). */
export function useUsoDoQuestionario(id: string | undefined) {
  return useQuery({
    queryKey: ['questionario-uso', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('avaliacoes')
        .select('id', { count: 'exact', head: true })
        .eq('questionario_origem_id', id ?? '');
      if (error) throw error;
      return count ?? 0;
    },
  });
}

async function invalidar(cliente: QueryClient, id: string | undefined) {
  await Promise.all([cliente.invalidateQueries({ queryKey: CHAVE(id) }), cliente.invalidateQueries({ queryKey: ['questionarios'] })]);
}

export function useCriarQuestionario() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: async (dados: Tabelas['questionarios']['Insert']) => {
      const { data, error } = await supabase.from('questionarios').insert(dados).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['questionarios'] }),
  });
}

export function useDuplicarQuestionario() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('duplicar_questionario', { p_questionario_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['questionarios'] }),
  });
}

/** Edições do editor: cada alteração é salva na hora e o cache é atualizado em seguida. */
export function useEditorQuestionario(questionarioId: string) {
  const cliente = useQueryClient();
  const aoTerminar = () => invalidar(cliente, questionarioId);

  const questionario = useMutation({
    mutationFn: async (patch: Tabelas['questionarios']['Update']) => {
      const { error } = await supabase.from('questionarios').update(patch).eq('id', questionarioId);
      if (error) throw error;
    },
    onSuccess: aoTerminar,
  });

  const criarGrupo = useMutation({
    mutationFn: async (dados: Tabelas['grupos']['Insert']) => {
      const { error } = await supabase.from('grupos').insert(dados);
      if (error) throw error;
    },
    onSuccess: aoTerminar,
  });
  const atualizarGrupo = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Tabelas['grupos']['Update'] }) => {
      const { error } = await supabase.from('grupos').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: aoTerminar,
  });
  const excluirGrupo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('grupos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: aoTerminar,
  });

  const criarPergunta = useMutation({
    mutationFn: async (dados: Tabelas['perguntas']['Insert']) => {
      const { error } = await supabase.from('perguntas').insert(dados);
      if (error) throw error;
    },
    onSuccess: aoTerminar,
  });
  const atualizarPergunta = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Tabelas['perguntas']['Update'] }) => {
      const { error } = await supabase.from('perguntas').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: aoTerminar,
  });
  const excluirPergunta = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('perguntas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: aoTerminar,
  });

  /** Grava a nova ordem (1..n) de grupos ou perguntas e já reflete na tela, sem esperar a rede. */
  const reordenar = useMutation({
    mutationFn: async ({ tabela, ids }: { tabela: 'grupos' | 'perguntas'; ids: string[] }) => {
      const resultados = await Promise.all(ids.map((id, i) => supabase.from(tabela).update({ ordem: i + 1 }).eq('id', id)));
      const falha = resultados.find((r) => r.error);
      if (falha?.error) throw falha.error;
    },
    onMutate: async ({ tabela, ids }) => {
      cliente.setQueryData<QuestionarioCompleto | null>(CHAVE(questionarioId), (atual) => {
        if (!atual) return atual;
        const posicao = new Map(ids.map((id, i) => [id, i + 1]));
        if (tabela === 'grupos') {
          return { ...atual, grupos: [...atual.grupos].sort((a, b) => (posicao.get(a.id) ?? 0) - (posicao.get(b.id) ?? 0)) };
        }
        return {
          ...atual,
          grupos: atual.grupos.map((g) => ({ ...g, perguntas: [...g.perguntas].sort((a, b) => (posicao.get(a.id) ?? a.ordem) - (posicao.get(b.id) ?? b.ordem)) })),
        };
      });
    },
    onSettled: aoTerminar,
  });

  return { questionario, criarGrupo, atualizarGrupo, excluirGrupo, criarPergunta, atualizarPergunta, excluirPergunta, reordenar };
}
