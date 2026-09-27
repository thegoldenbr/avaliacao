/**
 * Moldura das páginas da área interna: exige login, confere o perfil e monta a barra lateral (desktop)
 * e a navegação inferior (celular) em volta do <main> da página.
 */
import { html, esc, raw } from './html.js';
import { icone } from './icones.js';
import { aplicarTema, definirEscolha, escolhaAtual } from './tema.js';
import { carregarMarca, marcaEmCache } from './marca.js';
import { paginaAtual, perfilDe, sair, sessaoAtual } from './auth.js';

const ITENS = [
  { id: 'inicio', rotulo: 'Início', icone: 'home', href: 'index.html' },
  { id: 'empresas', rotulo: 'Empresas', icone: 'building', href: 'empresas.html' },
  { id: 'avaliacoes', rotulo: 'Avaliações', icone: 'clip', href: 'avaliacoes.html' },
  { id: 'questionarios', rotulo: 'Questionários', icone: 'file', href: 'questionarios.html' },
];
const ITEM_CONFIG = { id: 'config', rotulo: 'Configurações', icone: 'ajustes', href: 'configuracoes.html' };
const ITEM_MAIS = { id: 'mais', rotulo: 'Mais', icone: 'mais', href: 'mais.html' };
const TEMAS = { sistema: ['monitor', 'Tema do sistema', 'claro'], claro: ['sol', 'Tema claro', 'escuro'], escuro: ['lua', 'Tema escuro', 'sistema'] };

const nuncaResolve = () => new Promise(() => {});

export function logoMarca(marca = marcaEmCache(), compacta = false) {
  const nome = marca?.nome ?? 'Radar de Desempenho';
  const imagem = marca?.logo_url
    ? html`<img src="${marca.logo_url}" alt="" class="marca-logo" style="object-fit:contain;background:none">`
    : html`<span class="marca-logo" aria-hidden="true">${nome.charAt(0).toUpperCase()}</span>`;
  return html`<span class="marca">${imagem}<span class="marca-nome ${compacta ? 'rot' : ''}">${nome}</span></span>`;
}

function itemNav(item, ativo, comRotuloEscondivel) {
  return html`<a href="${item.href}" ${item.id === ativo ? raw('aria-current="page"') : ''} title="${item.rotulo}">${icone(item.icone)}<span class="${comRotuloEscondivel ? 'rot' : ''}">${item.rotulo}</span></a>`;
}

function botaoTema() {
  const [ic, rotulo, proxima] = TEMAS[escolhaAtual()];
  return html`<button type="button" class="btn btn--ghost btn--icone" data-tema-alternar aria-label="${rotulo}. Alternar para ${TEMAS[proxima][1].toLowerCase()}" title="${rotulo}">${icone(ic)}</button>`;
}

function telaAviso({ titulo, texto, comSair }) {
  document.body.innerHTML = String(html`<div class="centro"><div class="caixa pilha">
    ${icone('escudo', 'icone--lg')}
    <h1>${titulo}</h1><p class="muted">${texto}</p>
    ${comSair ? html`<button class="btn btn--sec" style="align-self:flex-start" id="btn-sair">Sair</button>` : html`<a class="btn" href="index.html">Ir para o início</a>`}
  </div></div>`);
  document.getElementById('btn-sair')?.addEventListener('click', sair);
}

function montarShell({ ativo, perfil, main }) {
  const admin = perfil.papel === 'admin';
  const lateral = admin ? [...ITENS, ITEM_CONFIG] : ITENS;
  const recolhida = (() => {
    try {
      return localStorage.getItem('lateral-recolhida') === '1';
    } catch {
      return false;
    }
  })();

  const app = document.createElement('div');
  app.className = `app${recolhida ? ' recolhida' : ''}`;
  app.innerHTML = String(html`
    <aside class="lateral">
      <div class="topo-lateral">
        ${logoMarca(undefined, true)}
        <button type="button" class="btn btn--ghost btn--icone" data-lateral-alternar aria-label="Recolher ou expandir o menu" aria-expanded="${String(!recolhida)}">${icone('painel')}</button>
      </div>
      <nav aria-label="Principal">${lateral.map((i) => itemNav(i, ativo, true))}</nav>
      <div class="rodape-lateral">
        <div class="linha linha--entre">
          <div class="rot" style="min-width:0;font-size:.875rem"><b class="marca-nome" style="display:block">${perfil.nome}</b><span class="muted">${admin ? 'Administrador' : 'Analista'}</span></div>
          ${botaoTema()}
        </div>
        <button type="button" class="btn btn--ghost" id="btn-sair" title="Sair">${icone('sair')}<span class="rot">Sair</span></button>
      </div>
    </aside>`);
  main.classList.add('principal');
  app.appendChild(main);

  const nav = document.createElement('nav');
  nav.className = 'nav-baixo';
  nav.setAttribute('aria-label', 'Principal');
  nav.innerHTML = String(html`${[...ITENS, ITEM_MAIS].map((i) => itemNav(i, ativo, false))}`);
  document.body.append(app, nav);

  app.addEventListener('click', (e) => {
    if (e.target.closest('#btn-sair')) sair();
    if (e.target.closest('[data-tema-alternar]')) {
      definirEscolha(TEMAS[escolhaAtual()][2]);
      const antigo = app.querySelector('[data-tema-alternar]');
      antigo.outerHTML = String(botaoTema());
    }
    if (e.target.closest('[data-lateral-alternar]')) {
      const agora = app.classList.toggle('recolhida');
      e.target.closest('button').setAttribute('aria-expanded', String(!agora));
      try {
        localStorage.setItem('lateral-recolhida', agora ? '1' : '0');
      } catch {
        // preferência vale só nesta sessão
      }
    }
  });
}

/**
 * Prepara uma página da área interna. Devolve { main, perfil } quando o acesso está liberado;
 * caso contrário redireciona ou mostra o aviso e nunca resolve (a página para ali).
 */
export async function iniciarPagina({ ativo, admin = false, semShell = false }) {
  aplicarTema();
  const main = document.querySelector('main');
  const [sessao] = await Promise.all([sessaoAtual(), carregarMarca()]);
  if (!sessao) {
    location.replace(`login.html?de=${encodeURIComponent(paginaAtual())}`);
    return nuncaResolve();
  }
  let perfil = null;
  try {
    perfil = await perfilDe(sessao.user.id);
  } catch {
    // trata como sem perfil abaixo
  }
  if (!perfil || !perfil.ativo) {
    telaAviso({
      titulo: 'Sem acesso ao sistema',
      texto: 'Sua conta existe, mas ainda não foi liberada (ou foi desativada). Peça a um administrador para convidar você ou reativar seu acesso.',
      comSair: true,
    });
    return nuncaResolve();
  }
  // Senha inicial pendente: nada funciona até trocar (o banco também bloqueia). Segundo login: oferta de PIN.
  if (perfil.precisa_trocar_senha) {
    location.replace('trocar-senha.html');
    return nuncaResolve();
  }
  if (perfil.pin_estado === 'segundo_login') {
    location.replace('pin.html');
    return nuncaResolve();
  }
  if (admin && perfil.papel !== 'admin') {
    main.innerHTML = String(html`<h1>Acesso restrito</h1><p class="muted">Esta área é só para administradores.</p>`);
    montarShell({ ativo, perfil, main });
    return nuncaResolve();
  }
  if (!semShell) montarShell({ ativo, perfil, main });
  return { main, perfil };
}

export const esqueleto = html`<div class="carregando" aria-busy="true"><div class="skeleton sk-titulo"></div><div class="skeleton sk-linha"></div><div class="skeleton sk-linha"></div></div>`;
export { esc };
