/** Editor do relatório: gera com IA (ou escreve à mão), edita, pré-visualiza e publica o snapshot para o cliente. */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { iniciarPagina } from '../shell.js';
import { supabase, dados } from '../supabase.js';
import { abrirDialogo, confirmar, toast } from '../ui.js';
import { renderRelatorio } from '../relatorio-vista.js';
import { qrSvg } from '../qr.js';
import { mensagemDeErro } from '../lib/erros.js';
import { formatarData } from '../lib/formatacao.js';
import { linkEmail, linkWhatsApp } from '../lib/avaliacao.js';
import { relatorioEmBranco } from '../lib/relatorio-ia.js';
import { montarSnapshot, normalizarOpcoes, problemasParaPublicar } from '../lib/snapshot.js';
import { urlDaPagina } from '../supabase.js';
import { carregarIndicadores, statusTemIndicadores } from './_avaliacao-indicadores.js';
import { ITEM_NOVO, definirCaminho, formularioDoRelatorio } from './_editor-form.js';

const { main } = await iniciarPagina({ ativo: 'avaliacoes' });
const id = new URLSearchParams(location.search).get('id');
const SELECAO = '*, empresas(*), avaliacao_grupos(*, avaliacao_perguntas(*))';

const { data: av } = await supabase.from('avaliacoes').select(SELECAO).eq('id', id ?? '').maybeSingle();
if (!av || !statusTemIndicadores(av.status)) {
  main.innerHTML = String(html`<p class="erro-geral" role="alert">Esta avaliação ainda não foi respondida, então não há o que analisar. <a class="link" href="${av ? `avaliacao.html?id=${av.id}` : 'avaliacoes.html'}">Voltar</a></p>`);
  throw new Error('sem respostas');
}

let linha = dados(await supabase.from('relatorios').select('*').eq('avaliacao_id', av.id).maybeSingle());
const base = await carregarIndicadores(av);
const gruposLista = base.ind.grupos.map((g) => ({ id: g.id, nome: g.nome }));

const completar = (c) => {
  const modelo = relatorioEmBranco(base.ind.grupos);
  // Cópia profunda: editar o rascunho nunca pode alterar o texto original da IA (conteudo_ia).
  const saida = { ...modelo, ...structuredClone(c ?? {}) };
  saida.analise_por_grupo = base.ind.grupos.map((g) => ({ grupo: g.id, texto: c?.analise_por_grupo?.find((a) => a.grupo === g.id)?.texto ?? '' }));
  return saida;
};
let conteudo = completar(linha?.conteudo_rascunho);
let opcoes = normalizarOpcoes(linha?.opcoes);
let sujo = false;
let temporizador = null;
let salvando = false;
let largura = 'celular';
const empresa = av.empresas;
const nomeEmpresa = empresa.nome_fantasia ?? empresa.razao_social;
const el = (i) => document.getElementById(i);

main.innerHTML = String(html`<section class="pilha pilha--lg">
  <header class="pilha">
    <p class="migalha"><a href="avaliacoes.html">Avaliações</a> ${icone('dir', 'icone--sm')} <a href="avaliacao.html?id=${av.id}">${nomeEmpresa}</a> ${icone('dir', 'icone--sm')} Relatório</p>
    <div class="pagina-topo" style="margin-bottom:0"><div><h1>Relatório</h1><p class="linha"><span class="badge" id="badge-status"></span><span class="muted" id="estado-salvo" role="status"></span></p></div>
      <div class="linha"><button class="btn btn--sec" id="btn-ia">${icone('ia', 'icone--sm')}Gerar com IA</button><button class="btn" id="btn-publicar">Publicar relatório</button><button class="btn btn--ghost" id="btn-despublicar" hidden>Despublicar</button></div></div>
    <div id="aviso-conflito"></div><div id="painel-senha"></div><div id="painel-publicacao"></div>
  </header>
  <div class="editor">
    <div>
      <div class="barra-ferramentas" role="toolbar" aria-label="Formatação do texto selecionado" style="position:sticky;top:0;z-index:5">
        <button type="button" class="btn btn--ghost btn--icone btn--sm" data-fmt="**" aria-label="Negrito"><b>N</b></button>
        <button type="button" class="btn btn--ghost btn--icone btn--sm" data-fmt="*" aria-label="Itálico"><i>I</i></button>
        <button type="button" class="btn btn--ghost btn--icone btn--sm" data-fmt="- " aria-label="Lista">${icone('lista', 'icone--sm')}</button>
        <span class="muted" style="align-self:center;font-size:.8125rem;padding-left:.5rem">Selecione um trecho e clique para formatar</span></div>
      <form id="form-relatorio" onsubmit="return false"></form></div>
    <aside class="editor-previa pilha" aria-labelledby="h-previa"><div class="linha linha--entre"><h2 id="h-previa">Como o cliente verá</h2>
        <div class="chips"><button class="chip" data-largura="celular" aria-pressed="true">${icone('monitor', 'icone--sm')}Celular</button><button class="chip" data-largura="desktop" aria-pressed="false">${icone('monitor', 'icone--sm')}Desktop</button></div></div>
      <div class="moldura" id="previa"></div>
      <p class="muted">Ao publicar, o cliente passa a ver exatamente este conteúdo. Depois, use “Atualizar publicação” para enviar mudanças.</p></aside>
  </div>
</section>`);

/* ---------- desenho ---------- */
function desenharForm() {
  const foco = document.activeElement?.dataset?.path;
  const y = scrollY;
  el('form-relatorio').innerHTML = String(formularioDoRelatorio(conteudo, gruposLista, opcoes));
  contarResumo();
  scrollTo({ top: y });
  if (foco) el('form-relatorio').querySelector(`[data-path="${foco}"]`)?.focus();
}

function contarResumo() {
  const palavras = conteudo.resumo_executivo.trim().split(/\s+/).filter(Boolean).length;
  const alvo = el('contagem-resumo');
  if (alvo) alvo.textContent = `${palavras} de 120 palavras sugeridas.`;
}

function snapshot() {
  return montarSnapshot({ avaliacao: av, empresa, indicadores: base.ind, faixas: base.faixas, anterior: base.anterior?.indicadores ?? null, variacao: base.insights.variacao, media: base.media, conteudo, opcoes });
}

function desenharPrevia() {
  const s = snapshot();
  const caixa = el('previa');
  caixa.className = `moldura ${largura === 'celular' ? '' : ''}`;
  caixa.style.maxWidth = largura === 'celular' ? '390px' : '';
  caixa.style.marginInline = largura === 'celular' ? 'auto' : '';
  caixa.innerHTML = String(renderRelatorio(s));
}

function desenharEstado() {
  const publicada = av.status === 'publicada';
  el('badge-status').textContent = publicada ? 'Publicado' : 'Rascunho';
  el('badge-status').className = `badge ${publicada ? 'badge--ok' : 'badge--aviso'}`;
  el('btn-publicar').textContent = publicada ? 'Atualizar publicação' : 'Publicar relatório';
  el('btn-despublicar').hidden = !publicada;
  const painel = el('painel-publicacao');
  if (!publicada) return void (painel.innerHTML = '');
  const link = `${urlDaPagina('relatorio.html')}#${av.token_relatorio}`;
  const texto = `Olá! O relatório de desempenho de ${nomeEmpresa} está disponível neste link: ${link}${av.relatorio_senha ? `\nSenha de acesso: ${av.relatorio_senha}` : ''}`;
  painel.innerHTML = String(html`<div class="cartao pilha"><h2 style="font-size:1.0625rem">Link do dashboard do cliente</h2>
    <div class="link-copia"><input class="input" id="link-relatorio" readonly aria-label="Link do relatório" value="${link}"><button class="btn btn--sec btn--icone" id="copiar-relatorio" aria-label="Copiar link">${icone('copia')}</button></div>
    <div class="linha" style="align-items:flex-start;gap:1.5rem">${qrSvg(link, 'QR code do relatório')}<div class="linha">
      <a class="btn btn--sec" target="_blank" rel="noopener noreferrer" href="${linkWhatsApp({ telefone: empresa.responsavel_telefone, texto })}">${icone('zap', 'icone--sm')}WhatsApp</a>
      <a class="btn btn--sec" href="${linkEmail({ para: empresa.responsavel_email, assunto: `Relatório de desempenho: ${nomeEmpresa}`, corpo: texto })}">${icone('email', 'icone--sm')}E-mail</a>
      <a class="btn btn--sec" target="_blank" rel="noopener noreferrer" href="${link}">${icone('olho', 'icone--sm')}Abrir</a>
      <button class="btn btn--ghost" id="novo-link-relatorio">Gerar novo link</button></div></div>
    <p class="muted">Publicado em ${av.publicado_em ? formatarData(av.publicado_em) : '—'}. Se o link vazar, gere outro: o anterior deixa de funcionar.</p></div>`);
}


/* ---------- senha do dashboard do cliente ---------- */
function desenharSenha() {
  const ativa = Boolean(av.relatorio_senha);
  el('painel-senha').innerHTML = String(html`<div class="cartao pilha"><h2 style="font-size:1.0625rem">Acesso do cliente</h2>
    <label class="interruptor"><span>Exigir senha para abrir o dashboard do cliente</span><input type="checkbox" id="senha-ativa" ${ativa ? html`checked` : ''}></label>
    ${ativa
      ? html`<div class="linha"><span class="muted">Senha atual:</span><b class="num" id="senha-codigo" style="font-size:1.5rem;letter-spacing:.15em">${av.relatorio_senha}</b>
          <button class="btn btn--sec btn--sm" id="copiar-senha">${icone('copia', 'icone--sm')}Copiar</button>
          <button class="btn btn--sec btn--sm" id="nova-senha">${icone('editar', 'icone--sm')}Gerar nova senha</button></div>
        <p class="muted">Envie a senha ao cliente junto com o link. Ao gerar uma nova, a anterior para de funcionar e o cliente precisa digitar a nova. 5 erros seguidos bloqueiam o link por 10 minutos.</p>`
      : html`<p class="muted">Sem senha, qualquer pessoa com o link abre o dashboard.</p>`}</div>`);
}

async function definirSenha(ativar, renovar = false) {
  const { data, error } = await supabase.rpc('definir_senha_relatorio', { p_avaliacao_id: av.id, p_ativar: ativar, p_renovar: renovar });
  if (error) {
    toast(mensagemDeErro(error, 'Não foi possível alterar a senha do dashboard.'), 'erro');
    return desenharSenha();
  }
  av.relatorio_senha = data;
  desenharSenha();
  desenharEstado();
  toast(!ativar ? 'Senha desativada: o link abre direto.' : renovar ? 'Nova senha gerada. A anterior não funciona mais.' : 'Senha ativada.');
}

/* ---------- salvamento ---------- */
const hora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function agendar() {
  sujo = true;
  el('estado-salvo').textContent = 'Alterações não salvas…';
  clearTimeout(temporizador);
  temporizador = setTimeout(() => void salvar(), 1500);
}

async function salvar({ forcar = false } = {}) {
  if (salvando) return;
  clearTimeout(temporizador);
  salvando = true;
  try {
    const carga = { conteudo_rascunho: conteudo, opcoes };
    if (!linha) {
      const { data, error } = await supabase.from('relatorios').insert({ avaliacao_id: av.id, ...carga }).select('*').single();
      if (error) throw error;
      linha = data;
    } else {
      let consulta = supabase.from('relatorios').update(carga).eq('id', linha.id);
      if (!forcar) consulta = consulta.eq('updated_at', linha.updated_at);
      const { data, error } = await consulta.select('*');
      if (error) throw error;
      if (!data.length) return void mostrarConflito();
      linha = data[0];
    }
    sujo = false;
    el('aviso-conflito').innerHTML = '';
    el('estado-salvo').textContent = `Salvo às ${hora()}`;
  } catch (erro) {
    el('estado-salvo').textContent = 'Não foi possível salvar';
    toast(mensagemDeErro(erro, 'Não foi possível salvar o relatório. Suas alterações continuam na tela.'), 'erro');
  } finally {
    salvando = false;
  }
}

function mostrarConflito() {
  el('estado-salvo').textContent = 'Conflito de edição';
  el('aviso-conflito').innerHTML = String(html`<div class="aviso aviso--atencao" role="alert">${icone('aviso')}<div class="pilha pilha--sm"><p><b>Outra pessoa alterou este relatório enquanto você editava.</b></p>
    <div class="linha"><button class="btn btn--sec btn--sm" id="carregar-recente">Carregar a versão mais recente</button><button class="btn btn--sec btn--sm" id="sobrescrever">Manter a minha versão</button></div></div></div>`);
}

/* ---------- IA ---------- */
function dialogoIA() {
  const { el: dlg, fechar } = abrirDialogo({
    titulo: 'Gerar análise com IA',
    corpo: html`<form class="pilha" id="form-ia">
      <p>A IA escreve o texto a partir das notas já calculadas (ela não calcula nada). Nenhum dado pessoal do respondente é enviado.</p>
      ${conteudo.resumo_executivo || conteudo.recomendacoes.length ? html`<p class="aviso aviso--atencao">${icone('aviso')}<span>Isso <b>substitui o rascunho atual</b> do relatório.</span></p>` : ''}
      <label class="campo"><span style="font-weight:500">Instruções extras <span class="muted">(opcional)</span></span><textarea class="textarea" id="instrucoes" maxlength="800" placeholder="Ex.: foco em gestão financeira"></textarea></label>
      <div id="estado-ia" role="status"></div>
      <div class="dialogo-acoes"><button type="button" class="btn btn--sec" data-fechar>Cancelar</button><button type="submit" class="btn">Gerar análise</button></div></form>`,
  });
  dlg.querySelector('#form-ia').addEventListener('submit', async (e) => {
    e.preventDefault();
    const estado = dlg.querySelector('#estado-ia');
    const botoes = dlg.querySelectorAll('button');
    botoes.forEach((b) => (b.disabled = true));
    estado.innerHTML = String(html`<p class="linha"><span class="spinner"></span>Gerando a análise… isso pode levar até 1 minuto.</p>`);
    try {
      if (sujo) await salvar();
      const limite = new Promise((_, rejeitar) => setTimeout(() => rejeitar(new Error('A geração demorou demais. Tente de novo ou escreva o relatório à mão.')), 130_000));
      const resposta = await Promise.race([supabase.functions.invoke('gerar-relatorio', { body: { avaliacao_id: av.id, instrucoes: dlg.querySelector('#instrucoes').value } }), limite]);
      if (resposta.error) {
        const corpo = await resposta.error.context?.json?.().catch(() => null);
        throw new Error(corpo?.erro ?? 'Não foi possível gerar a análise agora. Você pode escrever o relatório à mão.');
      }
      linha = dados(await supabase.from('relatorios').select('*').eq('avaliacao_id', av.id).single());
      conteudo = completar(linha.conteudo_rascunho);
      if (av.status === 'respondida') av.status = 'em_analise';
      desenharForm();
      desenharPrevia();
      desenharEstado();
      el('estado-salvo').textContent = `Análise gerada às ${hora()}`;
      toast('Análise gerada. Revise e edite antes de publicar.');
      fechar();
    } catch (erro) {
      estado.innerHTML = String(html`<p class="erro-geral" role="alert">${erro.message} Você pode fechar e escrever o relatório à mão.</p>`);
      botoes.forEach((b) => (b.disabled = false));
    }
  });
}

/* ---------- publicação ---------- */
async function publicar() {
  const problemas = problemasParaPublicar(conteudo);
  if (problemas.length) return toast(problemas.join(' '), 'erro');
  if (sujo || !linha) await salvar();
  if (sujo) return;
  const agora = new Date().toISOString();
  const s = { ...snapshot(), publicado_em: agora };
  const r1 = await supabase.from('relatorios').update({ conteudo_publicado: s, publicado_em: agora }).eq('id', linha.id).select('*').single();
  if (r1.error) return toast(mensagemDeErro(r1.error, 'Não foi possível publicar.'), 'erro');
  linha = r1.data;
  const r2 = await supabase.from('avaliacoes').update({ status: 'publicada', publicado_em: agora }).eq('id', av.id);
  if (r2.error) return toast(mensagemDeErro(r2.error, 'Não foi possível publicar.'), 'erro');
  av.status = 'publicada';
  av.publicado_em = agora;
  desenharEstado();
  toast('Relatório publicado.');
}

/* ---------- eventos ---------- */
const formEl = el('form-relatorio');
formEl.addEventListener('input', (e) => {
  const path = e.target.dataset?.path;
  if (!path) return;
  definirCaminho(conteudo, path, e.target.value);
  if (path === 'resumo_executivo') contarResumo();
  agendar();
  clearTimeout(desenharPrevia.t);
  desenharPrevia.t = setTimeout(desenharPrevia, 400);
});
el('painel-senha').addEventListener('change', (e) => {
  if (e.target.id === 'senha-ativa') void definirSenha(e.target.checked);
});
formEl.addEventListener('change', (e) => {
  if (e.target.dataset.opcao) opcoes[e.target.dataset.opcao] = e.target.checked;
  else if (e.target.dataset.ocultar) opcoes.ocultar[e.target.dataset.ocultar] = e.target.checked;
  else return;
  agendar();
  desenharPrevia();
});
formEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-lista]');
  if (!b) return;
  const lista = conteudo[b.dataset.lista];
  const i = Number(b.dataset.i);
  if (b.dataset.acao === 'adicionar') lista.push(ITEM_NOVO[b.dataset.lista](gruposLista[0]?.id ?? ''));
  if (b.dataset.acao === 'remover') lista.splice(i, 1);
  if (b.dataset.acao === 'subir' && i > 0) [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]];
  if (b.dataset.acao === 'descer' && i < lista.length - 1) [lista[i + 1], lista[i]] = [lista[i], lista[i + 1]];
  desenharForm();
  desenharPrevia();
  agendar();
});

let ultimoTexto = null;
document.addEventListener('focusin', (e) => {
  if (e.target.matches?.('textarea[data-md], input[data-path]')) ultimoTexto = e.target;
});
main.querySelector('[role=toolbar]').addEventListener('mousedown', (e) => e.preventDefault()); // não tira o foco do campo
main.querySelector('[role=toolbar]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-fmt]');
  const campo = ultimoTexto;
  if (!b || !campo || campo.tagName !== 'TEXTAREA') return toast('Clique dentro de um texto para formatar.', 'erro');
  const marca = b.dataset.fmt;
  const [ini, fim] = [campo.selectionStart, campo.selectionEnd];
  const trecho = campo.value.slice(ini, fim) || 'texto';
  const novo = marca === '- ' ? trecho.split('\n').map((l) => `- ${l}`).join('\n') : `${marca}${trecho}${marca}`;
  campo.setRangeText(novo, ini, fim, 'select');
  campo.dispatchEvent(new Event('input', { bubbles: true }));
});

main.addEventListener('click', async (e) => {
  if (e.target.closest('#nova-senha')) {
    if (!(await confirmar({ titulo: 'Gerar nova senha', descricao: 'A senha atual deixa de funcionar. Envie a nova ao cliente.', rotuloConfirmar: 'Gerar nova senha' }))) return;
    return void definirSenha(true, true);
  }
  if (e.target.closest('#copiar-senha')) {
    try {
      await navigator.clipboard.writeText(av.relatorio_senha);
      return toast('Senha copiada.');
    } catch {
      return toast('Selecione a senha e copie manualmente.', 'erro');
    }
  }
  if (e.target.closest('#btn-ia')) return dialogoIA();
  if (e.target.closest('#btn-publicar')) return void publicar();
  if (e.target.closest('#btn-despublicar')) {
    if (!(await confirmar({ titulo: 'Despublicar relatório', descricao: 'O dashboard do cliente sai do ar até você publicar de novo. O link continua o mesmo.', rotuloConfirmar: 'Despublicar' }))) return;
    const { error } = await supabase.from('avaliacoes').update({ status: 'em_analise', publicado_em: null }).eq('id', av.id);
    if (error) return toast(mensagemDeErro(error, 'Não foi possível despublicar.'), 'erro');
    av.status = 'em_analise';
    desenharEstado();
    return toast('Relatório despublicado.');
  }
  if (e.target.closest('#copiar-relatorio')) {
    try {
      await navigator.clipboard.writeText(el('link-relatorio').value);
      toast('Link copiado.');
    } catch {
      toast('Selecione o link e copie manualmente (Ctrl+C).', 'erro');
    }
  }
  if (e.target.closest('#novo-link-relatorio')) {
    if (!(await confirmar({ titulo: 'Gerar novo link', descricao: 'O link atual deixa de funcionar; envie o novo ao cliente.', rotuloConfirmar: 'Gerar novo link' }))) return;
    const { data, error } = await supabase.rpc('regenerar_token', { p_avaliacao_id: av.id, p_qual: 'relatorio' });
    if (error) return toast(mensagemDeErro(error), 'erro');
    av.token_relatorio = data;
    desenharEstado();
    toast('Novo link gerado.');
  }
  const largo = e.target.closest('[data-largura]');
  if (largo) {
    largura = largo.dataset.largura;
    main.querySelectorAll('[data-largura]').forEach((b) => b.setAttribute('aria-pressed', String(b === largo)));
    desenharPrevia();
  }
  if (e.target.closest('#carregar-recente')) location.reload();
  if (e.target.closest('#sobrescrever')) void salvar({ forcar: true });
});

desenharForm();
desenharPrevia();
desenharSenha();
desenharEstado();
if (linha?.updated_at) el('estado-salvo').textContent = `Última edição em ${formatarData(linha.updated_at)}`;
addEventListener('beforeunload', (e) => {
  if (sujo) e.preventDefault();
});
