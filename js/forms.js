/** Auxiliares de formulário: campo com rótulo/ajuda/erro, máscaras e leitura de valores. */
import { html } from './html.js';
import { icone } from './icones.js';
import { mascararCnpj } from './lib/cnpj.js';
import { mascararTelefone } from './lib/mascaras.js';

/** Rótulo sempre visível, ajuda e (quando houver) erro junto ao campo. `controle` é HTML seguro com id={id}. */
export function campo({ id, rotulo, ajuda, controle, classe = '' }) {
  return html`<div class="campo ${classe}">
    <label for="${id}">${rotulo}</label>
    ${controle}
    ${ajuda ? html`<p class="ajuda" id="${id}-ajuda">${ajuda}</p>` : ''}
    <p class="erro" id="${id}-erro" role="alert" hidden></p>
  </div>`;
}

/** Mostra (ou limpa, com mensagem vazia) o erro de um campo e liga o controle à mensagem. */
export function mostrarErro(raiz, id, mensagem) {
  const controle = raiz.querySelector(`#${id}`);
  const erro = raiz.querySelector(`#${id}-erro`);
  if (!erro) return;
  const ajuda = raiz.querySelector(`#${id}-ajuda`) ? `${id}-ajuda` : '';
  if (mensagem) {
    erro.innerHTML = `${icone('info', 'icone--sm')}${String(html`${mensagem}`)}`;
    erro.hidden = false;
    controle?.setAttribute('aria-invalid', 'true');
    controle?.setAttribute('aria-describedby', `${ajuda} ${id}-erro`.trim());
  } else {
    erro.textContent = '';
    erro.hidden = true;
    controle?.removeAttribute('aria-invalid');
    if (ajuda) controle?.setAttribute('aria-describedby', ajuda);
    else controle?.removeAttribute('aria-describedby');
  }
}

/** Aplica um objeto { id: mensagem } de erros e leva o foco ao primeiro campo com problema. */
export function mostrarErros(raiz, erros, todosOsIds) {
  for (const id of todosOsIds) mostrarErro(raiz, id, erros[id] ?? '');
  const primeiro = todosOsIds.find((id) => erros[id]);
  if (primeiro) raiz.querySelector(`#${primeiro}`)?.focus();
}

/** Liga máscaras a inputs com data-mascara="cnpj" | "telefone". */
export function ligarMascaras(raiz) {
  const mascaras = { cnpj: mascararCnpj, telefone: mascararTelefone };
  raiz.querySelectorAll('[data-mascara]').forEach((input) => {
    const fn = mascaras[input.dataset.mascara];
    if (!fn) return;
    input.addEventListener('input', () => {
      input.value = fn(input.value);
    });
  });
}

/** Lê os campos do formulário como texto aparado; checkboxes viram booleanos. */
export function valoresDoForm(form) {
  const saida = {};
  for (const el of form.elements) {
    if (!el.id || el.type === 'submit' || el.type === 'button' || el.type === 'file') continue;
    saida[el.id] = el.type === 'checkbox' ? el.checked : String(el.value ?? '').trim();
  }
  return saida;
}

export const vazioParaNulo = (v) => (v == null || String(v).trim() === '' ? null : String(v).trim());
