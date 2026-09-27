import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/lib/erros';
import type { PapelUsuario } from '@/lib/tipos';
import { useAtualizarUsuario, useUsuarios } from './api';
import { ConviteDialogo } from './ConviteDialogo';

export function UsuariosPainel() {
  const { perfil: eu } = useAuth();
  const { notificar } = useToast();
  const { data, isPending, error } = useUsuarios();
  const atualizar = useAtualizarUsuario();
  const [convidando, setConvidando] = useState(false);

  async function handleAtualizar(id: string, patch: { papel?: PapelUsuario; ativo?: boolean }) {
    try {
      await atualizar.mutateAsync({ id, patch });
    } catch (e) {
      notificar(mensagemDeErro(e, 'Não foi possível atualizar o usuário.'), 'erro');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[60ch] text-muted">Quem tem acesso à área interna. Novos usuários entram por convite: você gera o link e envia pelo WhatsApp ou e-mail.</p>
        <Button onClick={() => setConvidando(true)}><Plus className="size-5" aria-hidden="true" />Convidar usuário</Button>
      </div>
      {isPending ? <Skeleton className="h-32 w-full" /> : error ? <p role="alert" className="text-error">Não foi possível carregar os usuários.</p> : (
        <ul>
          {data.map((u) => {
            const ehEu = u.id === eu?.id;
            return (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{u.nome} {ehEu ? <span className="font-normal text-muted">(você)</span> : null}</p>
                  <p className="text-sm text-muted">{u.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!u.ativo ? <Badge>Desativado</Badge> : null}
                  <Select aria-label={`Papel de ${u.nome}`} className="w-auto" value={u.papel} disabled={ehEu} onChange={(e) => void handleAtualizar(u.id, { papel: e.target.value as PapelUsuario })}>
                    <option value="analista">Analista</option>
                    <option value="admin">Administrador</option>
                  </Select>
                  <Button variant="secondary" disabled={ehEu} onClick={() => void handleAtualizar(u.id, { ativo: !u.ativo })}>{u.ativo ? 'Desativar' : 'Reativar'}</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ConviteDialogo aberto={convidando} onFechar={() => setConvidando(false)} />
    </div>
  );
}
