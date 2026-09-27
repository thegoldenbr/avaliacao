import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatarData } from '@/lib/formatacao';
import { ROTULO_STATUS, TOM_STATUS } from '@/lib/status';
import { supabase } from '@/lib/supabase';
import type { StatusAvaliacao } from '@/lib/tipos';

const ORDEM: StatusAvaliacao[] = ['rascunho', 'aguardando_resposta', 'respondida', 'em_analise', 'publicada'];

function useResumo() {
  return useQuery({
    queryKey: ['resumo-inicio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('id, titulo, status, prazo, respondido_em, criado_em, empresas(nome_fantasia, razao_social)')
        .neq('status', 'arquivada')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export default function InicioPagina() {
  const { perfil } = useAuth();
  const { data, isPending, error } = useResumo();
  const primeiroNome = perfil?.nome.split(' ')[0] ?? '';
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const contagem = (s: StatusAvaliacao) => (data ?? []).filter((a) => a.status === s).length;
  const acao = (data ?? []).filter((a) => a.status === 'respondida');
  const nomeEmpresa = (a: NonNullable<typeof data>[number]) => a.empresas?.nome_fantasia ?? a.empresas?.razao_social ?? '—';

  return (
    <section className="flex flex-col gap-8">
      <header>
        <h1 className="text-[1.625rem] font-semibold tracking-tight">{saudacao}, {primeiroNome}</h1>
        <p className="text-muted">Resumo das avaliações.</p>
      </header>

      {isPending ? <Skeleton className="h-24 w-full" /> : error ? <p role="alert" className="text-error">Não foi possível carregar o resumo. Atualize a página e tente de novo.</p> : (
        <>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-5">
            {ORDEM.map((s) => (
              <div key={s}>
                <dt className="text-sm text-muted">{ROTULO_STATUS[s]}</dt>
                <dd className="text-3xl font-semibold tabular-nums">{contagem(s)}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-10 md:grid-cols-2">
            <section aria-labelledby="acao" className="flex flex-col gap-3">
              <h2 id="acao" className="text-xl font-semibold">Precisa da sua ação</h2>
              {acao.length === 0 ? <p className="text-muted">Nenhuma avaliação aguardando análise.</p> : (
                <ul>{acao.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 border-b border-border py-3">
                    <div><p className="font-semibold">{nomeEmpresa(a)}</p><p className="text-sm text-muted">{a.respondido_em ? `Respondida em ${formatarData(a.respondido_em)}` : 'Respondida'}</p></div>
                    <Badge tom="info">Analisar</Badge>
                  </li>
                ))}</ul>
              )}
            </section>
            <section aria-labelledby="recentes" className="flex flex-col gap-3">
              <h2 id="recentes" className="text-xl font-semibold">Avaliações recentes</h2>
              {(data ?? []).length === 0 ? <p className="text-muted">Ainda não há avaliações. Cadastre uma <Link to="/empresas" className="text-primary underline">empresa</Link> e um <Link to="/questionarios" className="text-primary underline">questionário</Link> para começar.</p> : (
                <ul>{(data ?? []).slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 border-b border-border py-3">
                    <div><p className="font-semibold">{nomeEmpresa(a)}</p><p className="text-sm text-muted">{a.titulo}</p></div>
                    <Badge tom={TOM_STATUS[a.status as StatusAvaliacao] ?? 'neutro'}>{ROTULO_STATUS[a.status as StatusAvaliacao] ?? a.status}</Badge>
                  </li>
                ))}</ul>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
