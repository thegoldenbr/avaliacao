/** Formulário de edição do relatório: cada campo leva data-path="secao.indice.campo" e o editor aplica no objeto. */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { SECOES } from '../lib/snapshot.js';

export const ROTULO_SECAO = {
  pontos_fortes: 'Pontos fortes',
  pontos_de_atencao: 'Pontos de atenção',
  analise_por_grupo: 'Análise por tema',
  recomendacoes: 'Recomendações',
  o_que_evitar: 'O que evitar',
  proximos_passos: 'Próximos passos',
  consideracoes_finais: 'Considerações finais',
};

/** Aplica um valor em obj seguindo "lista.2.titulo". */
export function definirCaminho(obj, caminho, valor) {
  const partes = caminho.split('.');
  let alvo = obj;
  for (let i = 0; i < partes.length - 1; i++) alvo = alvo[partes[i]];
  alvo[partes[partes.length - 1]] = valor;
}

const area = (path, valor, rotulo, linhas = 4) => html`<label class="campo"><span style="font-weight:500">${rotulo}</span><textarea class="textarea" data-path="${path}" data-md rows="${linhas}">${valor ?? ''}</textarea></label>`;
const linha = (path, valor, rotulo) => html`<label class="campo"><span style="font-weight:500">${rotulo}</span><input class="input" data-path="${path}" value="${valor ?? ''}"></label>`;
const seletor = (path, valor, rotulo, opcoes) => html`<label class="campo"><span style="font-weight:500">${rotulo}</span><select class="select" data-path="${path}">${opcoes.map(([v, r]) => html`<option value="${v}" ${v === valor ? html`selected` : ''}>${r}</option>`)}</select></label>`;

function botoesDoItem(lista, i, total) {
  return html`<span class="pilha pilha--sm">
    <button type="button" class="btn btn--ghost btn--icone" data-lista="${lista}" data-acao="subir" data-i="${i}" aria-label="Subir item ${i + 1}" ${i === 0 ? html`disabled` : ''}>${icone('sobe')}</button>
    <button type="button" class="btn btn--ghost btn--icone" data-lista="${lista}" data-acao="descer" data-i="${i}" aria-label="Descer item ${i + 1}" ${i === total - 1 ? html`disabled` : ''}>${icone('desce')}</button>
    <button type="button" class="btn btn--ghost btn--icone" data-lista="${lista}" data-acao="remover" data-i="${i}" aria-label="Remover item ${i + 1}">${icone('lixo')}</button></span>`;
}

function listaEditavel(chave, itens, corpo) {
  return html`<div>${itens.map((it, i) => html`<div class="item-editavel" style="grid-template-columns:1fr auto"><div class="pilha pilha--sm">${corpo(it, i)}</div>${botoesDoItem(chave, i, itens.length)}</div>`)}
    <button type="button" class="btn btn--ghost btn--sm" data-lista="${chave}" data-acao="adicionar">${icone('plus', 'icone--sm')}Adicionar item</button></div>`;
}

function secao(chave, corpo, ajuda) {
  return html`<section class="pilha" aria-labelledby="s-${chave}"><h2 id="s-${chave}">${ROTULO_SECAO[chave]}</h2>${ajuda ? html`<p class="muted">${ajuda}</p>` : ''}${corpo}</section>`;
}

/** Item novo de cada lista. */
export const ITEM_NOVO = {
  pontos_fortes: (g) => ({ titulo: '', descricao: '', grupo: g }),
  pontos_de_atencao: (g) => ({ titulo: '', descricao: '', grupo: g }),
  recomendacoes: (g) => ({ titulo: '', descricao: '', prioridade: 'media', horizonte: 'medio', grupo: g, impacto_esperado: '' }),
  o_que_evitar: () => ({ titulo: '', descricao: '' }),
  proximos_passos: () => '',
};

export function formularioDoRelatorio(c, grupos, opcoes) {
  const selGrupo = (path, valor) => seletor(path, valor, 'Tema relacionado', [['', '—'], ...grupos.map((g) => [g.id, g.nome])]);
  const itemDestaque = (chave) => (it, i) => html`${linha(`${chave}.${i}.titulo`, it.titulo, 'Título')}${area(`${chave}.${i}.descricao`, it.descricao, 'Descrição', 3)}${selGrupo(`${chave}.${i}.grupo`, it.grupo)}`;
  return html`<div class="pilha pilha--lg">
    <section class="pilha" aria-labelledby="s-resumo"><h2 id="s-resumo">Resumo executivo</h2>${area('resumo_executivo', c.resumo_executivo, 'Até 120 palavras', 6)}<p class="ajuda muted" id="contagem-resumo"></p></section>
    ${secao('pontos_fortes', listaEditavel('pontos_fortes', c.pontos_fortes, itemDestaque('pontos_fortes')))}
    ${secao('pontos_de_atencao', listaEditavel('pontos_de_atencao', c.pontos_de_atencao, itemDestaque('pontos_de_atencao')))}
    ${secao('analise_por_grupo', html`<div class="pilha">${c.analise_por_grupo.map((a, i) => area(`analise_por_grupo.${i}.texto`, a.texto, grupos.find((g) => g.id === a.grupo)?.nome ?? 'Tema', 4))}</div>`)}
    ${secao('recomendacoes', listaEditavel('recomendacoes', c.recomendacoes, (it, i) => html`${linha(`recomendacoes.${i}.titulo`, it.titulo, 'Título')}${area(`recomendacoes.${i}.descricao`, it.descricao, 'O que fazer', 3)}
      <div class="form-grade">${seletor(`recomendacoes.${i}.prioridade`, it.prioridade, 'Prioridade', [['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']])}${seletor(`recomendacoes.${i}.horizonte`, it.horizonte, 'Horizonte', [['curto', 'Curto prazo'], ['medio', 'Médio prazo'], ['longo', 'Longo prazo']])}</div>
      ${selGrupo(`recomendacoes.${i}.grupo`, it.grupo)}${linha(`recomendacoes.${i}.impacto_esperado`, it.impacto_esperado, 'Impacto esperado')}`))}
    ${secao('o_que_evitar', listaEditavel('o_que_evitar', c.o_que_evitar, (it, i) => html`${linha(`o_que_evitar.${i}.titulo`, it.titulo, 'Título')}${area(`o_que_evitar.${i}.descricao`, it.descricao, 'Descrição', 3)}`))}
    ${secao('proximos_passos', listaEditavel('proximos_passos', c.proximos_passos, (it, i) => linha(`proximos_passos.${i}`, it, `Passo ${i + 1}`)))}
    ${secao('consideracoes_finais', area('consideracoes_finais', c.consideracoes_finais, 'Fechamento do relatório', 4))}

    <section class="pilha" aria-labelledby="s-opcoes"><h2 id="s-opcoes">Opções de exibição</h2>
      <label class="interruptor"><span>Comparar com a avaliação anterior</span><input type="checkbox" data-opcao="mostrarAnterior" ${opcoes.mostrarAnterior ? html`checked` : ''}></label>
      <label class="interruptor"><span>Mostrar a meta no radar</span><input type="checkbox" data-opcao="mostrarMeta" ${opcoes.mostrarMeta ? html`checked` : ''}></label>
      <label class="interruptor"><span>Comparar com a média das empresas <span class="muted">(só com 5 ou mais avaliações)</span></span><input type="checkbox" data-opcao="mostrarMedia" ${opcoes.mostrarMedia ? html`checked` : ''}></label>
      <p class="muted">Ocultar seções no relatório do cliente:</p>
      ${SECOES.map((s) => html`<label class="interruptor"><span>${ROTULO_SECAO[s]}</span><input type="checkbox" data-ocultar="${s}" ${opcoes.ocultar[s] ? html`checked` : ''}></label>`)}
    </section>
  </div>`;
}
