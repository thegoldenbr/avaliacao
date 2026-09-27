import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { botao } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { mascararCnpj, limparCnpj } from '@/lib/cnpj';
import { UFS } from '@/lib/mascaras';
import { cn } from '@/lib/utils';
import { useEmpresas, type EmpresaComContagem } from './api';

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function LinhaEmpresa({ empresa }: { empresa: EmpresaComContagem }) {
  const total = empresa.avaliacoes[0]?.count ?? 0;
  return (
    <li className="grid gap-1 border-b border-border py-3.5 md:grid-cols-[2.2fr_1.4fr_1.2fr_auto] md:items-center md:gap-4">
      <div>
        <Link to={`/empresas/${empresa.id}`} className="font-semibold text-foreground underline-offset-4 hover:underline">
          {empresa.nome_fantasia ?? empresa.razao_social}
        </Link>
        <p className="text-sm text-muted tabular-nums">
          {empresa.nome_fantasia ? `${empresa.razao_social} · ` : ''}
          {mascararCnpj(empresa.cnpj)}
        </p>
      </div>
      <p className="text-muted">{empresa.segmento ?? '—'}</p>
      <p className="text-muted">{empresa.municipio ? `${empresa.municipio}/${empresa.uf ?? ''}` : (empresa.uf ?? '—')}</p>
      <div className="flex items-center gap-2 md:justify-end">
        <span className="text-sm text-muted tabular-nums">
          {total} {total === 1 ? 'avaliação' : 'avaliações'}
        </span>
        {!empresa.ativo ? <Badge>Inativa</Badge> : null}
      </div>
    </li>
  );
}

export default function EmpresasPagina() {
  const { data, isPending, error } = useEmpresas();
  const [busca, setBusca] = useState('');
  const [segmento, setSegmento] = useState('');
  const [uf, setUf] = useState('');
  const [situacao, setSituacao] = useState<'todas' | 'ativas' | 'inativas'>('todas');

  const segmentos = useMemo(() => [...new Set((data ?? []).map((e) => e.segmento).filter((s): s is string => Boolean(s)))].sort(), [data]);

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    const digitos = limparCnpj(busca);
    return (data ?? []).filter((e) => {
      if (segmento && e.segmento !== segmento) return false;
      if (uf && e.uf !== uf) return false;
      if (situacao === 'ativas' && !e.ativo) return false;
      if (situacao === 'inativas' && e.ativo) return false;
      if (!termo) return true;
      return normalizar(`${e.razao_social} ${e.nome_fantasia ?? ''}`).includes(termo) || (digitos.length >= 3 && e.cnpj.includes(digitos));
    });
  }, [data, busca, segmento, uf, situacao]);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.625rem] font-semibold tracking-tight">Empresas</h1>
          <p className="text-muted">{data ? `${data.length} ${data.length === 1 ? 'empresa avaliada' : 'empresas avaliadas'}` : 'Empresas avaliadas'}</p>
        </div>
        <Link to="/empresas/nova" className={botao()}>
          <Plus className="size-5" aria-hidden="true" />
          Nova empresa
        </Link>
      </header>

      <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input type="search" aria-label="Buscar empresa" placeholder="Buscar por nome ou CNPJ" className="pl-10" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select aria-label="Segmento" value={segmento} onChange={(e) => setSegmento(e.target.value)}>
          <option value="">Todos os segmentos</option>
          {segmentos.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select aria-label="Estado" value={uf} onChange={(e) => setUf(e.target.value)}>
          <option value="">Todos os estados</option>
          {UFS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </Select>
        <Select aria-label="Situação" value={situacao} onChange={(e) => setSituacao(e.target.value as typeof situacao)}>
          <option value="todas">Ativas e inativas</option>
          <option value="ativas">Somente ativas</option>
          <option value="inativas">Somente inativas</option>
        </Select>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : error ? (
        <p role="alert" className="text-error">
          Não foi possível carregar as empresas. Atualize a página e tente de novo.
        </p>
      ) : filtradas.length === 0 ? (
        <div className={cn('flex flex-col items-center gap-3 px-4 py-12 text-center')}>
          <Building2 className="size-7 text-muted" aria-hidden="true" />
          <p className="font-medium">{data.length === 0 ? 'Nenhuma empresa cadastrada ainda.' : 'Nenhuma empresa encontrada com esses filtros.'}</p>
          {data.length === 0 ? (
            <Link to="/empresas/nova" className={botao()}>
              Cadastrar a primeira empresa
            </Link>
          ) : null}
        </div>
      ) : (
        <ul>
          {filtradas.map((e) => (
            <LinhaEmpresa key={e.id} empresa={e} />
          ))}
        </ul>
      )}
    </section>
  );
}
