/** Detalhe da avaliação: linha do tempo, ajustes (rascunho), compartilhamento e ações de ciclo de vida. */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { iniciarPagina } from '../shell.js';
import { supabase } from '../supabase.js';
import { campo, mostrarErros, vazioParaNulo } from '../forms.js';
import { abrirDialogo, confirmar, toast } from '../ui.js';
import { formatarData, formatarDataHora } from '../lib/formatacao.js';
import { ROTULO_STATUS, TOM_STATUS } from '../lib/status.js';
import { mensagemDeErro } from '../lib/erros.js';
import { acoesPermitidas, fimDoDia, paraCampoData, prazoEncerrado, tituloDaNovaRodada, validarEnvio } from '../lib/avaliacao.js';
import { ligarCopiar, painelCompartilhar } from './_avaliacao-compartilhar.js';
import { montarAjustes, totalDePerguntas } from './_avaliacao-perguntas.js';
import { montarIndicadores, statusTemIndicadores } from './_avaliacao-indicadores.js';
import { montarAcessoCliente } from './_acesso-cliente.js';

const { main } = await iniciarPagina({ ativo: 'avaliacoes' });
const id = new URLSearchParams(location.search).get('id');
const ETAPAS = ['rascunho', 'aguardando_resposta', 'respondida', 'em_analise', 'publicada'];

let av = null;
let respondidas = 0;

async function carregar() {
  const { data, error } = await supabase.from('avaliacoes').select('*, empresas(*), avaliacao_grupos(*, avaliacao_perguntas(*))').eq('id', id ?? '').maybeSingle();
  if (error || !data) return false;
  av = data;
  const { count } = await supabase.from('respostas').select('id', { count: 'exact', head: true }).eq('avaliacao_id', id);
  respondidas = count ?? 0;
  return true;
}

async function atualizar(patch, mensagemErro = 'Não foi possível salvar a alteração.') {
  const { data, error } = await supabase.from('avaliacoes').update(patch).eq('id', av.id).select('*').single();
  if (error) {
    toast(mensagemDeErro(error, mensagemErro), 'erro');
    return false;
  }
  Object.assign(av, data);
  return true;
}

function linhaDoTempo() {
  const datas = { rascunho: av.criado_em, aguardando_resposta: av.enviado_em, respondida: av.respondido_em, publicada: av.publicado_em };
  const atual = ETAPAS.indexOf(av.status);
  return html`<ol class="tempo" aria-label="Status da avaliação">${ETAPAS.map((s, i) => html`<li class="${i < atual ? 'feito' : ''}" ${i === atual ? html`aria-current="step"` : ''}><span class="pt"></span>${ROTULO_STATUS[s]}${datas[s] && i <= atual ? html` <span class="muted">(${formatarData(datas[s])})</span>` : ''}</li>`)}</ol>`;
}

function painelSetup() {
  const e = av.empresas;
  return html`<form class="pilha pilha--lg" id="form-setup" novalidate>
    <h2>Prazo e mensagem</h2>
    <div class="form-grade">
      ${campo({ id: 'titulo', rotulo: 'Título da avaliação', controle: html`<input class="input" id="titulo" maxlength="160" value="${av.titulo}">` })}
      ${campo({ id: 'periodo_referencia', rotulo: 'Período de referência', controle: html`<input class="input" id="periodo_referencia" maxlength="80" placeholder="Ex.: Jul a dez de 2026" value="${av.periodo_referencia ?? ''}">` })}
      ${campo({ id: 'prazo', rotulo: 'Prazo para responder', ajuda: 'Encerra às 23h59 do dia escolhido (horário do seu navegador).', controle: html`<input class="input" id="prazo" type="date" value="${paraCampoData(av.prazo)}">` })}
      ${campo({ id: 'respondente_nome', rotulo: 'Quem vai responder', ajuda: 'Opcional. O respondente também se identifica no formulário.', controle: html`<input class="input" id="respondente_nome" maxlength="120" value="${av.respondente_nome ?? e.responsavel_nome ?? ''}">` })}
      ${campo({ id: 'mensagem_apresentacao', rotulo: 'Mensagem de apresentação', classe: 'cheio', ajuda: 'Vazio usa o texto padrão das configurações.', controle: html`<textarea class="textarea" id="mensagem_apresentacao" maxlength="1000">${av.mensagem_apresentacao ?? ''}</textarea>` })}
    </div>
    <p class="erro" id="perguntas-erro" role="alert" hidden></p>
    <div class="linha"><button class="btn btn--sec" type="button" id="salvar-rascunho">Salvar rascunho</button><button class="btn" type="submit">Gerar link e enviar</button></div>
  </form>`;
}

function painelAcoes() {
  const p = acoesPermitidas(av.status);
  const botoes = [
    p.estenderPrazo && ['estender', 'relogio', 'Estender prazo'],
    p.reabrir && ['reabrir', 'editar', 'Reabrir para nova resposta'],
    p.novaRodada && av.questionario_origem_id && ['rodada', 'plus', 'Nova rodada'],
    p.regenerarLink && ['regenerar', 'copia', 'Gerar novo link'],
  ].filter(Boolean);
  return botoes.length ? html`<div class="linha">${botoes.map(([a, ic, r]) => html`<button class="btn btn--sec" data-acao="${a}">${icone(ic, 'icone--sm')}${r}</button>`)}</div>` : '';
}

function desenhar() {
  const e = av.empresas;
  const nome = e.nome_fantasia ?? e.razao_social;
  const total = totalDePerguntas(av);
  const encerrada = av.status === 'aguardando_resposta' && prazoEncerrado(av.prazo);
  main.innerHTML = String(html`<section class="pilha pilha--lg">
    <header class="pilha">
      <p class="migalha"><a href="avaliacoes.html">Avaliações</a> ${icone('dir', 'icone--sm')} ${nome}</p>
      <div class="pagina-topo" style="margin-bottom:0"><div><h1>${nome}</h1><p class="muted">${av.titulo}${av.periodo_referencia ? ` · ${av.periodo_referencia}` : ''}</p></div>
        <span class="badge ${TOM_STATUS[av.status] ?? ''}">${ROTULO_STATUS[av.status]}</span></div>
      ${linhaDoTempo()}
    </header>
    ${statusTemIndicadores(av.status) ? html`<div id="acesso-cliente"></div>` : ''}
    ${av.status === 'rascunho'
      ? html`<ol class="passos" aria-label="Etapas"><li class="feito"><b>${icone('check', 'icone--sm')}</b>Empresa</li><li class="feito"><b>${icone('check', 'icone--sm')}</b>Questionário</li><li aria-current="step"><b>3</b>Perguntas</li><li><b>4</b>Prazo e mensagem</li><li><b>5</b>Link</li></ol>
        <section class="pilha" aria-labelledby="h-perg"><h2 id="h-perg">Perguntas desta avaliação</h2><div id="ajustes"></div></section>${painelSetup()}`
      : ''}
    ${av.status === 'aguardando_resposta'
      ? html`${encerrada ? html`<p class="aviso aviso--atencao" role="status">${icone('aviso')}<span>O prazo terminou em ${formatarData(av.prazo)}. O link não aceita mais respostas; estenda o prazo para reabrir.</span></p>` : ''}
        <div class="pilha pilha--sm leitura"><h2>Acompanhamento</h2>
          <div class="linha linha--entre"><span>${respondidas} de ${total} perguntas respondidas (rascunho do respondente)</span><span class="num muted">${total ? Math.round((respondidas / total) * 100) : 0}%</span></div>
          <div class="barra-progresso" role="progressbar" aria-label="Progresso do respondente" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${respondidas}"><span style="width:${total ? (respondidas / total) * 100 : 0}%"></span></div>
          <p class="muted">${av.prazo ? `Prazo até ${formatarData(av.prazo)}.` : 'Sem prazo definido.'}${av.respondente_nome ? ` Respondente: ${av.respondente_nome}.` : ''}</p></div>
        <div id="compartilhar">${painelCompartilhar(av, e)}</div>`
      : ''}
    ${['respondida', 'em_analise', 'publicada'].includes(av.status)
      ? html`<div class="pilha pilha--sm leitura"><h2>Respostas</h2><p>${total} perguntas respondidas${av.respondido_em ? ` em ${formatarDataHora(av.respondido_em)}` : ''}${av.respondente_nome ? ` por ${av.respondente_nome}${av.respondente_cargo ? `, ${av.respondente_cargo}` : ''}` : ''}.</p>
        <div class="linha">
          <a class="btn" href="relatorio-editor.html?id=${av.id}">${icone('ia', 'icone--sm')}${av.status === 'publicada' ? 'Editar relatório publicado' : 'Análise e relatório'}</a>
          <a class="btn btn--sec" href="previa-cliente.html?id=${av.id}">${icone('olho', 'icone--sm')}Ver como o cliente</a>
          <a class="btn btn--sec" href="apresentacao.html?id=${av.id}">${icone('monitor', 'icone--sm')}Modo de apresentação</a></div>
        </div><div id="indicadores"></div>`
      : ''}
    ${painelAcoes()}
  </section>`);
  if (av.status === 'rascunho') montarAjustes(document.getElementById('ajustes'), av, () => document.getElementById('perguntas-erro') && (document.getElementById('perguntas-erro').hidden = true));
  if (av.status === 'aguardando_resposta') ligarCopiar(main);
  if (statusTemIndicadores(av.status)) {
    montarAcessoCliente(document.getElementById('acesso-cliente'), av, av.empresas);
    void montarIndicadores(document.getElementById('indicadores'), av);
  }
}

function dialogoData({ titulo, rotulo, inicial, rotuloConfirmar }) {
  return new Promise((resolve) => {
    let valor = null;
    const { el, fechar } = abrirDialogo({
      titulo,
      aoFechar: () => resolve(valor),
      corpo: html`<form class="pilha" novalidate>${campo({ id: 'nova-data', rotulo, controle: html`<input class="input" id="nova-data" type="date" value="${inicial}">` })}
        <div class="dialogo-acoes"><button type="button" class="btn btn--sec" data-fechar>Cancelar</button><button type="submit" class="btn">${rotuloConfirmar}</button></div></form>`,
    });
    el.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const d = fimDoDia(el.querySelector('#nova-data').value);
      const erro = !d ? 'Escolha uma data válida.' : prazoEncerrado(d) ? 'A data precisa ser hoje ou futura.' : '';
      mostrarErros(el, erro ? { 'nova-data': erro } : {}, ['nova-data']);
      if (erro) return;
      valor = d;
      fechar();
    });
  });
}

async function acao(nome) {
  if (nome === 'estender') {
    const d = await dialogoData({ titulo: 'Estender prazo', rotulo: 'Novo prazo', inicial: paraCampoData(av.prazo), rotuloConfirmar: 'Salvar prazo' });
    if (d && (await atualizar({ prazo: d.toISOString() }))) {
      toast('Prazo atualizado.');
      desenhar();
    }
  }
  if (nome === 'reabrir') {
    const d = await dialogoData({ titulo: 'Reabrir para nova resposta', rotulo: 'Novo prazo', inicial: '', rotuloConfirmar: 'Reabrir' });
    if (d && (await atualizar({ status: 'aguardando_resposta', prazo: d.toISOString(), respondido_em: null, publicado_em: null }))) {
      toast('Avaliação reaberta. O respondente pode ajustar as respostas pelo mesmo link.');
      desenhar();
    }
  }
  if (nome === 'regenerar') {
    const sim = await confirmar({ titulo: 'Gerar novo link', descricao: 'O link atual deixa de funcionar. Quem o tiver não conseguirá abrir; você precisará enviar o novo link.', rotuloConfirmar: 'Gerar novo link' });
    if (!sim) return;
    const { data, error } = await supabase.rpc('regenerar_token', { p_avaliacao_id: av.id, p_qual: 'resposta' });
    if (error) return toast(mensagemDeErro(error, 'Não foi possível gerar o novo link.'), 'erro');
    av.token_resposta = data;
    toast('Novo link gerado.');
    desenhar();
  }
  if (nome === 'rodada') {
    const { data, error } = await supabase.rpc('criar_avaliacao', {
      p_empresa_id: av.empresa_id, p_questionario_id: av.questionario_origem_id, p_titulo: tituloDaNovaRodada(av.titulo), p_periodo: null, p_prazo: null, p_mensagem: av.mensagem_apresentacao, p_anterior_id: av.id,
    });
    if (error) return toast(mensagemDeErro(error, 'Não foi possível criar a nova rodada.'), 'erro');
    location.href = `avaliacao.html?id=${data}`;
  }
}

function lerSetup() {
  const f = document.getElementById('form-setup');
  const prazo = fimDoDia(f.prazo.value);
  return { prazo, patch: { titulo: f.titulo.value.trim(), periodo_referencia: vazioParaNulo(f.periodo_referencia.value), prazo: prazo ? prazo.toISOString() : null, mensagem_apresentacao: vazioParaNulo(f.mensagem_apresentacao.value), respondente_nome: vazioParaNulo(f.respondente_nome.value) } };
}

main.addEventListener('click', async (e) => {
  const botao = e.target.closest('[data-acao]');
  if (botao) return void acao(botao.dataset.acao);
  if (e.target.closest('#salvar-rascunho')) {
    const { patch } = lerSetup();
    if (!patch.titulo) return mostrarErros(main, { titulo: 'Informe o título da avaliação.' }, ['titulo']);
    if (await atualizar(patch)) toast('Rascunho salvo.');
  }
});

main.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form-setup') return;
  e.preventDefault();
  const { prazo, patch } = lerSetup();
  const erros = validarEnvio({ totalPerguntas: totalDePerguntas(av), prazo });
  const mapa = {};
  if (!patch.titulo) mapa.titulo = 'Informe o título da avaliação.';
  if (erros.prazo) mapa.prazo = erros.prazo;
  mostrarErros(main, mapa, ['titulo', 'prazo']);
  const alvoPerguntas = document.getElementById('perguntas-erro');
  alvoPerguntas.hidden = !erros.perguntas;
  alvoPerguntas.textContent = erros.perguntas ?? '';
  if (Object.keys(mapa).length || erros.perguntas) return;
  if (await atualizar({ ...patch, status: 'aguardando_resposta', enviado_em: new Date().toISOString() }, 'Não foi possível gerar o link.')) {
    toast('Link gerado. Envie para o respondente.');
    desenhar();
    scrollTo({ top: 0 });
  }
});

if (await carregar()) desenhar();
else main.innerHTML = String(html`<p class="erro-geral" role="alert">Avaliação não encontrada. <a class="link" href="avaliacoes.html">Voltar para a lista</a></p>`);
