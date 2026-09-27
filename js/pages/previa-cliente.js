/** Prévia interna: o relatório exatamente como o cliente vê (publicado, ou o rascunho atual se ainda não publicado). */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { iniciarPagina } from '../shell.js';
import { supabase } from '../supabase.js';
import { montarPaginaDoRelatorio } from '../relatorio-pagina.js';
import { statusTemIndicadores } from './_avaliacao-indicadores.js';
import { SELECAO_AVALIACAO, obterSnapshotAtual } from './_snapshot-atual.js';

const { main } = await iniciarPagina({ ativo: 'avaliacoes' });
const id = new URLSearchParams(location.search).get('id');
const { data: av } = await supabase.from('avaliacoes').select(SELECAO_AVALIACAO).eq('id', id ?? '').maybeSingle();

if (!av || !statusTemIndicadores(av.status)) {
  main.innerHTML = String(html`<p class="erro-geral" role="alert">Esta avaliação ainda não foi respondida, então não há relatório para mostrar. <a class="link" href="${av ? `avaliacao.html?id=${av.id}` : 'avaliacoes.html'}">Voltar</a></p>`);
  throw new Error('sem respostas');
}

main.innerHTML = String(html`<div class="carregando" aria-busy="true"><div class="skeleton sk-titulo"></div><div class="skeleton sk-bloco"></div></div>`);
const { snapshot, origem, marca, rodape } = await obterSnapshotAtual(av);
const nome = av.empresas.nome_fantasia ?? av.empresas.razao_social;

const textoOrigem = {
  publicado: 'Este é o relatório publicado, exatamente como o cliente vê no link público.',
  rascunho: 'Este relatório ainda não foi publicado: você está vendo o rascunho atual. O cliente só vê depois de publicar.',
  indicadores: 'Ainda não há texto de análise: você está vendo só os indicadores. Escreva ou gere a análise no editor.',
}[origem];

const aviso = html`<div class="aviso aviso--info" role="status">${icone('info')}<div class="pilha pilha--sm"><p><b>Prévia do cliente.</b> ${textoOrigem}</p>
  <div class="linha"><a class="btn btn--sec btn--sm" href="avaliacao.html?id=${av.id}">${icone('esq', 'icone--sm')}Voltar à avaliação</a>
    <a class="btn btn--sec btn--sm" href="relatorio-editor.html?id=${av.id}">${icone('editar', 'icone--sm')}Editar relatório</a>
    <a class="btn btn--sm" href="apresentacao.html?id=${av.id}">${icone('monitor', 'icone--sm')}Modo de apresentação</a></div></div></div>`;

document.title = `Prévia — ${nome}`;
montarPaginaDoRelatorio(main, { snapshot, marca, rodape, aviso });
