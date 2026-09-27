import { Monitor, Moon, Sun } from 'lucide-react';
import { useTema, type EscolhaTema } from './TemaProvider';
import { Button } from '@/components/ui/button';

const PROXIMA: Record<EscolhaTema, EscolhaTema> = { sistema: 'claro', claro: 'escuro', escuro: 'sistema' };
const ROTULO: Record<EscolhaTema, string> = { sistema: 'Tema do sistema', claro: 'Tema claro', escuro: 'Tema escuro' };
const ICONE = { sistema: Monitor, claro: Sun, escuro: Moon } as const;

export function AlternarTema() {
  const { escolha, definirEscolha } = useTema();
  const Icone = ICONE[escolha];

  function handleClique() {
    definirEscolha(PROXIMA[escolha]);
  }

  return (
    <Button
      variant="ghost"
      size="icone"
      onClick={handleClique}
      aria-label={`${ROTULO[escolha]}. Alternar para ${ROTULO[PROXIMA[escolha]].toLowerCase()}`}
      title={ROTULO[escolha]}
    >
      <Icone className="size-5" aria-hidden="true" />
    </Button>
  );
}
