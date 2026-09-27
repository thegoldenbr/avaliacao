/** Marca da empresa principal (nome, logo, cor de destaque) via RPC pública obter_marca. */
import { supabase } from './supabase.js';
import { variaveisDaMarca } from './lib/cor.js';
import { temaResolvido } from './tema.js';

const COR_PADRAO = '#2B4ACB';
const CHAVE_CACHE = 'marca-cache';
let atual = lerCache();

function lerCache() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_CACHE) ?? 'null');
  } catch {
    return null;
  }
}

/** Aplica a cor de destaque em --color-primary do elemento raiz, com contraste recalculado para o tema. */
export function aplicarCor(marca = atual) {
  const raiz = document.documentElement;
  const vars = marca && marca.cor_destaque.toUpperCase() !== COR_PADRAO ? variaveisDaMarca(marca.cor_destaque, temaResolvido()) : null;
  for (const nome of ['--color-primary', '--color-primary-hover', '--color-on-primary', '--color-primary-soft']) {
    if (vars) raiz.style.setProperty(nome, vars[nome]);
    else raiz.style.removeProperty(nome);
  }
}

document.addEventListener('tema-mudou', () => aplicarCor());

/** Devolve a marca (do cache, se houver) e atualiza em segundo plano. */
export async function carregarMarca() {
  if (atual) aplicarCor(atual);
  try {
    const { data, error } = await supabase.rpc('obter_marca');
    if (error || !data) return atual;
    atual = data;
    try {
      sessionStorage.setItem(CHAVE_CACHE, JSON.stringify(data));
    } catch {
      // sem cache: só busca de novo na próxima página
    }
    aplicarCor(atual);
  } catch {
    // sem rede: segue com o que houver
  }
  return atual;
}

export function marcaEmCache() {
  return atual;
}
