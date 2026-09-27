import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Campo, propsDoCampo } from '@/components/ui/campo';
import { Dialogo } from '@/components/ui/dialogo';
import { Input, Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useConvidarUsuario, type ConviteGerado } from './api';

const esquema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome.').max(120, 'Use no máximo 120 caracteres.'),
  email: z.email('Informe um e-mail válido, como nome@empresa.com.br.'),
  papel: z.enum(['analista', 'admin']),
});
type Dados = z.infer<typeof esquema>;

export function ConviteDialogo({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { notificar } = useToast();
  const convidar = useConvidarUsuario();
  const [convite, setConvite] = useState<(ConviteGerado & { nome: string }) | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({ resolver: zodResolver(esquema), defaultValues: { nome: '', email: '', papel: 'analista' } });

  function handleFechar() {
    setConvite(null);
    setErroGeral(null);
    reset();
    onFechar();
  }

  async function handleConvidar(d: Dados) {
    setErroGeral(null);
    try {
      const gerado = await convidar.mutateAsync(d);
      setConvite({ ...gerado, nome: d.nome });
    } catch (erro) {
      setErroGeral(erro instanceof Error ? erro.message : 'Não foi possível gerar o convite.');
    }
  }

  async function handleCopiar() {
    if (!convite) return;
    try {
      await navigator.clipboard.writeText(convite.link);
      notificar('Link copiado.');
    } catch {
      notificar('Não foi possível copiar. Selecione o link e copie manualmente.', 'erro');
    }
  }

  const mensagem = convite ? `Olá, ${convite.nome}! Você foi convidado(a) para o Radar de Desempenho. Crie sua senha por este link: ${convite.link}` : '';

  return (
    <Dialogo aberto={aberto} onFechar={handleFechar} titulo={convite ? 'Convite gerado' : 'Convidar usuário'}>
      {convite ? (
        <div className="flex flex-col gap-4">
          <p>Envie este link para {convite.nome}. Ele vale por tempo limitado e só pode ser usado uma vez.</p>
          <Input readOnly aria-label="Link de convite" value={convite.link} onFocus={(e) => e.currentTarget.select()} className="text-sm" />
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void handleCopiar()}><Copy className="size-4" aria-hidden="true" />Copiar link</Button>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-controle border border-border-strong px-4 font-semibold hover:bg-surface-alt" href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" aria-hidden="true" />WhatsApp</a>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-controle border border-border-strong px-4 font-semibold hover:bg-surface-alt" href={`mailto:?subject=${encodeURIComponent('Convite para o Radar de Desempenho')}&body=${encodeURIComponent(mensagem)}`}><Mail className="size-4" aria-hidden="true" />E-mail</a>
          </div>
          <div className="flex justify-end"><Button onClick={handleFechar}>Concluir</Button></div>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(handleConvidar)(e)} noValidate>
          <Campo id="convite-nome" rotulo="Nome" erro={errors.nome?.message}><Input {...propsDoCampo('convite-nome', errors.nome?.message)} autoComplete="off" {...register('nome')} /></Campo>
          <Campo id="convite-email" rotulo="E-mail" erro={errors.email?.message}><Input {...propsDoCampo('convite-email', errors.email?.message)} type="email" inputMode="email" autoComplete="off" {...register('email')} /></Campo>
          <Campo id="convite-papel" rotulo="Papel" ajuda="Analistas cuidam de empresas, questionários, avaliações e relatórios. Administradores também gerenciam configurações e usuários.">
            <Select {...propsDoCampo('convite-papel', undefined, 'ajuda')} {...register('papel')}><option value="analista">Analista</option><option value="admin">Administrador</option></Select>
          </Campo>
          {erroGeral ? <p role="alert" className="text-error">{erroGeral}</p> : null}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={handleFechar}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Gerando…' : 'Gerar convite'}</Button>
          </div>
        </form>
      )}
    </Dialogo>
  );
}
