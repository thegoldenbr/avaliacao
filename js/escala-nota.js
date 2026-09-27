/** Escala 0–10: 11 botões (≥ 44 px), 6 + 5 no celular, sem slider e nada pré-selecionado. Reaproveitada no formulário público. */
import { html } from './html.js';

export function escalaNota({ nome, valor, pergunta, rotuloMin, rotuloMax, desabilitada = false }) {
  const botoes = Array.from({ length: 11 }, (_, n) =>
    html`<button type="button" role="radio" aria-checked="${String(valor === n)}" data-nota="${n}" data-pergunta="${pergunta}" ${desabilitada ? 'disabled' : ''}>${n}</button>`,
  );
  return html`<div>
    <div class="escala" role="radiogroup" aria-label="Nota de 0 a 10 para ${nome}">${botoes}</div>
    <div class="escala-extremos"><span>0 · ${rotuloMin}</span><span style="text-align:right">10 · ${rotuloMax}</span></div>
  </div>`;
}
