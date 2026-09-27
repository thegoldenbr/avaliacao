/** Telas do formulário público: só montam HTML a partir do estado; a lógica fica em responder.js. */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { campo } from '../forms.js';
import { escalaNota } from '../escala-nota.js';
import { formatarData, formatarDataHora } from '../lib/formatacao.js';
import { minutosEstimados } from '../lib/avaliacao.js';

export const perguntasDe = (grupo) => grupo.perguntas;
export const todasAsPerguntas = (form) => form.grupos.flatMap((g) => g.perguntas);

export function cabecalho(form, indicador = '') {
  const m = form.marca;
  const logo = m.logo_url
    ? html`<img src="${m.logo_url}" alt="" class="marca-logo" style="object-fit:contain;background:none">`
    : html`<span class="marca-logo" aria-hidden="true">${m.nome.charAt(0).toUpperCase()}</span>`;
  return html`<header class="publico-topo"><div><span class="marca">${logo}<span>${m.nome}</span></span><span class="badge" id="indicador" role="status">${indicador}</span></div></header>`;
}

export function moldura(form, corpo, barra = '') {
  return html`<div class="publico">${cabecalho(form)}<main class="publico-corpo pilha pilha--lg" id="corpo" tabindex="-1">${corpo}</main>${barra}</div>`;
}

export const telaAviso = (form, { icon, cor, titulo, textos }) =>
  moldura(form, html`<div class="pilha"><span class="faixa ${cor}">${icone(icon, 'icone--lg')}</span><h1>${titulo}</h1>${textos.map((t) => html`<p class="leitura">${t}</p>`)}</div>`);

export function telaBoasVindas(form, respondente, erros = {}) {
  const total = todasAsPerguntas(form).length;
  return moldura(
    form,
    html`<div class="pilha pilha--sm"><p class="muted">Avaliação de</p><h1>${form.empresa}</h1><p class="muted">${form.titulo}${form.periodo_referencia ? ` · ${form.periodo_referencia}` : ''}</p></div>
      <p class="leitura" style="white-space:pre-line">${form.mensagem}</p>
      <ul class="pilha pilha--sm">
        <li class="item-icone">${icone('clip')}${total} perguntas, em ${form.grupos.length} ${form.grupos.length === 1 ? 'parte' : 'partes'}. Cada uma vale uma nota de 0 a 10. Leva cerca de ${minutosEstimados(total)} minutos.</li>
        <li class="item-icone">${icone('relogio')}${form.prazo ? `Prazo até ${formatarData(form.prazo)}. ` : ''}Você pode parar e continuar depois pelo mesmo link.</li>
        <li class="item-icone">${icone('cadeado')}Suas respostas ficam salvas automaticamente.</li>
      </ul>
      <form class="pilha" id="form-identificacao" novalidate><h2>Quem está respondendo?</h2>
        ${campo({ id: 'nome', rotulo: 'Seu nome', controle: html`<input class="input" id="nome" autocomplete="name" maxlength="120" value="${respondente.nome ?? ''}">` })}
        ${campo({ id: 'cargo', rotulo: 'Seu cargo', controle: html`<input class="input" id="cargo" autocomplete="organization-title" maxlength="120" value="${respondente.cargo ?? ''}">` })}
        ${campo({ id: 'email', rotulo: html`E-mail <span class="muted">(opcional)</span>`, controle: html`<input class="input" id="email" type="email" inputmode="email" autocomplete="email" maxlength="200" value="${respondente.email ?? ''}">` })}
      </form>
      <p class="muted leitura"><b>Privacidade.</b> ${form.textos.privacidade}</p>`,
    html`<div class="barra-fixa"><div><button class="btn" id="btn-comecar">Começar</button></div></div>`,
  );
}

export function telaEtapa(form, etapa, resp) {
  const g = form.grupos[etapa];
  const todas = todasAsPerguntas(form);
  const feitas = todas.filter((p) => resp[p.id]?.nota != null).length;
  const ultimo = etapa === form.grupos.length - 1;
  return moldura(
    form,
    html`<div class="pilha pilha--sm"><div class="etapa-topo"><span>Parte ${etapa + 1} de ${form.grupos.length} · ${g.nome}</span><span class="num" id="contador">${feitas} de ${todas.length}</span></div>
      <div class="barra-progresso" role="progressbar" aria-label="Progresso" aria-valuemin="0" aria-valuemax="${todas.length}" aria-valuenow="${feitas}" id="progresso"><span style="width:${(feitas / todas.length) * 100}%"></span></div></div>
      ${g.descricao ? html`<p class="muted leitura">${g.descricao}</p>` : ''}
      <div class="pilha pilha--lg">${g.perguntas.map((p, i) => html`<fieldset class="pilha" data-pergunta-bloco="${p.id}">
        <legend style="font-size:1.1875rem;font-weight:600;line-height:1.35" class="leitura">${i + 1}. ${p.enunciado}</legend>
        ${p.texto_apoio ? html`<p class="muted">${p.texto_apoio}</p>` : ''}
        ${escalaNota({ nome: p.enunciado, valor: resp[p.id]?.nota ?? null, pergunta: p.id, rotuloMin: p.rotulo_min, rotuloMax: p.rotulo_max })}
        ${p.permite_comentario ? campo({ id: `c-${p.id}`, rotulo: html`Quer comentar? <span class="muted">(opcional)</span>`, controle: html`<textarea class="textarea" id="c-${p.id}" data-comentario="${p.id}" maxlength="2000">${resp[p.id]?.comentario ?? ''}</textarea>` }) : ''}
      </fieldset>`)}</div>`,
    html`<div class="barra-fixa"><div><button class="btn btn--sec" data-nav="-1">${icone('esq')}Anterior</button><button class="btn" data-nav="1">${ultimo ? 'Revisar' : 'Próxima'}${icone('dir')}</button></div></div>`,
  );
}

export function telaRevisao(form, resp, aviso = '') {
  const faltam = todasAsPerguntas(form).filter((p) => resp[p.id]?.nota == null).length;
  return moldura(
    form,
    html`<div class="pilha pilha--sm"><h1>Revisar antes de enviar</h1><p class="muted">Depois do envio, as respostas não podem ser alteradas.</p></div>
      ${faltam ? html`<p class="aviso aviso--atencao" role="alert">${icone('aviso')}<span><b>Faltam ${faltam} ${faltam === 1 ? 'pergunta' : 'perguntas'}.</b> Responda todas para poder enviar.</span></p>` : ''}
      ${aviso ? html`<p class="erro-geral" role="alert">${aviso}</p>` : ''}
      <ul class="lista-sep">${form.grupos.map((g, i) => {
        const f = g.perguntas.filter((p) => resp[p.id]?.nota == null).length;
        return html`<li class="linha linha--entre"><div><b>${i + 1}. ${g.nome}</b><p class="muted">${g.perguntas.length - f} de ${g.perguntas.length} respondidas</p></div>
          ${f ? html`<button class="btn btn--sec btn--sm" data-ir="${i}">Responder ${f}</button>` : html`<span class="badge badge--ok">${icone('check', 'icone--sm')}Completa</span>`}</li>`;
      })}</ul>`,
    html`<div class="barra-fixa"><div><button class="btn btn--sec" data-nav="-1">${icone('esq')}Voltar</button><button class="btn" id="btn-enviar" ${faltam ? html`aria-disabled="true"` : ''}>Enviar respostas</button></div></div>`,
  );
}

export function telaAgradecimento(form, quando) {
  return telaAviso(form, {
    icon: 'ok',
    cor: 'faixa--excelente',
    titulo: 'Respostas enviadas',
    textos: [`Obrigado! ${form.marca.nome} vai analisar as respostas de ${form.empresa} e entrará em contato com o resultado.`, `Respostas enviadas em ${formatarDataHora(quando)}. Se abrir este link outra vez, verá as respostas somente para leitura.`],
  });
}

export function telaSomenteLeitura(form, resp) {
  return moldura(
    form,
    html`<div class="pilha pilha--sm"><span class="faixa faixa--excelente">${icone('ok', 'icone--lg')}</span><h1>Respostas enviadas</h1>
      <p class="muted">Respostas enviadas em ${form.respondido_em ? formatarDataHora(form.respondido_em) : 'data não registrada'}${form.respondente?.nome ? ` por ${form.respondente.nome}` : ''}. Somente leitura.</p></div>
      ${form.grupos.map((g, i) => html`<section class="pilha pilha--sm"><h2>${i + 1}. ${g.nome}</h2><ul class="lista-sep">${g.perguntas.map((p) => html`<li class="linha linha--entre"><span class="leitura">${p.enunciado}</span><b class="num">${resp[p.id]?.nota ?? '—'}</b></li>`)}</ul></section>`)}`,
  );
}
