import { cn } from '@/lib/utils';

interface EscalaNotaProps {
  /** Nota selecionada; `null` = nada selecionado (nunca pré-selecionar). */
  valor: number | null;
  onChange?: (nota: number) => void;
  rotuloMin: string;
  rotuloMax: string;
  nome: string;
  desabilitada?: boolean;
}

const NOTAS = Array.from({ length: 11 }, (_, i) => i);

/** 11 botões (0–10), alvo ≥ 44 px, 6 + 5 em duas linhas no celular. Sem slider, nada pré-selecionado. */
export function EscalaNota({ valor, onChange, rotuloMin, rotuloMax, nome, desabilitada = false }: EscalaNotaProps) {
  return (
    <div>
      <div role="radiogroup" aria-label={`Nota de 0 a 10 para ${nome}`} className="grid grid-cols-6 gap-2 sm:grid-cols-11">
        {NOTAS.map((nota) => (
          <button
            key={nota}
            type="button"
            role="radio"
            aria-checked={valor === nota}
            disabled={desabilitada}
            onClick={() => onChange?.(nota)}
            className={cn(
              'min-h-12 min-w-11 rounded-controle border border-border-strong bg-surface text-lg font-semibold tabular-nums hover:bg-surface-alt disabled:cursor-default',
              valor === nota && 'border-primary bg-primary text-on-primary hover:bg-primary',
            )}
          >
            {nota}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between gap-4 text-sm text-muted">
        <span>0 · {rotuloMin}</span>
        <span className="text-right">10 · {rotuloMax}</span>
      </div>
    </div>
  );
}
