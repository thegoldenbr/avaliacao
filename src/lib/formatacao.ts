const formatoNota = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatoDataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Nota com uma casa decimal e vírgula: 7,3 */
export function formatarNota(valor: number): string {
  return formatoNota.format(valor);
}

/** dd/mm/aaaa, no fuso do navegador (o banco guarda timestamptz em UTC). */
export function formatarData(iso: string | Date): string {
  return formatoData.format(new Date(iso));
}

export function formatarDataHora(iso: string | Date): string {
  return formatoDataHora.format(new Date(iso)).replace(',', '');
}
