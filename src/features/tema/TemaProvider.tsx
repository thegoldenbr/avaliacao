import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type EscolhaTema = 'claro' | 'escuro' | 'sistema';
export type Tema = 'claro' | 'escuro';

interface ValorTema {
  escolha: EscolhaTema;
  tema: Tema;
  definirEscolha: (escolha: EscolhaTema) => void;
}

const TemaContexto = createContext<ValorTema | null>(null);
const CONSULTA_ESCURO = '(prefers-color-scheme: dark)';

function lerEscolha(): EscolhaTema {
  try {
    const salva = localStorage.getItem('tema');
    return salva === 'claro' || salva === 'escuro' ? salva : 'sistema';
  } catch {
    return 'sistema';
  }
}

export function TemaProvider({ children }: { children: ReactNode }) {
  const [escolha, setEscolha] = useState<EscolhaTema>(lerEscolha);
  const [sistemaEscuro, setSistemaEscuro] = useState(() => matchMedia(CONSULTA_ESCURO).matches);

  useEffect(() => {
    const consulta = matchMedia(CONSULTA_ESCURO);
    const handleMudanca = (evento: MediaQueryListEvent) => setSistemaEscuro(evento.matches);
    consulta.addEventListener('change', handleMudanca);
    return () => consulta.removeEventListener('change', handleMudanca);
  }, []);

  const tema: Tema = escolha === 'sistema' ? (sistemaEscuro ? 'escuro' : 'claro') : escolha;

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  const definirEscolha = useCallback((nova: EscolhaTema) => {
    setEscolha(nova);
    try {
      if (nova === 'sistema') localStorage.removeItem('tema');
      else localStorage.setItem('tema', nova);
    } catch {
      // Armazenamento bloqueado (modo privado): o tema vale só nesta sessão.
    }
  }, []);

  const valor = useMemo(() => ({ escolha, tema, definirEscolha }), [escolha, tema, definirEscolha]);
  return <TemaContexto.Provider value={valor}>{children}</TemaContexto.Provider>;
}

export function useTema(): ValorTema {
  const valor = useContext(TemaContexto);
  if (!valor) throw new Error('useTema precisa estar dentro de <TemaProvider>.');
  return valor;
}
