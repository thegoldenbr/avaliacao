import { useEffect } from 'react';
import { variaveisDaMarca } from '@/lib/cor';
import { useTema } from '@/features/tema/TemaProvider';
import { useMarca } from './useMarca';

const COR_PADRAO = '#2B4ACB';
const VARIAVEIS = ['--color-primary', '--color-primary-hover', '--color-on-primary', '--color-primary-soft'] as const;

/**
 * Aplica em tempo de execução a cor de destaque configurada, em --color-primary do elemento raiz,
 * com o texto sobre ela recalculado para manter o contraste. Sem cor personalizada, usa os tokens do tema.
 */
export function AplicarMarca() {
  const { tema } = useTema();
  const { data } = useMarca();

  useEffect(() => {
    const raiz = document.documentElement;
    const personalizada = data && data.cor_destaque.toUpperCase() !== COR_PADRAO;
    const variaveis = personalizada ? variaveisDaMarca(data.cor_destaque, tema) : null;
    for (const nome of VARIAVEIS) {
      if (variaveis) raiz.style.setProperty(nome, variaveis[nome]);
      else raiz.style.removeProperty(nome);
    }
  }, [data, tema]);

  return null;
}
