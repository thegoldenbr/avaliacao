const formatoNota = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatoDataHora = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Nota com uma casa decimal e vírgula: 7,3 */
export const formatarNota = (valor) => formatoNota.format(valor);
/** dd/mm/aaaa no fuso do navegador (o banco guarda timestamptz em UTC). */
export const formatarData = (iso) => formatoData.format(new Date(iso));
export const formatarDataHora = (iso) => formatoDataHora.format(new Date(iso)).replace(',', '');
