import { html } from '../html.js';
import { icone } from '../icones.js';
import { iniciarPagina } from '../shell.js';
import { supabase, dados } from '../supabase.js';
import { toast } from '../ui.js';
import { formatarData } from '../lib/formatacao.js';
import { mensagemDeErro } from '../lib/erros.js';

const { main } = await iniciarPagina({ ativo: 'questionarios' });
let lista = [];
let mostrarArquivados = false;

main.innerHTML = String(html`<section class="pilha pilha--lg">
  <header class="pagina-topo">
    <div><h1>Questionários</h1><p style="max-width:60ch">Modelos reutilizáveis: você cadastra os grupos e as perguntas, e cada avaliação guarda a própria cópia.</p></div>
    <button class="btn" id="btn-novo">${icone('plus')}Novo questionário</button>
  </header>
  <label class="checagem"><input type="checkbox" id="arquivados">Mostrar arquivados</label>
  <div id="lista"><div class="carregando" aria-busy="true"><div class="skeleton sk-linha"></div><div class="skeleton sk-linha"></div></div></div>
</section>`);

const alvo = document.getElementById('lista');

function desenhar() {
  const visiveis = lista.filter((q) => mostrarArquivados || !q.arquivado);
  alvo.innerHTML = String(
    visiveis.length === 0
      ? html`<div class="centro-vazio">${icone('file', 'icone--lg')}<p><b>Nenhum questionário ainda.</b></p><p class="muted" style="max-width:50ch">Crie um modelo, adicione grupos (temas) e perguntas com nota de 0 a 10.</p></div>`
      : html`<ul class="linhas">${visiveis.map((q) => {
          const perguntas = q.grupos.reduce((soma, g) => soma + (g.perguntas?.[0]?.count ?? 0), 0);
          return html`<li class="linha linha--entre">
            <div><a href="questionario.html?id=${q.id}" style="color:inherit;font-weight:600">${q.titulo}</a>
              <p class="muted" style="font-size:.875rem">${q.grupos.length} ${q.grupos.length === 1 ? 'grupo' : 'grupos'} · ${perguntas} ${perguntas === 1 ? 'pergunta' : 'perguntas'} · atualizado em ${formatarData(q.atualizado_em)}</p></div>
            <div class="linha">${q.arquivado ? html`<span class="badge">Arquivado</span>` : ''}<button class="btn btn--sec" data-duplicar="${q.id}">${icone('copia', 'icone--sm')}Duplicar</button></div>
          </li>`;
        })}</ul>`,
  );
}

async function carregar() {
  try {
    lista = dados(await supabase.from('questionarios').select('*, grupos(id, perguntas(count))').order('criado_em', { ascending: false }));
    desenhar();
  } catch {
    alvo.innerHTML = String(html`<p class="erro-geral" role="alert">Não foi possível carregar os questionários. Atualize a página e tente de novo.</p>`);
  }
}

document.getElementById('arquivados').addEventListener('change', (e) => {
  mostrarArquivados = e.target.checked;
  desenhar();
});

document.getElementById('btn-novo').addEventListener('click', async (e) => {
  e.currentTarget.disabled = true;
  const { data, error } = await supabase.from('questionarios').insert({ titulo: 'Novo questionário' }).select().single();
  if (error) {
    e.currentTarget.disabled = false;
    return toast(mensagemDeErro(error, 'Não foi possível criar o questionário.'), 'erro');
  }
  location.href = `questionario.html?id=${data.id}`;
});

alvo.addEventListener('click', async (e) => {
  const botao = e.target.closest('[data-duplicar]');
  if (!botao) return;
  botao.disabled = true;
  const { data, error } = await supabase.rpc('duplicar_questionario', { p_questionario_id: botao.dataset.duplicar });
  if (error) {
    botao.disabled = false;
    return toast(mensagemDeErro(error, 'Não foi possível duplicar o questionário.'), 'erro');
  }
  location.href = `questionario.html?id=${data}`;
});

await carregar();
