import { html } from '../html.js';
import { iniciarPagina } from '../shell.js';
import { supabase } from '../supabase.js';
import { formFaixas, formMarca, formTextos } from './_config-forms.js';
import { montarUsuarios } from './_usuarios.js';

const { main, perfil } = await iniciarPagina({ ativo: 'config', admin: true });

const ABAS = [['marca', 'Marca'], ['textos', 'Textos e escala'], ['faixas', 'Faixas'], ['usuarios', 'Usuários']];
let config = null;

main.innerHTML = String(html`<section class="pilha pilha--lg">
  <header><h1>Configurações</h1><p class="muted">Visíveis apenas para administradores.</p></header>
  <div class="abas" role="tablist" aria-label="Seções">${ABAS.map(([id, rotulo], i) => html`<button type="button" role="tab" id="aba-${id}" data-aba="${id}" aria-selected="${String(i === 0)}" aria-controls="painel">${rotulo}</button>`)}</div>
  <div id="painel" role="tabpanel"></div>
</section>`);

const painel = document.getElementById('painel');

async function abrir(aba) {
  main.querySelectorAll('[data-aba]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === aba)));
  painel.setAttribute('aria-labelledby', `aba-${aba}`);
  painel.innerHTML = String(html`<div class="carregando" aria-busy="true"><div class="skeleton sk-bloco"></div></div>`);
  // Área nova a cada abertura: evita empilhar ouvintes de eventos ao voltar para a aba.
  const area = document.createElement('div');
  if (aba === 'usuarios') {
    painel.replaceChildren(area);
    return montarUsuarios(area, perfil);
  }
  if (!config) {
    const { data, error } = await supabase.from('configuracoes').select('*').eq('id', true).single();
    if (error) {
      painel.innerHTML = String(html`<p class="erro-geral" role="alert">Não foi possível carregar as configurações. Atualize a página e tente de novo.</p>`);
      return;
    }
    config = data;
  }
  painel.replaceChildren(area);
  if (aba === 'marca') formMarca(area, config);
  if (aba === 'textos') formTextos(area, config);
  if (aba === 'faixas') formFaixas(area, config);
}

main.querySelector('.abas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-aba]');
  if (b) void abrir(b.dataset.aba);
});
await abrir('marca');
