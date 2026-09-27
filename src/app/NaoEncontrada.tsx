import { Link } from 'react-router-dom';
import { botao } from '@/components/ui/button';

export default function NaoEncontrada() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="flex max-w-[420px] flex-col items-start gap-4">
        <h1 className="text-[1.625rem] font-semibold tracking-tight">Página não encontrada</h1>
        <p className="text-muted">O endereço não existe ou foi digitado incompleto. Volte ao início e tente de novo.</p>
        <Link to="/" className={botao()}>
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
