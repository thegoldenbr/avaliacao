/**
 * Formulário público de resposta (sem login). O token vem do fragmento da URL: responder.html#TOKEN.
 * Salva sozinho: localStorage a cada resposta e rascunho no servidor (com atraso), e retoma pelo mesmo link.
 */
import { supabase } from '../supabase.js';
import { aplicarTema } from '../tema.js';
import { aplicarCor } from '../marca.js';
import { emailValido } from '../lib/mascaras.js';
import { mostrarErros } from '../forms.js';
import { confirmar, toast } from '../ui.js';
import { html } from '../html.js';
import { telaAgradecimento, telaAviso, telaBoasVindas, telaEtapa, telaRevisao, telaSomenteLeitura, todasAsPerguntas } from './_responder-telas.js';

aplicarTema();
const raiz = document.getElementById('conteudo');
const token = decodeURIComponent(location.hash.slice(1)).split('/').filter(Boolean).pop() ?? '';
const CHAVE_LOCAL = `rascunho:${token.slice(0, 16)}`;
const ATRASO_SALVAR = 1500;

let form = null;
let resp = {}; // pergunta_id -> { nota, comentario }
let respondente = { nome: '', cargo: '', email: '' };
let etapa = -1; // -1 boas-vindas · 0..n-1 grupos · n revisão
const pendentes = new Set();
let temporizador = null;
let sincronizando = false;

const desenhar = (tela) => {
  raiz.innerHTML = String(tela);
  document.getElementById('corpo')?.focus({ preventScroll: true });
  scrollTo({ top: 0 });
  mostrarIndicador();
};

function mostrarIndicador(texto) {
  const el = document.getElementById('indicador');
  if (!el) return;
  const t = texto ?? (pendentes.size ? 'Salvando…' : etapa >= 0 ? 'Salvo' : '');
  el.textContent = t;
  el.hidden = !t;
}

/* ---------- armazenamento local ---------- */
function guardarLocal() {
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify({ respondente, resp, pendentes: [...pendentes] }));
  } catch {
    // sem armazenamento local: o servidor continua sendo a cópia
  }
}
function lerLocal() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_LOCAL) ?? 'null');
  } catch {
    return null;
  }
}

/* ---------- sincronização com o servidor ---------- */
function payload(soPendentes) {
  const ids = soPendentes ? [...pendentes] : todasAsPerguntas(form).map((p) => p.id);
  return {
    respondente,
    respostas: ids.filter((id) => resp[id]?.nota != null).map((id) => ({ pergunta_id: id, nota: resp[id].nota, comentario: resp[id].comentario ?? '' })),
  };
}

function erroDoServidor(error) {
  const msg = String(error?.message ?? '');
  return ['prazo_encerrado', 'avaliacao_indisponivel', 'respostas_incompletas', 'dados_respondente_invalidos', 'nota_invalida', 'pergunta_invalida', 'comentario_invalido'].find((c) => msg.includes(c)) ?? null;
}

async function sincronizar() {
  if (sincronizando || !form || (!pendentes.size && !respondente.nome)) return;
  sincronizando = true;
  const enviados = [...pendentes];
  mostrarIndicador('Salvando…');
  const { error } = await supabase.rpc('salvar_respostas', { p_token: token, p_payload: payload(true), p_finalizar: false });
  sincronizando = false;
  if (!error) {
    enviados.forEach((id) => pendentes.delete(id));
    guardarLocal();
    if (pendentes.size) agendar();
    return mostrarIndicador();
  }
  const codigo = erroDoServidor(error);
  if (codigo === 'prazo_encerrado' || codigo === 'avaliacao_indisponivel') return void carregar();
  mostrarIndicador(codigo ? 'Erro ao salvar' : 'Sem conexão. Respostas guardadas neste aparelho');
  if (!codigo) setTimeout(() => void sincronizar(), 15_000);
}

function agendar() {
  guardarLocal();
  clearTimeout(temporizador);
  temporizador = setTimeout(() => void sincronizar(), ATRASO_SALVAR);
  mostrarIndicador('Salvando…');
}
addEventListener('online', () => void sincronizar());
// Colar outro link na mesma aba só muda o #: recarrega para abrir o formulário certo.
addEventListener('hashchange', () => location.reload());

/* ---------- fluxo ---------- */
function irPara(nova) {
  etapa = Math.max(-1, Math.min(form.grupos.length, nova));
  if (etapa === -1) desenhar(telaBoasVindas(form, respondente));
  else if (etapa === form.grupos.length) desenhar(telaRevisao(form, resp));
  else desenhar(telaEtapa(form, etapa, resp));
}

function comecar() {
  const f = document.getElementById('form-identificacao');
  const erros = {};
  if (f.nome.value.trim().length < 2) erros.nome = 'Informe seu nome.';
  if (f.email.value.trim() && !emailValido(f.email.value)) erros.email = 'Informe um e-mail válido ou deixe em branco.';
  mostrarErros(f, erros, ['nome', 'cargo', 'email']);
  if (Object.keys(erros).length) return;
  respondente = { nome: f.nome.value.trim(), cargo: f.cargo.value.trim(), email: f.email.value.trim() };
  agendar();
  irPara(0);
}

async function enviar() {
  const faltam = todasAsPerguntas(form).filter((p) => resp[p.id]?.nota == null).length;
  if (faltam) return toast(`Faltam ${faltam} ${faltam === 1 ? 'pergunta' : 'perguntas'}. Responda todas para enviar.`, 'erro');
  if (!(await confirmar({ titulo: 'Enviar respostas?', descricao: 'Depois do envio, as respostas não podem ser alteradas.', rotuloConfirmar: 'Enviar respostas' }))) return;
  const botao = document.getElementById('btn-enviar');
  botao.disabled = true;
  botao.textContent = 'Enviando…';
  clearTimeout(temporizador);
  const { error } = await supabase.rpc('salvar_respostas', { p_token: token, p_payload: payload(false), p_finalizar: true });
  if (!error) {
    try {
      localStorage.removeItem(CHAVE_LOCAL);
    } catch {
      // ignorar
    }
    etapa = -2; // tela final: sem indicador de salvamento
    return desenhar(telaAgradecimento(form, new Date()));
  }
  const codigo = erroDoServidor(error);
  if (codigo === 'prazo_encerrado' || codigo === 'avaliacao_indisponivel') return void carregar();
  if (codigo === 'dados_respondente_invalidos') return irPara(-1), toast('Confira seu nome e e-mail.', 'erro');
  botao.disabled = false;
  botao.textContent = 'Enviar respostas';
  toast(codigo ? 'Não foi possível enviar. Confira as respostas e tente de novo.' : 'Sem conexão. Suas respostas continuam guardadas; tente enviar de novo quando a internet voltar.', 'erro');
}

raiz.addEventListener('click', (e) => {
  const nota = e.target.closest('[data-nota]');
  if (nota) {
    const pid = nota.dataset.pergunta;
    resp[pid] = { ...resp[pid], nota: Number(nota.dataset.nota) };
    pendentes.add(pid);
    nota.closest('[role=radiogroup]').querySelectorAll('[data-nota]').forEach((b) => b.setAttribute('aria-checked', String(b === nota)));
    const feitas = todasAsPerguntas(form).filter((p) => resp[p.id]?.nota != null).length;
    document.getElementById('contador').textContent = `${feitas} de ${todasAsPerguntas(form).length}`;
    const barra = document.getElementById('progresso');
    barra.setAttribute('aria-valuenow', String(feitas));
    barra.firstElementChild.style.width = `${(feitas / todasAsPerguntas(form).length) * 100}%`;
    return agendar();
  }
  const nav = e.target.closest('[data-nav]');
  if (nav) return irPara(etapa + Number(nav.dataset.nav));
  const ir = e.target.closest('[data-ir]');
  if (ir) return irPara(Number(ir.dataset.ir));
  if (e.target.closest('#btn-comecar')) return comecar();
  if (e.target.closest('#btn-enviar')) return void enviar();
});

raiz.addEventListener('input', (e) => {
  const pid = e.target.dataset?.comentario;
  if (!pid) return;
  resp[pid] = { ...resp[pid], comentario: e.target.value };
  if (resp[pid].nota != null) pendentes.add(pid);
  agendar();
});

/* ---------- carga ---------- */
async function carregar() {
  raiz.innerHTML = String(html`<div class="centro"><div class="caixa carregando" aria-busy="true"><div class="skeleton sk-titulo"></div><div class="skeleton sk-bloco"></div></div></div>`);
  const { data, error } = await supabase.rpc('obter_formulario', { p_token: token });
  if (error) {
    raiz.innerHTML = String(html`<div class="centro"><div class="caixa pilha"><h1>Sem conexão</h1><p class="muted">Não conseguimos abrir o formulário agora. Verifique sua internet.</p><button class="btn" id="tentar">Tentar de novo</button></div></div>`);
    document.getElementById('tentar').addEventListener('click', () => void carregar());
    return;
  }
  if (!data) {
    form = { marca: { nome: 'Radar de Desempenho', logo_url: null }, textos: {}, grupos: [] };
    return desenhar(telaAviso(form, { icon: 'aviso', cor: 'faixa--atencao', titulo: 'Link inválido', textos: ['Não encontramos esta avaliação. Confira se o endereço está completo ou peça um novo link a quem enviou.'] }));
  }
  form = data;
  aplicarCor(form.marca);
  resp = Object.fromEntries(form.respostas.map((r) => [r.pergunta_id, { nota: r.nota, comentario: r.comentario ?? '' }]));
  respondente = { nome: form.respondente?.nome ?? '', cargo: form.respondente?.cargo ?? '', email: form.respondente?.email ?? '' };

  if (form.status !== 'aguardando_resposta') return desenhar(telaSomenteLeitura(form, resp));
  if (form.encerrada) {
    return desenhar(telaAviso(form, { icon: 'relogio', cor: 'faixa--atencao', titulo: 'O prazo para responder terminou', textos: [`Este questionário foi encerrado${form.prazo ? ` em ${new Date(form.prazo).toLocaleDateString('pt-BR')}` : ''}. Suas respostas parciais foram guardadas, mas não podem mais ser alteradas por este link.`, `Precisa de mais tempo? Fale com ${form.marca.nome} e peça a reabertura.`] }));
  }
  const local = lerLocal();
  if (local) {
    for (const id of local.pendentes ?? []) {
      if (local.resp?.[id]) {
        resp[id] = local.resp[id];
        pendentes.add(id);
      }
    }
    if (!respondente.nome && local.respondente) respondente = { ...respondente, ...local.respondente };
  }
  const jaComecou = Object.keys(resp).length > 0 && respondente.nome;
  if (jaComecou) {
    const primeira = form.grupos.findIndex((g) => g.perguntas.some((p) => resp[p.id]?.nota == null));
    irPara(primeira === -1 ? form.grupos.length : primeira);
  } else {
    irPara(-1);
  }
  if (pendentes.size) void sincronizar();
}

await carregar();
