/** Avisos rápidos (toast), diálogos modais e confirmações. */
import { html, esc } from './html.js';
import { icone } from './icones.js';

let areaToasts = null;

export function toast(texto, tipo = 'ok') {
  if (!areaToasts) {
    areaToasts = document.createElement('div');
    areaToasts.className = 'toasts';
    areaToasts.setAttribute('role', 'status');
    areaToasts.setAttribute('aria-live', 'polite');
    document.body.appendChild(areaToasts);
  }
  const item = document.createElement('p');
  item.className = `toast${tipo === 'erro' ? ' toast--erro' : ''}`;
  item.innerHTML = `${icone(tipo === 'erro' ? 'info' : 'ok')}${esc(texto)}`;
  areaToasts.appendChild(item);
  setTimeout(() => item.remove(), tipo === 'erro' ? 8000 : 4000);
}

/**
 * Abre um diálogo modal nativo (<dialog>): foco preso, Esc fecha, leitores de tela anunciam o título.
 * `corpo` é HTML seguro (html``). Devolve { el, fechar }.
 */
export function abrirDialogo({ titulo, corpo, aoFechar }) {
  const el = document.createElement('dialog');
  el.className = 'dialogo';
  el.setAttribute('aria-labelledby', 'dialogo-titulo');
  el.innerHTML = String(html`
    <div class="dialogo-corpo">
      <div class="dialogo-topo">
        <h2 id="dialogo-titulo">${titulo}</h2>
        <button type="button" class="btn btn--ghost btn--icone" data-fechar aria-label="Fechar">${icone('x')}</button>
      </div>
      <div data-conteudo>${corpo}</div>
    </div>`);
  const fechar = () => el.close();
  el.addEventListener('close', () => {
    el.remove();
    aoFechar?.();
  });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-fechar]')) fechar();
  });
  document.body.appendChild(el);
  el.showModal();
  return { el, fechar };
}

/** Confirmação de ação destrutiva. Se `textoParaDigitar` for dado, o usuário precisa digitá-lo para liberar o botão. */
export function confirmar({ titulo, descricao, textoParaDigitar, rotuloConfirmar = 'Excluir' }) {
  return new Promise((resolve) => {
    let resultado = false;
    const { el, fechar } = abrirDialogo({
      titulo,
      aoFechar: () => resolve(resultado),
      corpo: html`
        <div class="pilha">
          <p>${descricao}</p>
          ${textoParaDigitar
            ? html`<div class="campo"><label for="confirmar-texto">Digite “${textoParaDigitar}” para confirmar</label>
                <input class="input" id="confirmar-texto" autocomplete="off"></div>`
            : ''}
          <div class="dialogo-acoes">
            <button type="button" class="btn btn--sec" data-fechar>Cancelar</button>
            <button type="button" class="btn btn--perigo" data-confirmar ${textoParaDigitar ? 'disabled' : ''}>${rotuloConfirmar}</button>
          </div>
        </div>`,
    });
    const botao = el.querySelector('[data-confirmar]');
    el.querySelector('#confirmar-texto')?.addEventListener('input', (e) => {
      botao.disabled = e.target.value.trim() !== textoParaDigitar;
    });
    botao.addEventListener('click', () => {
      resultado = true;
      fechar();
    });
  });
}

/** Bloqueia um botão enquanto uma ação assíncrona roda (evita clique duplo). */
export async function comCarregando(botao, rotuloEnquanto, acao) {
  const original = botao.innerHTML;
  botao.disabled = true;
  botao.textContent = rotuloEnquanto;
  try {
    return await acao();
  } finally {
    botao.disabled = false;
    botao.innerHTML = original;
  }
}
