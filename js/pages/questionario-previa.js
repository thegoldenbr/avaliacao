/** Pré-visualização "como o respondente verá": um grupo por etapa, sem pesos. Nada é salvo. */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { iniciarPagina } from '../shell.js';
import { supabase } from '../supabase.js';
import { escalaNota } from '../escala-nota.js';

const { main } = await iniciarPagina({ ativo: 'questionarios' });
const id = new URLSearchParams(location.search).get('id');
const { data: q } = await supabase.from('questionarios').select('*, grupos(*, perguntas(*))').eq('id', id ?? '').maybeSingle();
const { data: cfg } = await supabase.from('configuracoes').select('rotulo_escala_min, rotulo_escala_max').eq('id', true).maybeSingle();

if (!q || q.grupos.length === 0) {
  main.innerHTML = String(html`<p class="erro-geral" role="alert">Este questionário ainda não tem grupos para pré-visualizar. <a class="link" href="questionario.html?id=${id}">Voltar ao editor</a></p>`);
  throw new Error('sem grupos');
}

const grupos = [...q.grupos].sort((a, b) => a.ordem - b.ordem).map((g) => ({ ...g, perguntas: [...g.perguntas].sort((a, b) => a.ordem - b.ordem) }));
const total = grupos.reduce((s, g) => s + g.perguntas.length, 0);
const notas = {};
let etapa = 0;

function desenhar() {
  const g = grupos[etapa];
  const respondidas = Object.keys(notas).length;
  main.innerHTML = String(html`<section class="pilha pilha--lg" style="max-width:680px;margin-inline:auto">
    <a class="link" href="questionario.html?id=${q.id}">${icone('esq', 'icone--sm')}Voltar ao editor</a>
    <p class="aviso aviso--info">${icone('info')}<span>Pré-visualização: é assim que a empresa avaliada verá o formulário. As notas escolhidas aqui não são salvas.</span></p>
    <div class="pilha pilha--sm">
      <div class="etapa-topo"><span>Parte ${etapa + 1} de ${grupos.length} · ${g.nome}</span><span class="num">${respondidas} de ${total}</span></div>
      <div class="barra-progresso" role="progressbar" aria-label="Progresso" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${respondidas}"><span style="width:${total ? (respondidas / total) * 100 : 0}%"></span></div>
    </div>
    <div class="pilha pilha--lg">
      ${g.perguntas.length === 0 ? html`<p class="muted">Este grupo ainda não tem perguntas.</p>` : ''}
      ${g.perguntas.map((p, i) => html`<fieldset class="pilha"><legend style="font-size:1.125rem;font-weight:600;line-height:1.35">${i + 1}. ${p.enunciado}</legend>
        ${p.texto_apoio ? html`<p class="muted">${p.texto_apoio}</p>` : ''}
        ${escalaNota({ nome: p.enunciado, valor: notas[p.id] ?? null, pergunta: p.id, rotuloMin: p.rotulo_min ?? cfg?.rotulo_escala_min ?? 'Discordo totalmente', rotuloMax: p.rotulo_max ?? cfg?.rotulo_escala_max ?? 'Concordo totalmente' })}
      </fieldset>`)}
    </div>
    <div class="linha" style="flex-wrap:nowrap">
      <button class="btn btn--sec" style="flex:1" data-etapa="-1" ${etapa === 0 ? 'disabled' : ''}>Anterior</button>
      <button class="btn" style="flex:1" data-etapa="1" ${etapa >= grupos.length - 1 ? 'disabled' : ''}>Próxima</button>
    </div>
  </section>`);
}

main.addEventListener('click', (e) => {
  const nota = e.target.closest('[data-nota]');
  if (nota) {
    notas[nota.dataset.pergunta] = Number(nota.dataset.nota);
    desenhar();
  }
  const passo = e.target.closest('[data-etapa]');
  if (passo && !passo.disabled) {
    etapa += Number(passo.dataset.etapa);
    desenhar();
    scrollTo({ top: 0 });
  }
});
desenhar();
