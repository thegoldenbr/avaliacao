/** Tema claro / escuro / sistema. A escolha manual fica salva; o tema certo já vem de tema-cedo.js. */
const CONSULTA_ESCURO = '(prefers-color-scheme: dark)';

export function escolhaAtual() {
  try {
    const salva = localStorage.getItem('tema');
    return salva === 'claro' || salva === 'escuro' ? salva : 'sistema';
  } catch {
    return 'sistema';
  }
}

export function temaResolvido(escolha = escolhaAtual()) {
  if (escolha === 'sistema') return matchMedia(CONSULTA_ESCURO).matches ? 'escuro' : 'claro';
  return escolha;
}

export function aplicarTema() {
  const tema = temaResolvido();
  document.documentElement.dataset.tema = tema;
  document.dispatchEvent(new CustomEvent('tema-mudou', { detail: tema }));
}

export function definirEscolha(escolha) {
  try {
    if (escolha === 'sistema') localStorage.removeItem('tema');
    else localStorage.setItem('tema', escolha);
  } catch {
    // Armazenamento bloqueado (modo privado): o tema vale só nesta sessão.
    document.documentElement.dataset.tema = temaResolvido(escolha);
  }
  aplicarTema();
}

matchMedia(CONSULTA_ESCURO).addEventListener('change', () => {
  if (escolhaAtual() === 'sistema') aplicarTema();
});
