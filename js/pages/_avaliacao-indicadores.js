/** Indicadores da avaliação: carrega respostas, avaliação anterior e média do modelo, calcula e desenha. */
import { html } from '../html.js';
import { icone, FAIXA_ICONE } from '../icones.js';
import { radar } from '../radar.js';
import { supabase, dados } from '../supabase.js';
import { baixarCsv, nomeDeArquivo } from '../lib/csv.js';
import { formatarData, formatarNota } from '../lib/formatacao.js';
import { calcularIndicadores, classificar, gerarInsights, mediaDosGrupos } from '../lib/indicadores.js';
import { lerFaixas } from '../lib/faixas.js';
import { toast } from '../ui.js';

const STATUS_COM_RESPOSTA = ['respondida', 'em_analise', 'publicada'];
const MINIMO_PARA_MEDIA = 5;

/** Junta o snapshot (grupos/perguntas) com as respostas. */
export function montarGrupos(av, respostas) {
  const porPergunta = new Map(respostas.map((r) => [r.pergunta_id, r]));
  return [...av.avaliacao_grupos]
    .sort((a, b) => a.ordem - b.ordem)
    .map((g) => ({
      ...g,
      perguntas: [...g.avaliacao_perguntas].sort((a, b) => a.ordem - b.ordem).map((p) => ({ ...p, nota: porPergunta.get(p.id)?.nota ?? null, comentario: porPergunta.get(p.id)?.comentario ?? null })),
    }));
}

const SELECAO = '*, avaliacao_grupos(*, avaliacao_perguntas(*))';

async function indicadoresDe(avaliacao) {
  const respostas = dados(await supabase.from('respostas').select('pergunta_id, nota, comentario').eq('avaliacao_id', avaliacao.id));
  return calcularIndicadores(montarGrupos(avaliacao, respostas));
}

async function carregarAnterior(av) {
  let alvo = null;
  if (av.avaliacao_anterior_id) alvo = dados(await supabase.from('avaliacoes').select(SELECAO).eq('id', av.avaliacao_anterior_id).maybeSingle());
  if (!alvo && av.questionario_origem_id) {
    const candidatas = dados(
      await supabase.from('avaliacoes').select(SELECAO).eq('empresa_id', av.empresa_id).eq('questionario_origem_id', av.questionario_origem_id).neq('id', av.id).in('status', STATUS_COM_RESPOSTA).order('criado_em', { ascending: false }),
    );
    alvo = candidatas.find((c) => c.criado_em < av.criado_em) ?? null;
  }
  if (!alvo || !STATUS_COM_RESPOSTA.includes(alvo.status)) return null;
  return { titulo: alvo.titulo, indicadores: await indicadoresDe(alvo) };
}

/** Média das OUTRAS empresas com o mesmo modelo; só existe com pelo menos 5 avaliações. */
async function carregarMedia(av) {
  if (!av.questionario_origem_id) return null;
  const outras = dados(await supabase.from('avaliacoes').select('id').eq('questionario_origem_id', av.questionario_origem_id).neq('empresa_id', av.empresa_id).in('status', STATUS_COM_RESPOSTA));
  if (outras.length < MINIMO_PARA_MEDIA) return null;
  const completas = dados(await supabase.from('avaliacoes').select(SELECAO).in('id', outras.map((o) => o.id)));
  const respostas = dados(await supabase.from('respostas').select('avaliacao_id, pergunta_id, nota').in('avaliacao_id', outras.map((o) => o.id)));
  const lista = completas.map((a) => calcularIndicadores(montarGrupos(a, respostas.filter((r) => r.avaliacao_id === a.id))));
  return mediaDosGrupos(lista, MINIMO_PARA_MEDIA);
}

export const statusTemIndicadores = (status) => STATUS_COM_RESPOSTA.includes(status);

const linhaFaixa = (faixa) => (faixa ? html`<span class="faixa faixa--${faixa.id}">${icone(FAIXA_ICONE[faixa.id], 'icone--sm')}${faixa.rotulo}</span>` : html`<span class="muted">Sem nota</span>`);
const sinal = (v) => `${v >= 0 ? '+' : '−'}${formatarNota(Math.abs(v))}`;

function tabelaDeRespostas(g, faixas) {
  return html`<details class="bloco"><summary><h3>${g.nome}</h3><span class="sc"><b class="num">${g.nota === null ? '—' : formatarNota(g.nota)}</b>${linhaFaixa(classificar(g.nota, faixas))}${icone('baixo', 'chev')}</span></summary>
    <div class="corpo">${g.perguntas.map((p) => {
      const f = classificar(p.notaEfetiva, faixas);
      return html`<div><div class="barra-pergunta ${f ? `faixa--${f.id}` : ''}"><p class="texto">${p.enunciado}${p.invertida ? html` <span class="badge">escala invertida</span>` : ''}</p>
        <div class="trilho"><div class="preenchido" style="--nota:${p.notaEfetiva ?? 0}"></div></div>
        <span class="valor num">${p.notaEfetiva === null ? '—' : p.invertida ? `${formatarNota(p.notaEfetiva)}*` : p.notaEfetiva}</span></div>
        ${p.invertida && p.nota !== null ? html`<p class="muted" style="font-size:.8125rem">*Respondida com ${p.nota}; nota efetiva ${p.notaEfetiva}.</p>` : ''}
        ${p.comentario ? html`<p class="aviso aviso--info" style="margin-top:.5rem">${icone('info')}<span><b>Comentário:</b> ${p.comentario}</span></p>` : ''}</div>`;
    })}</div></details>`;
}

function exportar(av, ind, faixas) {
  const base = nomeDeArquivo(`${av.empresas.nome_fantasia ?? av.empresas.razao_social}-${av.titulo}`);
  return {
    respostas() {
      const linhas = [['Empresa', 'Avaliação', 'Grupo', 'Pergunta', 'Peso', 'Escala invertida', 'Nota respondida', 'Nota efetiva', 'Peso efetivo (%)', 'Ganho potencial', 'Comentário']];
      ind.grupos.forEach((g) => g.perguntas.forEach((p) => linhas.push([av.empresas.nome_fantasia ?? av.empresas.razao_social, av.titulo, g.nome, p.enunciado, p.peso, p.invertida ? 'Sim' : 'Não', p.nota, p.notaEfetiva, Number((p.pesoEfetivo * 100).toFixed(2)), Number(p.ganhoPotencial.toFixed(3)), p.comentario])));
      baixarCsv(`${base}-respostas.csv`, linhas);
    },
    indicadores() {
      const linhas = [['Grupo', 'Peso relativo (%)', 'Nota', 'Faixa', 'Meta', 'Dispersão']];
      ind.grupos.forEach((g) => linhas.push([g.nome, Number((g.pesoRelativo * 100).toFixed(2)), g.nota === null ? null : Number(g.nota.toFixed(2)), classificar(g.nota, faixas)?.rotulo ?? '', g.meta, Number(g.dispersao.toFixed(2))]));
      linhas.push(['Nota geral', 100, ind.geral === null ? null : Number(ind.geral.toFixed(2)), classificar(ind.geral, faixas)?.rotulo ?? '', null, null]);
      baixarCsv(`${base}-indicadores.csv`, linhas);
    },
  };
}

/** Carrega tudo o que os indicadores precisam (respostas, faixas, avaliação anterior e média do modelo). */
export async function carregarIndicadores(av) {
  const config = dados(await supabase.from('configuracoes').select('faixas').eq('id', true).single());
  const faixas = lerFaixas(config.faixas);
  const [ind, anterior, media] = await Promise.all([indicadoresDe(av), carregarAnterior(av).catch(() => null), carregarMedia(av).catch(() => null)]);
  const insights = gerarInsights(ind, { anterior: anterior?.indicadores ?? null });
  return { ind, anterior, media, faixas, insights };
}

export async function montarIndicadores(raiz, av) {
  raiz.innerHTML = String(html`<div class="carregando" aria-busy="true"><div class="skeleton sk-bloco"></div></div>`);
  let ind, anterior, media, faixas, insights;
  try {
    ({ ind, anterior, media, faixas, insights } = await carregarIndicadores(av));
  } catch {
    raiz.innerHTML = String(html`<p class="erro-geral" role="alert">Não foi possível calcular os indicadores. Atualize a página e tente de novo.</p>`);
    return;
  }

  const geral = ind.geral;
  const faixaGeral = classificar(geral, faixas);
  const escolhas = { anterior: Boolean(anterior), meta: ind.grupos.some((g) => g.meta !== null), media: Boolean(media) };
  const rotulos = ind.grupos.map((g) => g.nomeCurto);
  const nomes = Object.fromEntries(ind.grupos.map((g) => [g.id, g.nome]));

  function desenharRadar() {
    const series = [{ nome: 'Atual', tipo: 'atual', valores: ind.grupos.map((g) => (g.nota === null ? null : arred(g.nota))) }];
    if (escolhas.anterior && anterior) series.push({ nome: 'Avaliação anterior', tipo: 'anterior', valores: ind.grupos.map((g) => { const a = insights.variacao?.grupos.find((v) => v.id === g.id); return a ? arred(a.anterior) : null; }) });
    if (escolhas.meta) series.push({ nome: 'Meta', tipo: 'meta', valores: ind.grupos.map((g) => g.meta) });
    if (escolhas.media && media) series.push({ nome: 'Média das empresas', tipo: 'media', valores: ind.grupos.map((g) => (g.grupoOrigemId && media.has(g.grupoOrigemId) ? arred(media.get(g.grupoOrigemId)) : null)) });
    raiz.querySelector('#area-radar').innerHTML = String(radar(rotulos, series));
  }
  const arred = (v) => Math.round(v * 10) / 10;

  raiz.innerHTML = String(html`<div class="pilha pilha--lg">
    <section class="grade-2" style="gap:2rem" aria-labelledby="h-ind">
      <div class="pilha"><h2 id="h-ind">Indicadores</h2>
        <div class="nota-destaque"><span class="valor num">${geral === null ? '—' : formatarNota(geral)}</span><span class="de">de 10</span></div>
        <p class="linha">${faixaGeral ? html`<span class="faixa faixa--${faixaGeral.id} faixa-fundo">${icone(FAIXA_ICONE[faixaGeral.id], 'icone--sm')}${faixaGeral.rotulo}</span>` : ''}
          ${insights.variacao ? html`<span class="variacao ${insights.variacao.geral >= 0 ? 'variacao--sobe' : 'variacao--desce'}">${icone(insights.variacao.geral >= 0 ? 'sobe' : 'desce', 'icone--sm')} ${sinal(insights.variacao.geral)} desde a avaliação anterior</span>` : ''}</p>
        <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Grupo</th><th class="dir">Nota</th><th>Faixa</th><th class="dir">Meta</th><th class="dir">Var.</th></tr></thead>
          <tbody>${ind.grupos.map((g) => {
            const v = insights.variacao?.grupos.find((x) => x.id === g.id);
            return html`<tr><td>${g.nome}</td><td class="dir num" data-rotulo="Nota">${g.nota === null ? '—' : formatarNota(g.nota)}</td><td data-rotulo="Faixa">${linhaFaixa(classificar(g.nota, faixas))}</td><td class="dir num" data-rotulo="Meta">${g.meta === null ? '—' : formatarNota(g.meta)}</td><td class="dir num" data-rotulo="Variação">${v ? sinal(v.variacao) : '—'}</td></tr>`;
          })}</tbody></table></div>
      </div>
      <div><div id="area-radar"></div>
        <div class="chips" style="justify-content:center;margin-top:.5rem" role="group" aria-label="Séries do radar">
          <button class="chip" data-serie="anterior" aria-pressed="${String(escolhas.anterior)}" ${anterior ? '' : html`disabled title="Sem avaliação anterior do mesmo modelo"`}>Anterior</button>
          <button class="chip" data-serie="meta" aria-pressed="${String(escolhas.meta)}" ${escolhas.meta ? '' : html`disabled title="Nenhum grupo tem meta"`}>Meta</button>
          <button class="chip" data-serie="media" aria-pressed="${String(escolhas.media)}" ${media ? '' : html`disabled title="A média só aparece com pelo menos ${MINIMO_PARA_MEDIA} outras avaliações do mesmo modelo"`}>${media ? 'Média das empresas' : `Média (mín. ${MINIMO_PARA_MEDIA} avaliações)`}</button>
        </div></div>
    </section>

    <section class="pilha" aria-labelledby="h-ins"><h2 id="h-ins">Insights automáticos</h2>
      <div class="duas-col">
        <div class="pilha pilha--sm"><h3>Maiores notas</h3><ul class="pilha pilha--sm">${insights.maioresGrupos.map((g) => html`<li>${g.nome} <b class="num">${formatarNota(g.nota)}</b></li>`)}</ul></div>
        <div class="pilha pilha--sm"><h3>Menores notas</h3><ul class="pilha pilha--sm">${insights.menoresGrupos.map((g) => html`<li>${g.nome} <b class="num">${formatarNota(g.nota)}</b></li>`)}</ul></div>
      </div>
      <ul class="pilha pilha--sm">
        ${insights.dispersaoAlta.map((d) => html`<li class="item-icone">${icone('aviso', 'icone--sm')}${d.nome} tem desempenho desigual: há pergunta com ${formatarNota(d.minimo)} e outra com ${formatarNota(d.maximo)}.</li>`)}
        ${insights.distanciaMeta.filter((d) => d.distancia > 0).sort((a, b) => b.distancia - a.distancia).slice(0, 3).map((d) => html`<li class="item-icone">${icone('info', 'icone--sm')}${d.nome} está ${formatarNota(d.distancia)} abaixo da meta (${formatarNota(d.nota)} de ${formatarNota(d.meta)}).</li>`)}
        ${insights.variacao?.grupos.filter((g) => Math.abs(g.variacao) >= 0.5).map((g) => html`<li class="item-icone">${icone(g.variacao > 0 ? 'sobe' : 'desce', 'icone--sm')}${g.nome} ${g.variacao > 0 ? 'subiu' : 'caiu'} ${formatarNota(Math.abs(g.variacao))} ponto${Math.abs(g.variacao) >= 1.5 ? 's' : ''} desde a avaliação anterior.</li>`) ?? ''}
      </ul>
      ${insights.prioridades.length ? html`<div class="pilha pilha--sm"><h3>Onde melhorar primeiro (maior ganho na nota geral)</h3>
        <ol class="pilha pilha--sm" style="list-style:decimal;padding-left:1.25rem">${insights.prioridades.map((p) => html`<li>${p.enunciado} <span class="muted">(${nomes[ind.grupos.find((g) => g.perguntas.some((x) => x.id === p.id))?.id]} · nota ${formatarNota(p.notaEfetiva)} · até +${formatarNota(p.ganhoPotencial)} na nota geral)</span></li>`)}</ol></div>` : ''}
    </section>

    <section aria-labelledby="h-resp"><div class="linha linha--entre" style="margin-bottom:.75rem"><h2 id="h-resp">Respostas por grupo</h2>
      <div class="linha"><button class="btn btn--sec btn--sm" id="csv-respostas">${icone('baixar', 'icone--sm')}Respostas (CSV)</button><button class="btn btn--sec btn--sm" id="csv-indicadores">${icone('baixar', 'icone--sm')}Indicadores (CSV)</button></div></div>
      ${ind.grupos.map((g) => tabelaDeRespostas(g, faixas))}
      <p class="muted" style="margin-top:.75rem;font-size:.875rem">Respondida em ${av.respondido_em ? formatarData(av.respondido_em) : '—'}. Notas por grupo e nota geral são médias ponderadas pelos pesos do questionário.</p>
    </section>
  </div>`);

  desenharRadar();
  raiz.querySelector('.chips')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-serie]');
    if (!b || b.disabled) return;
    escolhas[b.dataset.serie] = !escolhas[b.dataset.serie];
    b.setAttribute('aria-pressed', String(escolhas[b.dataset.serie]));
    desenharRadar();
  });
  const csv = exportar(av, ind, faixas);
  raiz.querySelector('#csv-respostas').addEventListener('click', () => (csv.respostas(), toast('Arquivo gerado.')));
  raiz.querySelector('#csv-indicadores').addEventListener('click', () => (csv.indicadores(), toast('Arquivo gerado.')));
}
