/** QR code em SVG, gerado no navegador (vendor/qrcode.js, sem serviço externo). */
import { raw } from './html.js';

export function qrSvg(texto, rotulo = 'QR code do link') {
  if (!window.qrcode) return raw('');
  const qr = window.qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  const svg = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  return raw(`<div class="qr" role="img" aria-label="${rotulo}">${svg}</div>`);
}
