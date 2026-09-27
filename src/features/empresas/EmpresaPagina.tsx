import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, botao } from '@/components/ui/button';
import { ConfirmarExclusao } from '@/components/ui/confirmar-exclusao';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { mascararCnpj } from '@/lib/cnpj';
import { mensagemDeErro } from '@/lib/erros';
import { formatarData } from '@/lib/formatacao';
import { mascararTelefone } from '@/lib/mascaras';
import { ROTULO_STATUS, TOM_STATUS } from '@/lib/status';
import { useAvaliacoesDaEmpresa, useEmpresa, useExcluirEmpresa } from './api';

function Dado({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div>
      <dt className="text-sm text-muted">{rotulo}</dt>
      <dd className="font-medium">{valor || '—'}</dd>
    </div>
  );
}

export default function EmpresaPagina() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { notificar } = useToast();
  const { perfil } = useAuth();
  const { data: empresa, isPending } = useEmpresa(id);
  const { data: avaliacoes } = useAvaliacoesDaEmpresa(id);
  const excluir = useExcluirEmpresa();
  const [confirmando, setConfirmando] = useState(false);

  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (!empresa) {
    return (
      <p role="alert">
        Empresa não encontrada. <Link to="/empresas" className="text-primary underline">Voltar para a lista</Link>
      </p>
    );
  }

  const nome = empresa.nome_fantasia ?? empresa.razao_social;

  async function handleExcluir() {
    if (!empresa) return;
    try {
      await excluir.mutateAsync(empresa.id);
      notificar('Empresa excluída, com todas as avaliações e respostas.');
      navegar('/empresas', { replace: true });
    } catch (erro) {
      setConfirmando(false);
      notificar(mensagemDeErro(erro, 'Não foi possível excluir a empresa.'), 'erro');
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <Link to="/empresas" className="underline underline-offset-4">Empresas</Link>
          <ChevronRight className="size-4" aria-hidden="true" />
          {nome}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[1.625rem] font-semibold tracking-tight">{nome}</h1>
            <p className="text-muted tabular-nums">{empresa.razao_social} · {mascararCnpj(empresa.cnpj)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {!empresa.ativo ? <Badge>Inativa</Badge> : null}
            <Link to={`/empresas/${empresa.id}/editar`} className={botao({ variant: 'secondary' })}>
              <Pencil className="size-4" aria-hidden="true" />
              Editar
            </Link>
          </div>
        </div>
      </header>

      <dl className="grid gap-4 md:grid-cols-3">
        <Dado rotulo="Segmento" valor={empresa.segmento} />
        <Dado rotulo="Porte" valor={empresa.porte} />
        <Dado rotulo="Local" valor={empresa.municipio ? `${empresa.municipio}/${empresa.uf ?? ''}` : empresa.uf} />
        <Dado rotulo="Responsável" valor={empresa.responsavel_nome} />
        <Dado rotulo="Cargo" valor={empresa.responsavel_cargo} />
        <Dado rotulo="E-mail" valor={empresa.responsavel_email} />
        <Dado rotulo="Telefone" valor={empresa.responsavel_telefone ? mascararTelefone(empresa.responsavel_telefone) : null} />
        <div className="md:col-span-2"><Dado rotulo="Observações" valor={empresa.observacoes} /></div>
      </dl>

      <section aria-labelledby="hist" className="flex flex-col gap-3">
        <h2 id="hist" className="text-xl font-semibold">Avaliações</h2>
        {!avaliacoes ? (
          <Skeleton className="h-14 w-full" />
        ) : avaliacoes.length === 0 ? (
          <p className="text-muted">Nenhuma avaliação para esta empresa ainda. A criação de avaliações chega na Fase 3.</p>
        ) : (
          <ul>
            {avaliacoes.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3">
                <div>
                  <p className="font-medium">{a.titulo}</p>
                  <p className="text-sm text-muted">{a.periodo_referencia ? `${a.periodo_referencia} · ` : ''}criada em {formatarData(a.criado_em)}</p>
                </div>
                <Badge tom={TOM_STATUS[a.status as keyof typeof TOM_STATUS] ?? 'neutro'}>{ROTULO_STATUS[a.status as keyof typeof ROTULO_STATUS] ?? a.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {perfil?.papel === 'admin' ? (
        <section aria-labelledby="risco" className="flex max-w-[640px] flex-col gap-3 border-t border-border pt-6">
          <h2 id="risco" className="text-xl font-semibold">Excluir empresa</h2>
          <p className="text-muted">Apaga a empresa com todas as avaliações, respostas e relatórios dela. Não dá para desfazer.</p>
          <Button variant="danger" className="self-start" onClick={() => setConfirmando(true)}>
            <Trash2 className="size-4" aria-hidden="true" />
            Excluir empresa
          </Button>
        </section>
      ) : null}

      <ConfirmarExclusao
        aberto={confirmando}
        onFechar={() => setConfirmando(false)}
        onConfirmar={() => void handleExcluir()}
        titulo="Excluir empresa e todos os dados"
        descricao={`Isso apaga ${nome} com todas as avaliações, respostas e relatórios. Não dá para desfazer.`}
        textoParaDigitar={nome}
        rotuloConfirmar="Excluir definitivamente"
        processando={excluir.isPending}
      />
    </section>
  );
}
