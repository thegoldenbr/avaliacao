import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Campo, propsDoCampo } from '@/components/ui/campo';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { urlDaRota } from '@/lib/urls';
import { AuthLayout } from './AuthLayout';

const esquema = z.object({ email: z.email('Informe um e-mail válido, como nome@empresa.com.br.') });
type Dados = z.infer<typeof esquema>;

export default function EsqueciSenhaPagina() {
  const [enviado, setEnviado] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({ resolver: zodResolver(esquema) });

  async function handleEnviar({ email }: Dados) {
    setErroGeral(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: urlDaRota('/redefinir-senha') });
    if (error) {
      setErroGeral('Não foi possível enviar agora. Aguarde alguns minutos e tente de novo.');
      return;
    }
    // Mesma resposta exista ou não a conta, para não revelar quem tem cadastro.
    setEnviado(email);
  }

  return (
    <AuthLayout titulo="Esqueci minha senha" subtitulo="Enviamos um link para você criar uma nova senha.">
      {enviado ? (
        <div className="flex flex-col gap-4">
          <p className="flex items-start gap-2 rounded-controle border border-success p-3">
            <CircleCheck className="mt-0.5 size-5 flex-none text-success" aria-hidden="true" />
            Se {enviado} tiver cadastro, o link chega em alguns minutos. Confira também a caixa de spam.
          </p>
          <Link to="/login" className="flex min-h-11 items-center text-primary underline underline-offset-4">
            Voltar para o login
          </Link>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(handleEnviar)(e)} noValidate>
          <Campo id="email" rotulo="E-mail" erro={errors.email?.message}>
            <Input
              {...propsDoCampo('email', errors.email?.message)}
              type="email"
              inputMode="email"
              autoComplete="email"
              {...register('email')}
            />
          </Campo>
          {erroGeral ? (
            <p role="alert" className="text-error">
              {erroGeral}
            </p>
          ) : null}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Enviando…' : 'Enviar link'}
          </Button>
          <Link to="/login" className="flex min-h-11 items-center text-primary underline underline-offset-4">
            Voltar para o login
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
