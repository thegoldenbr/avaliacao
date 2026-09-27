import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tipo = 'ok' | 'erro';
interface Aviso {
  id: number;
  tipo: Tipo;
  texto: string;
}

interface ValorToast {
  notificar: (texto: string, tipo?: Tipo) => void;
}

const ToastContexto = createContext<ValorToast | null>(null);
let proximoId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const notificar = useCallback((texto: string, tipo: Tipo = 'ok') => {
    const id = proximoId++;
    setAvisos((atuais) => [...atuais, { id, tipo, texto }]);
    setTimeout(() => setAvisos((atuais) => atuais.filter((a) => a.id !== id)), tipo === 'erro' ? 8000 : 4000);
  }, []);

  const valor = useMemo(() => ({ notificar }), [notificar]);

  return (
    <ToastContexto.Provider value={valor}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {avisos.map((aviso) => (
          <p
            key={aviso.id}
            className={cn(
              'pointer-events-auto flex max-w-[520px] items-start gap-2 rounded-controle border bg-surface px-4 py-3 shadow-lg',
              aviso.tipo === 'erro' ? 'border-error text-error' : 'border-success text-foreground',
            )}
          >
            {aviso.tipo === 'erro' ? (
              <CircleAlert className="mt-0.5 size-5 flex-none" aria-hidden="true" />
            ) : (
              <CircleCheck className="mt-0.5 size-5 flex-none text-success" aria-hidden="true" />
            )}
            {aviso.texto}
          </p>
        ))}
      </div>
    </ToastContexto.Provider>
  );
}

export function useToast(): ValorToast {
  const valor = useContext(ToastContexto);
  if (!valor) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return valor;
}
