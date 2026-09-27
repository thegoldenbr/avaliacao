/** Passos 1 e 2 da criação: empresa e questionário. A cópia (snapshot) das perguntas é criada aqui; os passos 3 a 5 ficam em avaliacao.html. */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { iniciarPagina } from '../shell.js';
import { supabase, dados } from '../supabase.js';
import { campo, mostrarErros } from '../forms.js';
import { toast } from '../ui.js';
import { mensagemDeErro } from '../lib/erros.js';

const { main } = await iniciarPagina({ ativo: 'avaliacoes' });
const parametros = new URLSearchParams(location.search);

let empresas = [];
let questionarios = [];
try {
  [empresas, questionarios] = await Promise.all([
    supabase.from('empresas').select('id, razao_social, nome_fantasia, ativo').eq('ativo', true).order('razao_social').then(dados),
    supabase.from('questionarios').select('id, titulo, descricao, grupos(id, perguntas(count))').eq('arquivado', false).order('titulo').then(dados),
  ]);
} catch {
  main.innerHTML = String(html`<p class="erro-geral" role="alert">Não foi possível carregar empresas e questionários. Atualize a página e tente de novo.</p>`);
  throw new Error('carga');
}

const total = (q) => q.grupos.reduce((s, g) => s + (g.perguntas?.[0]?.count ?? 0), 0);
const nomeEmpresa = (e) => e.nome_fantasia ?? e.razao_social;
const empresaInicial = parametros.get('empresa') ?? '';

main.innerHTML = String(html`<section class="pilha pilha--lg">
  <header><p class="migalha"><a href="avaliacoes.html">Avaliações</a> ${icone('dir', 'icone--sm')} Nova avaliação</p><h1>Nova avaliação</h1></header>
  <ol class="passos" aria-label="Etapas">
    <li aria-current="step"><b>1</b>Empresa</li><li aria-current="step"><b>2</b>Questionário</li><li><b>3</b>Perguntas</li><li><b>4</b>Prazo e mensagem</li><li><b>5</b>Link</li>
  </ol>
  ${empresas.length === 0 || questionarios.length === 0
    ? html`<div class="aviso aviso--atencao">${icone('aviso')}<p>${empresas.length === 0 ? html`Cadastre uma <a class="link" href="empresa-form.html">empresa ativa</a>` : html`Crie um <a class="link" href="questionarios.html">questionário</a>`} antes de criar uma avaliação.</p></div>`
    : html`<form class="pilha pilha--lg" id="form" novalidate>
    ${campo({ id: 'empresa', rotulo: 'Empresa avaliada', controle: html`<select class="select" id="empresa"><option value="">Escolha a empresa</option>${empresas.map((e) => html`<option value="${e.id}" ${e.id === empresaInicial ? html`selected` : ''}>${nomeEmpresa(e)}</option>`)}</select>` })}
    <fieldset class="pilha"><legend style="font-weight:500;margin-bottom:.5rem">Questionário</legend>
      ${questionarios.map((q, i) => html`<label class="cartao" style="display:flex;gap:.75rem;align-items:flex-start;cursor:pointer"><input type="radio" name="questionario" value="${q.id}" style="width:20px;height:20px;margin-top:.25rem;accent-color:var(--color-primary)" ${i === 0 && questionarios.length === 1 ? html`checked` : ''}>
        <span><b>${q.titulo}</b><br><span class="muted">${q.grupos.length} ${q.grupos.length === 1 ? 'grupo' : 'grupos'} · ${total(q)} perguntas${q.descricao ? ` · ${q.descricao}` : ''}</span></span></label>`)}
      <p class="erro" id="questionario-erro" role="alert" hidden></p>
    </fieldset>
    <p class="muted">Ao continuar, as perguntas são copiadas para esta avaliação. Depois você pode ajustá-las, definir prazo e mensagem e gerar o link.</p>
    <div class="linha"><button class="btn" type="submit">Continuar</button><a class="btn btn--ghost" href="avaliacoes.html">Cancelar</a></div>
  </form>`}
</section>`);

const form = document.getElementById('form');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const empresaId = form.empresa.value;
  const qId = form.querySelector('input[name=questionario]:checked')?.value;
  mostrarErros(form, empresaId ? {} : { empresa: 'Escolha a empresa avaliada.' }, ['empresa']);
  const erroQ = document.getElementById('questionario-erro');
  erroQ.hidden = Boolean(qId);
  erroQ.textContent = qId ? '' : 'Escolha um questionário.';
  if (!empresaId || !qId) return;

  const q = questionarios.find((x) => x.id === qId);
  if (total(q) === 0) {
    erroQ.hidden = false;
    erroQ.textContent = 'Este questionário ainda não tem perguntas. Cadastre-as no editor antes de usar.';
    return;
  }
  const botao = form.querySelector('button[type=submit]');
  botao.disabled = true;
  botao.textContent = 'Criando…';
  const { data, error } = await supabase.rpc('criar_avaliacao', { p_empresa_id: empresaId, p_questionario_id: qId, p_titulo: q.titulo });
  if (error) {
    botao.disabled = false;
    botao.textContent = 'Continuar';
    return toast(mensagemDeErro(error, 'Não foi possível criar a avaliação.'), 'erro');
  }
  location.href = `avaliacao.html?id=${data}`;
});
