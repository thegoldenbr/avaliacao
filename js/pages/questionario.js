/**
 * Editor de questionário: a empresa avaliadora cadastra grupos e perguntas (nada é fixo no sistema).
 * Cada alteração é salva ao sair do campo. Reordenar: arrastar (mouse/toque) ou botões ↑↓.
 */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { iniciarPagina } from '../shell.js';
import { supabase, dados } from '../supabase.js';
import { campo } from '../forms.js';
import { confirmar, toast } from '../ui.js';
import { formatarPercentual, percentuais } from '../lib/pesos.js';
import { mensagemDeErro } from '../lib/erros.js';

const { main } = await iniciarPagina({ ativo: 'questionarios' });
const id = new URLSearchParams(location.search).get('id');
const recolhidos = new Set();
let q = null;
let uso = 0;

const ordenar = (lista) => [...lista].sort((a, b) => a.ordem - b.ordem);

async function carregar() {
  const bruto = dados(await supabase.from('questionarios').select('*, grupos(*, perguntas(*))').eq('id', id ?? '').maybeSingle());
  if (!bruto) return null;
  return { ...bruto, grupos: ordenar(bruto.grupos).map((g) => ({ ...g, perguntas: ordenar(g.perguntas) })) };
}

/** Campo do editor: guarda tabela/id/campo em data-* para o salvamento ao sair. */
function campoEd({ tabela, rid, nome, rotulo, valor, tipo = 'texto', ajuda, classe = '', max, obrigatorio = false }) {
  const cid = `${tabela.slice(0, 1)}-${rid}-${nome}`;
  const dat = html`data-tabela="${tabela}" data-id="${rid}" data-campo="${nome}" data-tipo="${tipo}"`;
  const base = { max, obrig: obrigatorio ? 'required' : '' };
  const controle =
    tipo === 'numero'
      ? html`<input class="input num" id="${cid}" type="number" inputmode="decimal" step="any" min="0" value="${valor ?? ''}" ${dat}>`
      : tipo === 'area'
        ? html`<textarea class="textarea" id="${cid}" style="min-height:4rem" ${max ? html`maxlength="${max}"` : ''} ${base.obrig ? html`required` : ''} ${dat}>${valor ?? ''}</textarea>`
        : html`<input class="input" id="${cid}" value="${valor ?? ''}" ${max ? html`maxlength="${max}"` : ''} ${base.obrig ? html`required` : ''} ${dat}>`;
  return campo({ id: cid, rotulo, ajuda, classe, controle });
}

const marcar = (ligado) => (ligado ? html`checked` : '');

function htmlPergunta(p, i, gid) {
  return html`<div class="pergunta-q" data-id="${p.id}" data-grupo="${gid}">
    <button type="button" class="alca alca-pergunta" aria-label="Arrastar a pergunta para reordenar">${icone('alca')}</button>
    <div class="conteudo">
      ${campoEd({ tabela: 'perguntas', rid: p.id, nome: 'enunciado', rotulo: `Pergunta ${i + 1}`, valor: p.enunciado, tipo: 'area', max: 500, obrigatorio: true })}
      <div class="opcoes-linha">
        ${campoEd({ tabela: 'perguntas', rid: p.id, nome: 'peso', rotulo: 'Peso', valor: p.peso, tipo: 'numero' })}
        <p class="peso-rel" style="padding-bottom:.75rem" data-pct-pergunta="${p.id}"></p>
        <label class="checagem checagem--linha"><input type="checkbox" data-tabela="perguntas" data-id="${p.id}" data-campo="escala_invertida" ${marcar(p.escala_invertida)}>Escala invertida</label>
        <label class="checagem checagem--linha"><input type="checkbox" data-tabela="perguntas" data-id="${p.id}" data-campo="permite_comentario" ${marcar(p.permite_comentario)}>Permite comentário</label>
      </div>
      <details>
        <summary class="mais">Texto de apoio e rótulos da escala</summary>
        <div class="form-grade" style="padding-top:.5rem">
          ${campoEd({ tabela: 'perguntas', rid: p.id, nome: 'texto_apoio', rotulo: 'Texto de apoio', valor: p.texto_apoio, tipo: 'area', classe: 'cheio', max: 500 })}
          ${campoEd({ tabela: 'perguntas', rid: p.id, nome: 'rotulo_min', rotulo: 'Rótulo do 0', valor: p.rotulo_min, ajuda: 'Vazio usa o padrão das configurações.', max: 60 })}
          ${campoEd({ tabela: 'perguntas', rid: p.id, nome: 'rotulo_max', rotulo: 'Rótulo do 10', valor: p.rotulo_max, max: 60 })}
        </div>
        <p class="muted" style="padding-top:.5rem">Escala invertida: a nota 10 significa o pior cenário, então a nota efetiva é 10 − resposta.</p>
      </details>
    </div>
    <div class="acoes">
      <button type="button" class="btn btn--ghost btn--icone" data-acao="pergunta-subir" data-id="${p.id}" aria-label="Subir a pergunta">${icone('sobe')}</button>
      <button type="button" class="btn btn--ghost btn--icone" data-acao="pergunta-descer" data-id="${p.id}" aria-label="Descer a pergunta">${icone('desce')}</button>
      <button type="button" class="btn btn--ghost btn--icone" data-acao="pergunta-excluir" data-id="${p.id}" aria-label="Remover a pergunta">${icone('lixo')}</button>
    </div>
  </div>`;
}

function htmlGrupo(g, i) {
  const aberto = !recolhidos.has(g.id);
  return html`<section class="grupo-q ${aberto ? 'aberto' : ''}" data-id="${g.id}">
    <header>
      <button type="button" class="alca alca-grupo" aria-label="Arrastar o grupo para reordenar">${icone('alca')}</button>
      <div class="grupo-campos">
        ${campoEd({ tabela: 'grupos', rid: g.id, nome: 'nome', rotulo: `Grupo ${i + 1}`, valor: g.nome, max: 120, obrigatorio: true })}
        ${campoEd({ tabela: 'grupos', rid: g.id, nome: 'nome_curto', rotulo: 'Rótulo no radar', valor: g.nome_curto, ajuda: 'Até 16 letras.', max: 16, obrigatorio: true })}
        ${campoEd({ tabela: 'grupos', rid: g.id, nome: 'peso', rotulo: 'Peso', valor: g.peso, tipo: 'numero' })}
        ${campoEd({ tabela: 'grupos', rid: g.id, nome: 'meta', rotulo: 'Meta', valor: g.meta, tipo: 'numero', ajuda: 'Nota-alvo, 0–10' })}
      </div>
      <div class="acoes-grupo">
        <span class="badge" data-pct-grupo="${g.id}"></span>
        <button type="button" class="btn btn--ghost btn--icone" data-acao="grupo-subir" data-id="${g.id}" aria-label="Subir o grupo">${icone('sobe')}</button>
        <button type="button" class="btn btn--ghost btn--icone" data-acao="grupo-descer" data-id="${g.id}" aria-label="Descer o grupo">${icone('desce')}</button>
        <button type="button" class="btn btn--ghost btn--icone" data-acao="grupo-excluir" data-id="${g.id}" aria-label="Remover o grupo">${icone('lixo')}</button>
        <button type="button" class="btn btn--ghost btn--icone" data-acao="grupo-recolher" data-id="${g.id}" aria-expanded="${String(aberto)}" aria-label="${aberto ? 'Recolher perguntas' : 'Mostrar perguntas'}">${icone('baixo', 'rotacao')}</button>
      </div>
    </header>
    <div class="corpo-grupo" ${aberto ? '' : html`hidden`}>
      <div class="lista-perguntas" data-grupo="${g.id}">${g.perguntas.map((p, j) => htmlPergunta(p, j, g.id))}</div>
      <div style="padding:.5rem;border-top:1px solid var(--color-border)"><button type="button" class="btn btn--ghost" data-acao="pergunta-adicionar" data-id="${g.id}">${icone('plus', 'icone--sm')}Adicionar pergunta</button></div>
    </div>
  </section>`;
}

function render() {
  const total = q.grupos.reduce((s, g) => s + g.perguntas.length, 0);
  main.innerHTML = String(html`<section class="pilha pilha--lg">
    <header class="pilha">
      <p class="migalha"><a href="questionarios.html">Questionários</a> ${icone('dir', 'icone--sm')} <span id="migalha-titulo">${q.titulo}</span></p>
      <div class="editor-topo">
        <div style="flex:1;min-width:260px">${campoEd({ tabela: 'questionarios', rid: q.id, nome: 'titulo', rotulo: 'Título do questionário', valor: q.titulo, max: 160, obrigatorio: true })}</div>
        <div class="linha">
          ${q.arquivado ? html`<span class="badge">Arquivado</span>` : ''}
          <a class="btn btn--sec" href="questionario-previa.html?id=${q.id}">${icone('olho', 'icone--sm')}Pré-visualizar</a>
          <button class="btn btn--sec" data-acao="arquivar">${icone('arquivo', 'icone--sm')}${q.arquivado ? 'Desarquivar' : 'Arquivar'}</button>
        </div>
      </div>
      ${campoEd({ tabela: 'questionarios', rid: q.id, nome: 'descricao', rotulo: 'Descrição (opcional)', valor: q.descricao, tipo: 'area', max: 500 })}
      <p class="muted" style="font-size:.875rem">${q.grupos.length} ${q.grupos.length === 1 ? 'grupo' : 'grupos'} · ${total} ${total === 1 ? 'pergunta' : 'perguntas'}. As alterações são salvas ao sair de cada campo.</p>
      ${uso ? html`<p class="aviso aviso--info">${icone('info')}<span>Este modelo já foi usado em ${uso} ${uso === 1 ? 'avaliação' : 'avaliações'}. Editar aqui não altera essas avaliações: cada uma guarda a própria cópia das perguntas.</span></p>` : ''}
    </header>
    ${q.grupos.length === 0 ? html`<p class="muted" style="padding:1.5rem 0">Este questionário ainda não tem grupos. Comece adicionando o primeiro tema (por exemplo, “Finanças”).</p>` : ''}
    <div class="pilha" id="grupos">${q.grupos.map(htmlGrupo)}</div>
    <button class="btn btn--sec" style="align-self:flex-start" data-acao="grupo-adicionar">${icone('plus')}Adicionar grupo</button>
    <p class="muted" style="font-size:.875rem">No celular, use os botões de subir e descer; no computador também dá para arrastar pela alça.</p>
  </section>`);
  atualizarPercentuais();
  iniciarOrdenacao();
}

/** Recalcula os % e a numeração sem redesenhar (preserva foco e cursor). */
function atualizarPercentuais() {
  const pctGrupos = percentuais(q.grupos.map((g) => g.peso));
  q.grupos.forEach((g, i) => {
    main.querySelector(`[data-pct-grupo="${g.id}"]`)?.replaceChildren(`${formatarPercentual(pctGrupos[i])} da nota`);
    main.querySelector(`label[for="g-${g.id}-nome"]`)?.replaceChildren(`Grupo ${i + 1}`);
    const pctPerguntas = percentuais(g.perguntas.map((p) => p.peso));
    g.perguntas.forEach((p, j) => {
      main.querySelector(`[data-pct-pergunta="${p.id}"]`)?.replaceChildren(`${formatarPercentual(pctPerguntas[j])} do grupo · ${formatarPercentual((pctPerguntas[j] * pctGrupos[i]) / 100)} da nota`);
      main.querySelector(`label[for="p-${p.id}-enunciado"]`)?.replaceChildren(`Pergunta ${j + 1}`);
    });
  });
}

const grupoDe = (gid) => q.grupos.find((g) => g.id === gid);
function achar(tabela, rid) {
  if (tabela === 'questionarios') return q;
  if (tabela === 'grupos') return grupoDe(rid);
  return q.grupos.flatMap((g) => g.perguntas).find((p) => p.id === rid);
}

async function salvarCampo(el) {
  const { tabela, id: rid, campo: nome, tipo } = el.dataset;
  const item = achar(tabela, rid);
  if (!item) return;
  const erroEl = main.querySelector(`#${el.id}-erro`);
  const falha = (msg) => {
    if (erroEl) {
      erroEl.textContent = msg;
      erroEl.hidden = !msg;
    }
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };

  let valor;
  if (el.type === 'checkbox') {
    valor = el.checked;
  } else {
    const bruto = el.value.trim();
    if (tipo === 'numero') {
      if (nome === 'meta' && bruto === '') valor = null;
      else {
        const n = Number(bruto.replace(',', '.'));
        const limite = nome === 'meta' ? 10 : 1000;
        if (!Number.isFinite(n) || (nome === 'meta' ? n < 0 : n <= 0) || n > limite) {
          el.value = String(item[nome] ?? '');
          return falha(nome === 'meta' ? 'Use uma nota de 0 a 10.' : 'Use um número maior que zero.');
        }
        valor = n;
      }
    } else if (el.required && !bruto) {
      el.value = item[nome] ?? '';
      return falha('Preencha este campo.');
    } else {
      valor = bruto === '' ? null : bruto;
    }
  }
  falha('');
  if (valor === (item[nome] ?? null)) return;

  const { error } = await supabase.from(tabela).update({ [nome]: valor }).eq('id', rid);
  if (error) {
    toast(mensagemDeErro(error, 'Não foi possível salvar a alteração.'), 'erro');
    if (el.type === 'checkbox') el.checked = Boolean(item[nome]);
    else el.value = item[nome] ?? '';
    return;
  }
  item[nome] = valor;
  if (nome === 'peso') atualizarPercentuais();
  if (tabela === 'questionarios' && nome === 'titulo') document.getElementById('migalha-titulo').textContent = valor;
}

async function persistirOrdem(tabela, ids) {
  const resultados = await Promise.all(ids.map((rid, i) => supabase.from(tabela).update({ ordem: i + 1 }).eq('id', rid)));
  const erro = resultados.find((r) => r.error)?.error;
  if (erro) {
    toast(mensagemDeErro(erro, 'Não foi possível salvar a nova ordem.'), 'erro');
    q = await carregar();
    render();
  }
}

/** Reordena o modelo local conforme a lista de ids e grava a ordem. */
async function aplicarOrdem(lista, ids, tabela) {
  const porId = new Map(lista.map((x) => [x.id, x]));
  const novos = ids.map((rid) => porId.get(rid)).filter(Boolean);
  novos.forEach((x, i) => (x.ordem = i + 1));
  lista.splice(0, lista.length, ...novos);
  await persistirOrdem(tabela, ids);
}

function iniciarOrdenacao() {
  if (!window.Sortable) return; // sem a biblioteca, os botões ↑↓ continuam funcionando
  const opcoes = { animation: 150, ghostClass: 'item-arrastando' };
  const listaGrupos = main.querySelector('#grupos');
  if (listaGrupos)
    new window.Sortable(listaGrupos, {
      ...opcoes,
      handle: '.alca-grupo',
      draggable: '.grupo-q',
      onEnd: async () => {
        await aplicarOrdem(q.grupos, [...listaGrupos.children].map((c) => c.dataset.id), 'grupos');
        atualizarPercentuais();
      },
    });
  main.querySelectorAll('.lista-perguntas').forEach((lista) =>
    new window.Sortable(lista, {
      ...opcoes,
      handle: '.alca-pergunta',
      draggable: '.pergunta-q',
      onEnd: async () => {
        const g = grupoDe(lista.dataset.grupo);
        await aplicarOrdem(g.perguntas, [...lista.children].map((c) => c.dataset.id), 'perguntas');
        atualizarPercentuais();
      },
    }),
  );
}

async function mover(lista, rid, direcao, tabela) {
  const ids = lista.map((x) => x.id);
  const de = ids.indexOf(rid);
  const para = de + direcao;
  if (de < 0 || para < 0 || para >= ids.length) return;
  [ids[de], ids[para]] = [ids[para], ids[de]];
  await aplicarOrdem(lista, ids, tabela);
  render();
  main.querySelector(`[data-acao][data-id="${rid}"]`)?.focus();
}

async function acao(botao) {
  const { acao: nome, id: rid } = botao.dataset;
  if (nome === 'grupo-recolher') {
    if (recolhidos.has(rid)) recolhidos.delete(rid);
    else recolhidos.add(rid);
    return render();
  }
  if (nome === 'arquivar') {
    const { error } = await supabase.from('questionarios').update({ arquivado: !q.arquivado }).eq('id', q.id);
    if (error) return toast(mensagemDeErro(error), 'erro');
    q.arquivado = !q.arquivado;
    return render();
  }
  if (nome === 'grupo-adicionar') {
    const ordem = q.grupos.reduce((m, g) => Math.max(m, g.ordem), 0) + 1;
    const { data, error } = await supabase.from('grupos').insert({ questionario_id: q.id, nome: 'Novo grupo', nome_curto: `Grupo ${ordem}`.slice(0, 16), peso: 1, ordem }).select().single();
    if (error) return toast(mensagemDeErro(error), 'erro');
    q.grupos.push({ ...data, perguntas: [] });
    return render();
  }
  if (nome === 'pergunta-adicionar') {
    const g = grupoDe(rid);
    const ordem = g.perguntas.reduce((m, p) => Math.max(m, p.ordem), 0) + 1;
    const { data, error } = await supabase.from('perguntas').insert({ grupo_id: g.id, enunciado: 'Nova pergunta', peso: 1, ordem }).select().single();
    if (error) return toast(mensagemDeErro(error), 'erro');
    g.perguntas.push(data);
    return render();
  }
  if (nome === 'grupo-subir' || nome === 'grupo-descer') return mover(q.grupos, rid, nome === 'grupo-subir' ? -1 : 1, 'grupos');
  if (nome.startsWith('pergunta-') && (nome.endsWith('subir') || nome.endsWith('descer'))) {
    const g = q.grupos.find((x) => x.perguntas.some((p) => p.id === rid));
    return mover(g.perguntas, rid, nome.endsWith('subir') ? -1 : 1, 'perguntas');
  }
  if (nome === 'grupo-excluir') {
    const g = grupoDe(rid);
    const sim = await confirmar({ titulo: 'Remover grupo', descricao: `O grupo e as ${g.perguntas.length} perguntas dele serão removidos do modelo. Avaliações já criadas não são afetadas.`, rotuloConfirmar: 'Remover' });
    if (!sim) return;
    const { error } = await supabase.from('grupos').delete().eq('id', rid);
    if (error) return toast(mensagemDeErro(error, 'Não foi possível remover.'), 'erro');
    q.grupos = q.grupos.filter((x) => x.id !== rid);
    return render();
  }
  if (nome === 'pergunta-excluir') {
    const sim = await confirmar({ titulo: 'Remover pergunta', descricao: 'A pergunta será removida do modelo. Avaliações já criadas não são afetadas.', rotuloConfirmar: 'Remover' });
    if (!sim) return;
    const { error } = await supabase.from('perguntas').delete().eq('id', rid);
    if (error) return toast(mensagemDeErro(error, 'Não foi possível remover.'), 'erro');
    q.grupos.forEach((g) => (g.perguntas = g.perguntas.filter((p) => p.id !== rid)));
    render();
  }
}

main.addEventListener('focusout', (e) => {
  if (e.target.matches('[data-campo]:not([type=checkbox])')) void salvarCampo(e.target);
});
main.addEventListener('change', (e) => {
  if (e.target.matches('input[type=checkbox][data-campo]')) void salvarCampo(e.target);
});
main.addEventListener('click', (e) => {
  const botao = e.target.closest('[data-acao]');
  if (botao) void acao(botao);
});

try {
  q = await carregar();
  if (!q) throw new Error('não encontrado');
  const { count } = await supabase.from('avaliacoes').select('id', { count: 'exact', head: true }).eq('questionario_origem_id', id);
  uso = count ?? 0;
  render();
} catch {
  main.innerHTML = String(html`<p class="erro-geral" role="alert">Questionário não encontrado. <a class="link" href="questionarios.html">Voltar para a lista</a></p>`);
}
