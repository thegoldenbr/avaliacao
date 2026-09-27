import { html } from '../html.js';
import { iniciarPagina } from '../shell.js';
import { supabase, dados } from '../supabase.js';
import { formatarData } from '../lib/formatacao.js';
import { ROTULO_STATUS, TOM_STATUS } from '../lib/status.js';

const { main, perfil } = await iniciarPagina({ ativo: 'inicio' });

const hora = new Date().getHours();
const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
const ORDEM = ['rascunho', 'aguardando_resposta', 'respondida', 'em_analise', 'publicada'];
const nomeDaEmpresa = (a) => a.empresas?.nome_fantasia ?? a.empresas?.razao_social ?? '—';

main.innerHTML = String(html`<section class="pilha pilha--lg">
  <header><h1>${saudacao}, ${perfil.nome.split(' ')[0]}</h1><p class="muted">Resumo das avaliações.</p></header>
  <div id="resumo"><div class="carregando" aria-busy="true"><div class="skeleton sk-linha"></div></div></div>
</section>`);

const alvo = document.getElementById('resumo');
try {
  const avaliacoes = dados(
    await supabase.from('avaliacoes').select('id, titulo, status, respondido_em, criado_em, empresas(nome_fantasia, razao_social)').order('criado_em', { ascending: false }),
  );
  const contagem = (s) => avaliacoes.filter((a) => a.status === s).length;
  const acao = avaliacoes.filter((a) => a.status === 'respondida');

  alvo.innerHTML = String(html`
    <dl class="numeros">${ORDEM.map((s) => html`<div><dt>${ROTULO_STATUS[s]}</dt><dd>${contagem(s)}</dd></div>`)}</dl>
    <div class="grade-2" style="margin-top:2.5rem;gap:2.5rem">
      <section aria-labelledby="acao"><h2 id="acao" style="margin-bottom:.75rem">Precisa da sua ação</h2>
        ${acao.length === 0
          ? html`<p class="muted">Nenhuma avaliação aguardando análise.</p>`
          : html`<ul class="linhas">${acao.map((a) => html`<li class="linha linha--entre"><div><b>${nomeDaEmpresa(a)}</b><p class="muted">${a.respondido_em ? `Respondida em ${formatarData(a.respondido_em)}` : 'Respondida'}</p></div><span class="badge badge--info">Analisar</span></li>`)}</ul>`}
      </section>
      <section aria-labelledby="recentes"><h2 id="recentes" style="margin-bottom:.75rem">Avaliações recentes</h2>
        ${avaliacoes.length === 0
          ? html`<p class="muted">Ainda não há avaliações. Cadastre uma <a class="link" href="empresas.html">empresa</a> e um <a class="link" href="questionarios.html">questionário</a> para começar.</p>`
          : html`<ul class="linhas">${avaliacoes.slice(0, 6).map((a) => html`<li class="linha linha--entre"><div><b>${nomeDaEmpresa(a)}</b><p class="muted">${a.titulo}</p></div><span class="badge ${TOM_STATUS[a.status] ?? ''}">${ROTULO_STATUS[a.status] ?? a.status}</span></li>`)}</ul>`}
      </section>
    </div>`);
} catch {
  alvo.innerHTML = String(html`<p class="erro-geral" role="alert">Não foi possível carregar o resumo. Atualize a página e tente de novo.</p>`);
}
