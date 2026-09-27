/**
 * Renderiza o snapshot do relatório (mesmo HTML no editor, na pré-visualização e no dashboard do cliente).
 * Recebe só o snapshot (ver lib/snapshot.js); não consulta o banco. Tudo passa por html`` (escapado);
 * os textos do relatório passam por mdParaHtml (markdown básico sem HTML bruto).
 *
 * Layout em abas (ocupa a tela inteira, sem scroll longo): Resumo, Destaques, Por tema, Plano de ação,
 * Próximos passos. `ativarRelatorio(raiz)` liga a navegação; usa delegação de eventos no `document`,
 * então funciona mesmo quando o conteúdo é substituído de novo (nova digitação no editor, por exemplo).
 */
import { html } from './html.js';
import { icone, FAIXA_ICONE } from './icones.js';
import { radar } from './radar.js';
import { mdParaHtml } from './markdown.js';
import { formatarData, formatarNota } from './lib/formatacao.js';

const ROTULO_PRIORIDADE = { alta: 'Prioridade alta', media: 'Prioridade média', baixa: 'Prioridade baixa' };
const ROTULO_HORIZONTE = { curto: 'Curto prazo', medio: 'Médio prazo', longo: 'Longo prazo' };
const TOM_PRIORIDADE = { alta: 'badge--erro', media: 'badge--aviso', baixa: '' };
const ORDEM_PRIORIDADE = { alta: 0, media: 1, baixa: 2 };
const ICONE_ABA = { resumo: 'painel', destaques: 'estrela', temas: 'clip', plano: 'ok', passos: 'relogio' };

const faixaDe = (s, id) => s.faixas.find((f) => f.id === id) ?? null;
const chipFaixa = (s, id, fundo = false) => {
  const f = faixaDe(s, id);
  return f ? html`<span class="faixa faixa--${f.id} ${fundo ? 'faixa-fundo' : ''}">${icone(FAIXA_ICONE[f.id], 'icone--sm')}${f.rotulo}</span>` : '';
};

function series(s) {
  const lista = [{ nome: 'Atual', tipo: 'atual', valores: s.grupos.map((g) => g.nota) }];
  if (s.grupos.some((g) => g.anterior !== null)) lista.push({ nome: 'Avaliação anterior', tipo: 'anterior', valores: s.grupos.map((g) => g.anterior) });
  if (s.grupos.some((g) => g.meta !== null)) lista.push({ nome: 'Meta', tipo: 'meta', valores: s.grupos.map((g) => g.meta) });
  if (s.grupos.some((g) => g.media !== null)) lista.push({ nome: 'Média das empresas', tipo: 'media', valores: s.grupos.map((g) => g.media) });
  return lista;
}

const nomeDoGrupo = (s, id) => s.grupos.find((g) => g.id === id)?.nome ?? '';

function listaComDescricao(s, itens, tom) {
  return html`<ul class="marcador marcador--${tom}">${itens.map((i) => html`<li><b>${i.titulo}</b>${i.grupo ? html`<span class="muted" style="font-size:.875rem">${nomeDoGrupo(s, i.grupo)}</span>` : ''}<div class="muted">${mdParaHtml(i.descricao)}</div></li>`)}</ul>`;
}

function barraGrupo(g) {
  return html`<div class="barra-pergunta ${g.faixaId ? `faixa--${g.faixaId}` : ''}"><p class="texto">${g.nome}</p>
    <div class="trilho" style="position:relative"><div class="preenchido" style="--nota:${g.nota ?? 0}"></div>${g.meta != null ? html`<span class="meta-marca" style="left:${g.meta * 10}%" title="Meta ${formatarNota(g.meta)}"></span>` : ''}</div>
    <span class="valor num">${g.nota === null ? '—' : formatarNota(g.nota)}</span></div>`;
}

const oculta = (s, secao) => s.opcoes?.ocultar?.[secao];

/**
 * @param {object} s snapshot (ver lib/snapshot.js)
 * @param {{animar?:boolean, abaAtiva?:string, grupoAtivo?:string}} opcoes abaAtiva/grupoAtivo preservam a
 *   navegação entre re-renderizações (usado pela prévia ao vivo do editor, que redesenha a cada digitação).
 */
export function renderRelatorio(s, { animar = false, abaAtiva, grupoAtivo } = {}) {
  const c = s.conteudo ?? {};
  const recomendacoes = [...(c.recomendacoes ?? [])].sort((a, b) => (ORDEM_PRIORIDADE[a.prioridade] ?? 3) - (ORDEM_PRIORIDADE[b.prioridade] ?? 3));
  const pontosFortes = c.pontos_fortes ?? [];
  const pontosAtencao = c.pontos_de_atencao ?? [];
  const mostraFortes = !oculta(s, 'pontos_fortes') && pontosFortes.length > 0;
  const mostraAtencao = !oculta(s, 'pontos_de_atencao') && pontosAtencao.length > 0;

  const comAnterior = s.grupos.filter((g) => g.anterior !== null && g.nota !== null);
  const ordenados = [...s.grupos].sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1));
  const mostraRecs = !oculta(s, 'recomendacoes') && recomendacoes.length > 0;
  const mostraEvitar = !oculta(s, 'o_que_evitar') && (c.o_que_evitar ?? []).length > 0;
  const passos = !oculta(s, 'proximos_passos') ? (c.proximos_passos ?? []) : [];
  const consideracoes = !oculta(s, 'consideracoes_finais') ? c.consideracoes_finais : '';

  const abas = [
    ['resumo', 'Resumo', true],
    ['destaques', 'Destaques', mostraFortes || mostraAtencao],
    ['temas', 'Por tema', s.grupos.length > 0],
    ['plano', 'Plano de ação', mostraRecs || mostraEvitar],
    ['passos', 'Próximos passos', passos.length > 0 || Boolean(consideracoes)],
  ].filter((a) => a[2]);
  const abaAtual = abas.some((a) => a[0] === abaAtiva) ? abaAtiva : abas[0][0];
  const grupoAtual = s.grupos.some((g) => g.id === grupoAtivo) ? grupoAtivo : s.grupos[0]?.id;

  const infoGrupo = (g) => [g.meta != null ? `Meta ${formatarNota(g.meta)}` : null, g.anterior != null ? `Avaliação anterior ${formatarNota(g.anterior)}` : null, g.media != null ? `Média das empresas ${formatarNota(g.media)}` : null].filter(Boolean);

  return html`<div class="rel-doc">
    <header class="pilha pilha--sm"><h1>${s.empresa}</h1><p class="muted">${s.titulo}${s.periodo ? ` · ${s.periodo}` : ''}${s.publicado_em ? ` · publicado em ${formatarData(s.publicado_em)}` : ''}</p></header>

    <div role="tablist" class="rel-abas" aria-label="Seções do relatório">${abas.map(([id, rotulo]) => html`<button type="button" role="tab" id="raba-${id}" aria-controls="rpainel-${id}" aria-selected="${String(id === abaAtual)}" class="rel-aba ${id === abaAtual ? 'ativa' : ''}" data-aba="${id}">${icone(ICONE_ABA[id], 'icone--sm')}${rotulo}</button>`)}</div>

    <div class="rel-paineis">
      <section role="tabpanel" id="rpainel-resumo" aria-labelledby="raba-resumo" class="rel-painel" ${abaAtual === 'resumo' ? '' : html`hidden`}>
        <div class="rel-hero">
          <div class="pilha">
            <div class="nota-destaque"><span class="valor num">${s.geral.nota === null ? '—' : formatarNota(s.geral.nota)}</span><span class="de">de 10</span></div>
            <p class="linha">${chipFaixa(s, s.geral.faixaId, true)}${s.variacao ? html`<span class="variacao ${s.variacao.geral >= 0 ? 'variacao--sobe' : 'variacao--desce'}">${icone(s.variacao.geral >= 0 ? 'sobe' : 'desce', 'icone--sm')} ${s.variacao.geral >= 0 ? '+' : '−'}${formatarNota(Math.abs(s.variacao.geral))} desde a avaliação anterior</span>` : ''}</p>
            ${c.resumo_executivo ? html`<div class="leitura">${mdParaHtml(c.resumo_executivo)}</div>` : ''}
          </div>
          <div>${radar(s.grupos.map((g) => g.nomeCurto), series(s), { animar })}</div>
        </div>

        <div class="rel-duas">
          <section aria-labelledby="r-notas"><h2 id="r-notas">Nota por tema</h2>
            <div class="pilha pilha--sm">${ordenados.map((g) => barraGrupo(g))}</div></section>
          ${comAnterior.length
            ? html`<section aria-labelledby="r-evolucao"><h2 id="r-evolucao">Evolução desde a última avaliação</h2>
                <table class="rel-tabela"><thead><tr><th scope="col">Tema</th><th scope="col" class="num">Antes</th><th scope="col" class="num">Agora</th><th scope="col" class="num">Variação</th></tr></thead>
                <tbody>${comAnterior.map((g) => {
                  const d = g.nota - g.anterior;
                  return html`<tr><th scope="row">${g.nome}</th><td class="num">${formatarNota(g.anterior)}</td><td class="num">${formatarNota(g.nota)}</td><td class="num variacao ${d >= 0 ? 'variacao--sobe' : 'variacao--desce'}">${d >= 0 ? '+' : '−'}${formatarNota(Math.abs(d))}</td></tr>`;
                })}</tbody></table></section>`
            : ''}
        </div>

        <details class="bloco"><summary><h3>Como ler este relatório</h3>${icone('baixo', 'chev')}</summary>
          <div class="corpo pilha">
            <p class="leitura">Este relatório apresenta o resultado da avaliação “${s.titulo}” realizada em ${s.empresa}${s.periodo ? ` (${s.periodo})` : ''}. As perguntas estão organizadas em ${s.grupos.length} ${s.grupos.length === 1 ? 'tema' : 'temas'} e cada resposta recebeu uma nota de 0 a 10. A nota de cada tema é a média das perguntas, ponderada pelo peso de cada uma, e a nota geral combina os temas segundo a importância de cada um.</p>
            <h4>Faixas de desempenho</h4>
            <ul class="rel-faixas">${s.faixas.map((f) => html`<li class="faixa faixa--${f.id}">${icone(FAIXA_ICONE[f.id], 'icone--sm')}<b>${f.rotulo}</b><span class="muted">de ${formatarNota(f.de)} a ${formatarNota(f.ate)}</span></li>`)}</ul>
            <p class="muted leitura">Nos gráficos, as barras mostram a nota de 0 a 10. Quando existe, um traço laranja marca a meta do tema e, no radar, as demais linhas comparam com a avaliação anterior, a meta e a média das empresas avaliadas.</p>
          </div>
        </details>
      </section>

      <section role="tabpanel" id="rpainel-destaques" aria-labelledby="raba-destaques" class="rel-painel" ${abaAtual === 'destaques' ? '' : html`hidden`}>
        <div class="rel-duas">
          ${mostraFortes ? html`<section aria-labelledby="r-fortes"><h2 id="r-fortes">Onde a empresa se destaca</h2>${listaComDescricao(s, pontosFortes, 'forte')}</section>` : ''}
          ${mostraAtencao ? html`<section aria-labelledby="r-melhorar"><h2 id="r-melhorar">Onde precisa melhorar</h2>${listaComDescricao(s, pontosAtencao, 'atencao')}</section>` : ''}
        </div>
      </section>

      <section role="tabpanel" id="rpainel-temas" aria-labelledby="raba-temas" class="rel-painel" ${abaAtual === 'temas' ? '' : html`hidden`}>
        <div class="rel-temas">
          <div class="rel-temas-lista" role="tablist" aria-label="Temas" aria-orientation="vertical">${s.grupos.map((g) => html`<button type="button" role="tab" id="rgaba-${g.id}" aria-controls="rgpainel-${g.id}" aria-selected="${String(g.id === grupoAtual)}" class="rel-tema-botao ${g.id === grupoAtual ? 'ativa' : ''}" data-grupo-botao="${g.id}"><span>${g.nome}</span><b class="num faixa--${g.faixaId ?? ''}">${g.nota === null ? '—' : formatarNota(g.nota)}</b></button>`)}</div>
          <div class="rel-temas-conteudo">${s.grupos.map((g) => {
            const texto = oculta(s, 'analise_por_grupo') ? '' : (c.analise_por_grupo ?? []).find((a) => a.grupo === g.id)?.texto;
            const info = infoGrupo(g);
            return html`<div role="tabpanel" id="rgpainel-${g.id}" aria-labelledby="rgaba-${g.id}" class="rel-tema-painel" ${g.id === grupoAtual ? '' : html`hidden`}>
              <div class="pilha pilha--sm" style="margin-bottom:1.5rem"><div class="linha linha--entre"><h2 style="margin:0">${g.nome}</h2><span class="sc"><b class="num">${g.nota === null ? '—' : formatarNota(g.nota)}</b>${chipFaixa(s, g.faixaId)}</span></div>
                ${info.length ? html`<p class="muted">${info.join(' · ')}</p>` : ''}</div>
              <div class="rel-duas">
                <div class="pilha pilha--sm">${g.perguntas.map((p) => html`<div class="barra-pergunta ${p.faixaId ? `faixa--${p.faixaId}` : ''}"><p class="texto">${p.enunciado}</p><div class="trilho"><div class="preenchido" style="--nota:${p.nota}"></div></div><span class="valor num">${p.nota}</span></div>`)}</div>
                ${texto ? html`<div class="leitura rel-analise">${mdParaHtml(texto)}</div>` : ''}
              </div>
            </div>`;
          })}</div>
        </div>
      </section>

      <section role="tabpanel" id="rpainel-plano" aria-labelledby="raba-plano" class="rel-painel" ${abaAtual === 'plano' ? '' : html`hidden`}>
        ${mostraRecs
          ? html`<p class="muted leitura">As recomendações estão ordenadas por prioridade e organizadas por prazo de execução.</p>
              <div class="rel-plano-colunas">${['curto', 'medio', 'longo'].map((h) => {
                const lista = recomendacoes.filter((r) => r.horizonte === h);
                return html`<div class="pilha"><h3>${ROTULO_HORIZONTE[h]}</h3>${lista.length ? lista.map((r) => html`<article class="recomendacao recomendacao--${r.prioridade}">
                  <div class="meta"><span class="badge ${TOM_PRIORIDADE[r.prioridade] ?? ''}">${ROTULO_PRIORIDADE[r.prioridade] ?? r.prioridade}</span>${r.grupo ? html`<span class="badge">${nomeDoGrupo(s, r.grupo)}</span>` : ''}</div>
                  <h4>${r.titulo}</h4><div class="leitura">${mdParaHtml(r.descricao)}</div>${r.impacto_esperado ? html`<p class="muted leitura"><b>Impacto esperado:</b> ${r.impacto_esperado}</p>` : ''}</article>`) : html`<p class="muted">Sem ações neste prazo.</p>`}</div>`;
              })}</div>`
          : ''}
        ${mostraEvitar ? html`<section aria-labelledby="r-evitar" style="margin-top:2rem"><h2 id="r-evitar">O que evitar</h2>${listaComDescricao(s, c.o_que_evitar, 'atencao')}</section>` : ''}
      </section>

      <section role="tabpanel" id="rpainel-passos" aria-labelledby="raba-passos" class="rel-painel" ${abaAtual === 'passos' ? '' : html`hidden`}>
        <div class="rel-duas">
          ${passos.length ? html`<section aria-labelledby="r-passos"><h2 id="r-passos">Próximos passos</h2><ol class="pilha pilha--sm leitura" style="list-style:decimal;padding-left:1.25rem">${passos.map((p) => html`<li>${p}</li>`)}</ol></section>` : ''}
          ${consideracoes ? html`<section aria-labelledby="r-consideracoes"><h2 id="r-consideracoes">Considerações finais</h2><div class="leitura">${mdParaHtml(consideracoes)}</div></section>` : ''}
        </div>
      </section>
    </div>
  </div>`;
}

let ligado = false;

/**
 * Liga a navegação por abas. Delegação de eventos no `document`: chamar uma vez basta, mesmo que o
 * conteúdo seja substituído depois (a prévia do editor redesenha a cada digitação).
 */
export function ativarRelatorio() {
  if (ligado) return;
  ligado = true;
  document.addEventListener('click', (e) => {
    const abaBtn = e.target.closest('[data-aba]');
    if (abaBtn) {
      const doc = abaBtn.closest('.rel-doc');
      doc.querySelectorAll(':scope > [role=tablist] > [data-aba]').forEach((b) => {
        const ativa = b === abaBtn;
        b.classList.toggle('ativa', ativa);
        b.setAttribute('aria-selected', String(ativa));
      });
      doc.querySelectorAll(':scope > .rel-paineis > [role=tabpanel]').forEach((p) => {
        p.hidden = p.id !== `rpainel-${abaBtn.dataset.aba}`;
      });
      doc.scrollIntoView({ behavior: 'instant', block: 'start' });
      return;
    }
    const grupoBtn = e.target.closest('[data-grupo-botao]');
    if (grupoBtn) {
      const lista = grupoBtn.closest('.rel-temas');
      lista.querySelectorAll('[data-grupo-botao]').forEach((b) => {
        const ativa = b === grupoBtn;
        b.classList.toggle('ativa', ativa);
        b.setAttribute('aria-selected', String(ativa));
      });
      lista.querySelectorAll('.rel-tema-painel').forEach((p) => {
        p.hidden = p.id !== `rgpainel-${grupoBtn.dataset.grupoBotao}`;
      });
    }
  });
}

/** Estado atual da navegação (para preservar entre re-renderizações), ou undefined se ainda não montado. */
export function estadoAbas(raiz) {
  const doc = raiz.querySelector('.rel-doc');
  if (!doc) return {};
  return {
    abaAtiva: doc.querySelector('[data-aba].ativa')?.dataset.aba,
    grupoAtivo: doc.querySelector('[data-grupo-botao].ativa')?.dataset.grupoBotao,
  };
}
