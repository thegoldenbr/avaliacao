import { html } from '../html.js';
import { icone } from '../icones.js';
import { iniciarPagina } from '../shell.js';
import { supabase, dados } from '../supabase.js';
import { formatarData } from '../lib/formatacao.js';
import { ROTULO_STATUS, TOM_STATUS } from '../lib/status.js';

const { main } = await iniciarPagina({ ativo: 'avaliacoes' });
const normalizar = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
let avaliacoes = [];

main.innerHTML = String(html`<section class="pilha pilha--lg">
  <header class="pagina-topo"><div><h1>Avaliações</h1><p id="contagem">Aplicações de um questionário a uma empresa</p></div>
    <a class="btn" href="avaliacao-nova.html">${icone('plus')}Nova avaliação</a></header>
  <div class="filtros" id="filtros" hidden>
    <div class="input-icone">${icone('search')}<input class="input" type="search" id="busca" aria-label="Buscar avaliação" placeholder="Buscar por empresa ou título"></div>
    <select class="select" id="status" aria-label="Status"><option value="">Todos os status</option>${Object.entries(ROTULO_STATUS).map(([id, r]) => html`<option value="${id}">${r}</option>`)}</select>
    <select class="select" id="empresa" aria-label="Empresa"><option value="">Todas as empresas</option></select>
    <select class="select" id="periodo" aria-label="Período"><option value="">Qualquer data</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="365">Último ano</option></select>
  </div>
  <div id="lista"><div class="carregando" aria-busy="true"><div class="skeleton sk-linha"></div><div class="skeleton sk-linha"></div></div></div>
</section>`);

const el = (id) => document.getElementById(id);
const nomeDa = (a) => a.empresas?.nome_fantasia ?? a.empresas?.razao_social ?? '—';

function desenhar() {
  const termo = normalizar(el('busca').value.trim());
  const dias = Number(el('periodo').value);
  const limite = dias ? Date.now() - dias * 86_400_000 : 0;
  const lista = avaliacoes.filter((a) => {
    if (el('status').value && a.status !== el('status').value) return false;
    if (el('empresa').value && a.empresa_id !== el('empresa').value) return false;
    if (limite && new Date(a.criado_em).getTime() < limite) return false;
    return !termo || normalizar(`${nomeDa(a)} ${a.titulo}`).includes(termo);
  });
  el('lista').innerHTML = String(
    lista.length === 0
      ? html`<div class="centro-vazio">${icone('clip', 'icone--lg')}<p><b>${avaliacoes.length === 0 ? 'Nenhuma avaliação ainda.' : 'Nenhuma avaliação com esses filtros.'}</b></p>${avaliacoes.length === 0 ? html`<a class="btn" href="avaliacao-nova.html">Criar a primeira avaliação</a>` : ''}</div>`
      : html`<ul class="linhas">${lista.map((a) => html`<li class="linha linha--entre"><div style="min-width:0"><a href="avaliacao.html?id=${a.id}" style="color:inherit;font-weight:600">${nomeDa(a)}</a>
          <p class="muted" style="font-size:.875rem">${a.titulo} · criada em ${formatarData(a.criado_em)}${a.prazo && a.status === 'aguardando_resposta' ? ` · prazo ${formatarData(a.prazo)}` : ''}</p></div>
          <span class="badge ${TOM_STATUS[a.status] ?? ''}">${ROTULO_STATUS[a.status] ?? a.status}</span></li>`)}</ul>`,
  );
}

try {
  avaliacoes = dados(await supabase.from('avaliacoes').select('id, titulo, status, prazo, criado_em, empresa_id, empresas(nome_fantasia, razao_social)').order('criado_em', { ascending: false }));
  el('contagem').textContent = `${avaliacoes.length} ${avaliacoes.length === 1 ? 'avaliação' : 'avaliações'}`;
  const empresas = [...new Map(avaliacoes.map((a) => [a.empresa_id, nomeDa(a)])).entries()].sort((x, y) => x[1].localeCompare(y[1]));
  el('empresa').insertAdjacentHTML('beforeend', String(html`${empresas.map(([id, nome]) => html`<option value="${id}">${nome}</option>`)}`));
  el('filtros').hidden = false;
  el('filtros').addEventListener('input', desenhar);
  el('filtros').addEventListener('change', desenhar);
  desenhar();
} catch {
  el('lista').innerHTML = String(html`<p class="erro-geral" role="alert">Não foi possível carregar as avaliações. Atualize a página e tente de novo.</p>`);
}
