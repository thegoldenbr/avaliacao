import { html } from '../html.js';
import { icone } from '../icones.js';
import { iniciarPagina } from '../shell.js';

const { main } = await iniciarPagina({ ativo: 'avaliacoes' });
main.innerHTML = String(html`<section class="pilha">
  <h1>Avaliações</h1>
  <div class="centro-vazio">${icone('clip', 'icone--lg')}<p><b>Esta tela chega na Fase 3.</b></p><p class="muted" style="max-width:60ch">Criação com cópia do questionário, links de resposta, acompanhamento e formulário público.</p></div>
</section>`);
