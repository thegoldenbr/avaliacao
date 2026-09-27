import { Link } from 'react-router-dom';
import { LogOut, SlidersHorizontal } from 'lucide-react';
import { Button, botao } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTema, type EscolhaTema } from '@/features/tema/TemaProvider';
import { cn } from '@/lib/utils';

const TEMAS: { id: EscolhaTema; rotulo: string }[] = [
  { id: 'sistema', rotulo: 'Sistema' },
  { id: 'claro', rotulo: 'Claro' },
  { id: 'escuro', rotulo: 'Escuro' },
];

/** Aba "Mais" do celular: conta, tema, configurações (admin) e sair. */
export default function MaisPagina() {
  const { perfil, sair } = useAuth();
  const { escolha, definirEscolha } = useTema();

  return (
    <section className="flex flex-col gap-8">
      <header>
        <h1 className="text-[1.625rem] font-semibold tracking-tight">Mais</h1>
        <p className="text-muted">{perfil?.nome} · {perfil?.papel === 'admin' ? 'Administrador' : 'Analista'}</p>
        <p className="text-sm text-muted">{perfil?.email}</p>
      </header>

      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Tema">
        <h2 className="text-xl font-semibold">Aparência</h2>
        <div className="flex gap-2">
          {TEMAS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={escolha === t.id}
              onClick={() => definirEscolha(t.id)}
              className={cn('min-h-11 flex-1 rounded-controle border border-border-strong font-medium hover:bg-surface-alt', escolha === t.id && 'border-primary bg-primary-soft font-semibold')}
            >
              {t.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-start gap-3">
        {perfil?.papel === 'admin' ? (
          <Link to="/configuracoes" className={botao({ variant: 'secondary' })}>
            <SlidersHorizontal className="size-5" aria-hidden="true" />
            Configurações
          </Link>
        ) : null}
        <Button variant="secondary" onClick={() => void sair()}>
          <LogOut className="size-5" aria-hidden="true" />
          Sair
        </Button>
      </div>
    </section>
  );
}
