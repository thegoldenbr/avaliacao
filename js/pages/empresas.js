import { html } from '../html.js';
import { icone } from '../icones.js';
import { iniciarPagina } from '../shell.js';
import { supabase, dados } from '../supabase.js';
import { limparCnpj, mascararCnpj } from '../lib/cnpj.js';
import { UFS } from '../lib/mascaras.js';

const { main } = await iniciarPagina({ ativo: 'empresas' });

const normalizar = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
let empresas = [];

main.innerHTML = String(html`<section class="pilha pilha--lg">
  <header class="pagina-topo">
    <div><h1>Empresas</h1><p id="contagem">Empresas avaliadas</p></div>
    <a class="btn" href="empresa-form.html">${icone('plus')}Nova empresa</a>
  </header>
  <div class="filtros" id="filtros" hidden>
    <div class="input-icone">${icone('search')}<input class="input" type="search" id="busca" aria-label="Buscar empresa" placeholder="Buscar por nome ou CNPJ"></div>
    <select class="select" id="segmento" aria-label="Segmento"><option value="">Todos os segmentos</option></select>
    <select class="select" id="uf" aria-label="Estado"><option value="">Todos os estados</option>${UFS.map((u) => html`<option>${u}</option>`)}</select>
    <select class="select" id="situacao" aria-label="Situação"><option value="todas">Ativas e inativas</option><option value="ativas">Somente ativas</option><option value="inativas">Somente inativas</option></select>
  </div>
  <div id="lista"><div class="carregando" aria-busy="true"><div class="skeleton sk-linha"></div><div class="skeleton sk-linha"></div><div class="skeleton sk-linha"></div></div></div>
</section>`);

const el = (id) => document.getElementById(id);

function linha(e) {
  const total = e.avaliacoes?.[0]?.count ?? 0;
  const local = e.municipio ? `${e.municipio}/${e.uf ?? ''}` : (e.uf ?? '—');
  return html`<li class="linha-empresa">
    <div><a href="empresa.html?id=${e.id}" style="color:inherit;font-weight:600">${e.nome_fantasia ?? e.razao_social}</a>
      <p class="muted num" style="font-size:.875rem">${e.nome_fantasia ? `${e.razao_social} · ` : ''}${mascararCnpj(e.cnpj)}</p></div>
    <p class="muted">${e.segmento ?? '—'}</p>
    <p class="muted">${local}</p>
    <div class="linha"><span class="muted num" style="font-size:.875rem">${total} ${total === 1 ? 'avaliação' : 'avaliações'}</span>${e.ativo ? '' : html`<span class="badge">Inativa</span>`}</div>
  </li>`;
}

function desenharLista() {
  const termo = normalizar(el('busca').value.trim());
  const digitos = limparCnpj(el('busca').value);
  const seg = el('segmento').value;
  const uf = el('uf').value;
  const sit = el('situacao').value;
  const filtradas = empresas.filter((e) => {
    if (seg && e.segmento !== seg) return false;
    if (uf && e.uf !== uf) return false;
    if (sit === 'ativas' && !e.ativo) return false;
    if (sit === 'inativas' && e.ativo) return false;
    if (!termo) return true;
    return normalizar(`${e.razao_social} ${e.nome_fantasia ?? ''}`).includes(termo) || (digitos.length >= 3 && e.cnpj.includes(digitos));
  });
  el('lista').innerHTML = String(
    filtradas.length === 0
      ? html`<div class="centro-vazio">${icone('building', 'icone--lg')}<p><b>${empresas.length === 0 ? 'Nenhuma empresa cadastrada ainda.' : 'Nenhuma empresa encontrada com esses filtros.'}</b></p>${empresas.length === 0 ? html`<a class="btn" href="empresa-form.html">Cadastrar a primeira empresa</a>` : ''}</div>`
      : html`<ul class="linhas">${filtradas.map(linha)}</ul>`,
  );
}

try {
  empresas = dados(await supabase.from('empresas').select('*, avaliacoes(count)').order('razao_social'));
  el('contagem').textContent = `${empresas.length} ${empresas.length === 1 ? 'empresa avaliada' : 'empresas avaliadas'}`;
  const segmentos = [...new Set(empresas.map((e) => e.segmento).filter(Boolean))].sort();
  el('segmento').insertAdjacentHTML('beforeend', String(html`${segmentos.map((s) => html`<option>${s}</option>`)}`));
  el('filtros').hidden = false;
  el('filtros').addEventListener('input', desenharLista);
  el('filtros').addEventListener('change', desenharLista);
  desenharLista();
} catch {
  el('lista').innerHTML = String(html`<p class="erro-geral" role="alert">Não foi possível carregar as empresas. Atualize a página e tente de novo.</p>`);
}
