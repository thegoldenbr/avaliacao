/**
 * Templates HTML seguros: tudo que é interpolado em html`...` é escapado, exceto o que já é "seguro"
 * (resultado de outro html`` ou de raw()). Evita XSS ao montar telas com dados vindos do banco.
 */
const MAPA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (valor) => String(valor ?? '').replace(/[&<>"']/g, (c) => MAPA[c]);

class Seguro {
  constructor(texto) {
    this.texto = texto;
  }
  toString() {
    return this.texto;
  }
}

/** Marca um trecho como HTML confiável (ex.: SVG dos ícones). Nunca use com texto de usuário. */
export const raw = (texto) => new Seguro(String(texto));

function parte(valor) {
  if (valor === null || valor === undefined || valor === false) return '';
  if (valor instanceof Seguro) return valor.texto;
  if (Array.isArray(valor)) return valor.map(parte).join('');
  return esc(valor);
}

export function html(textos, ...valores) {
  let saida = '';
  textos.forEach((texto, i) => {
    saida += texto;
    if (i < valores.length) saida += parte(valores[i]);
  });
  return new Seguro(saida);
}
