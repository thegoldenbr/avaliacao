import { cn } from '@/lib/utils';
import { useMarca } from './useMarca';

interface LogoMarcaProps {
  /** Mostra só o quadrado da logo, sem o nome. */
  compacta?: boolean;
  className?: string;
}

/** Logo e nome da empresa principal; sem logo cadastrada, usa a inicial do nome sobre a cor de destaque. */
export function LogoMarca({ compacta = false, className }: LogoMarcaProps) {
  const { data } = useMarca();
  const nome = data?.nome ?? 'Radar de Desempenho';

  return (
    <span className={cn('flex items-center gap-2.5 font-semibold', className)}>
      {data?.logo_url ? (
        <img src={data.logo_url} alt="" className="size-8 rounded-lg object-contain" />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-8 flex-none place-items-center rounded-lg bg-primary text-[0.9375rem] font-bold text-on-primary"
        >
          {nome.charAt(0).toUpperCase()}
        </span>
      )}
      <span className={cn(compacta && 'sr-only')}>{nome}</span>
    </span>
  );
}
