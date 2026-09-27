/**
 * Endereço base do app (origem + caminho, sem o #). No GitHub Pages: https://usuario.github.io/repositorio/
 * Links de e-mail (recuperação, convite) apontam para cá e depois para uma rota no fragmento (#/rota).
 */
export function urlBase(): string {
  return `${location.origin}${location.pathname}`;
}

export function urlDaRota(rota: string): string {
  return `${urlBase()}#${rota}`;
}
