import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Campo, propsDoCampo } from '@/components/ui/campo';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

const esquema = z
  .object({
    senha: z.string().min(8, 'Use pelo menos 8 caracteres.'),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { path: ['confirmacao'], message: 'As senhas não são iguais.' });
type Dados = z.infer<typeof esquema>;

interface DefinirSenhaFormProps {
  rotuloBotao: string;
  onConcluido: () => void;
}

/** Formulário de nova senha, usado na redefinição e no aceite de convite (sessão já aberta pelo link). */
export function DefinirSenhaForm({ rotuloBotao, onConcluido }: DefinirSenhaFormProps) {
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({ resolver: zodResolver(esquema) });

  async function handleSalvar({ senha }: Dados) {
    setErroGeral(null);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setErroGeral(
        error.message.toLowerCase().includes('different')
          ? 'A nova senha precisa ser diferente da anterior.'
          : 'Não foi possível salvar a senha. Abra o link do e-mail novamente e tente de novo.',
      );
      return;
    }
    onConcluido();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(handleSalvar)(e)} noValidate>
      <Campo id="senha" rotulo="Nova senha" ajuda="Mínimo de 8 caracteres." erro={errors.senha?.message}>
        <Input
          {...propsDoCampo('senha', errors.senha?.message, 'ajuda')}
          type="password"
          autoComplete="new-password"
          {...register('senha')}
        />
      </Campo>
      <Campo id="confirmacao" rotulo="Repita a nova senha" erro={errors.confirmacao?.message}>
        <Input
          {...propsDoCampo('confirmacao', errors.confirmacao?.message)}
          type="password"
          autoComplete="new-password"
          {...register('confirmacao')}
        />
      </Campo>
      {erroGeral ? (
        <p role="alert" className="text-error">
          {erroGeral}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Salvando…' : rotuloBotao}
      </Button>
    </form>
  );
}
