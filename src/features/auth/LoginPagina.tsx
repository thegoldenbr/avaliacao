import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Campo, propsDoCampo } from '@/components/ui/campo';
import { Input } from '@/components/ui/input';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './AuthProvider';

const esquema = z.object({
  email: z.email('Informe um e-mail válido, como nome@empresa.com.br.'),
  senha: z.string().min(1, 'Informe a senha.'),
});
type Dados = z.infer<typeof esquema>;

export default function LoginPagina() {
  const { entrar, sessao, carregando } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const destino = (local.state as { de?: string } | null)?.de ?? '/';
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({ resolver: zodResolver(esquema) });

  if (!carregando && sessao) return <Navigate to={destino} replace />;

  async function handleEntrar(dados: Dados) {
    setErroGeral(null);
    try {
      await entrar(dados.email, dados.senha);
      navegar(destino, { replace: true });
    } catch {
      setErroGeral('E-mail ou senha incorretos. Confira os dados e tente de novo, ou use “Esqueci minha senha”.');
    }
  }

  return (
    <AuthLayout titulo="Entrar" subtitulo="Acesso da equipe da empresa avaliadora.">
      <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(handleEntrar)(e)} noValidate>
        <Campo id="email" rotulo="E-mail" erro={errors.email?.message}>
          <Input
            {...propsDoCampo('email', errors.email?.message)}
            type="email"
            inputMode="email"
            autoComplete="username"
            {...register('email')}
          />
        </Campo>
        <Campo id="senha" rotulo="Senha" erro={errors.senha?.message}>
          <Input
            {...propsDoCampo('senha', errors.senha?.message)}
            type="password"
            autoComplete="current-password"
            {...register('senha')}
          />
        </Campo>
        {erroGeral ? (
          <p role="alert" className="flex items-start gap-2 rounded-controle border border-error p-3 text-error">
            <CircleAlert className="mt-0.5 size-5 flex-none" aria-hidden="true" />
            {erroGeral}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </Button>
        <Link to="/esqueci-senha" className="flex min-h-11 items-center text-primary underline underline-offset-4">
          Esqueci minha senha
        </Link>
      </form>
    </AuthLayout>
  );
}
