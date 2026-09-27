import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useConfiguracoes } from './api';
import { FaixasForm } from './FaixasForm';
import { MarcaForm } from './MarcaForm';
import { TextosForm } from './TextosForm';
import { UsuariosPainel } from './UsuariosPainel';

const ABAS = [
  { id: 'marca', rotulo: 'Marca' },
  { id: 'textos', rotulo: 'Textos e escala' },
  { id: 'faixas', rotulo: 'Faixas' },
  { id: 'usuarios', rotulo: 'Usuários' },
] as const;
type IdAba = (typeof ABAS)[number]['id'];

export default function ConfiguracoesPagina() {
  const { data: config, isPending, error } = useConfiguracoes();
  const [aba, setAba] = useState<IdAba>('marca');

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-[1.625rem] font-semibold tracking-tight">Configurações</h1>
        <p className="text-muted">Visíveis apenas para administradores.</p>
      </header>

      <div role="tablist" aria-label="Seções" className="flex gap-1 overflow-x-auto border-b border-border">
        {ABAS.map((a) => (
          <button
            key={a.id}
            id={`aba-${a.id}`}
            role="tab"
            type="button"
            aria-selected={aba === a.id}
            aria-controls={`painel-${a.id}`}
            onClick={() => setAba(a.id)}
            className={cn('min-h-11 whitespace-nowrap border-b-2 border-transparent px-4 font-medium text-muted hover:text-foreground', aba === a.id && 'border-primary font-semibold text-foreground')}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`}>
        {aba === 'usuarios' ? <UsuariosPainel /> : isPending ? <Skeleton className="h-48 w-full" /> : error || !config ? (
          <p role="alert" className="text-error">Não foi possível carregar as configurações. Atualize a página e tente de novo.</p>
        ) : aba === 'marca' ? <MarcaForm config={config} /> : aba === 'textos' ? <TextosForm config={config} /> : <FaixasForm config={config} />}
      </div>
    </section>
  );
}
