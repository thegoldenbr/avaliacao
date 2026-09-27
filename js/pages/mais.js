/** Aba "Mais" do celular: conta, tema, configurações (admin) e sair. */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { iniciarPagina } from '../shell.js';
import { definirEscolha, escolhaAtual } from '../tema.js';
import { sair } from '../auth.js';

const { main, perfil } = await iniciarPagina({ ativo: 'mais' });
const TEMAS = [['sistema', 'Sistema'], ['claro', 'Claro'], ['escuro', 'Escuro']];

function desenhar() {
  main.innerHTML = String(html`<section class="pilha pilha--lg">
    <header><h1>Mais</h1><p class="muted">${perfil.nome} · ${perfil.papel === 'admin' ? 'Administrador' : 'Analista'}</p><p class="muted" style="font-size:.875rem">${perfil.email}</p></header>
    <div class="pilha pilha--sm" role="radiogroup" aria-label="Tema">
      <h2>Aparência</h2>
      <div class="linha" style="flex-wrap:nowrap">
        ${TEMAS.map(([id, rotulo]) => html`<button type="button" class="chip" style="flex:1;justify-content:center" role="radio" aria-checked="${String(escolhaAtual() === id)}" data-tema="${id}">${rotulo}</button>`)}
      </div>
    </div>
    <div class="pilha pilha--sm" style="align-items:flex-start">
      ${perfil.papel === 'admin' ? html`<a class="btn btn--sec" href="configuracoes.html">${icone('ajustes')}Configurações</a>` : ''}
      <button type="button" class="btn btn--sec" id="btn-sair-mais">${icone('sair')}Sair</button>
    </div>
  </section>`);
}
desenhar();
main.addEventListener('click', (e) => {
  const tema = e.target.closest('[data-tema]');
  if (tema) {
    definirEscolha(tema.dataset.tema);
    desenhar();
  }
  if (e.target.closest('#btn-sair-mais')) sair();
});
