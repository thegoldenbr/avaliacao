/** Passo 3: ajustes nas perguntas desta avaliação (cópia do modelo; só editável enquanto for rascunho). */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { campo } from '../forms.js';
import { supabase } from '../supabase.js';
import { confirmar, toast } from '../ui.js';
import { mensagemDeErro } from '../lib/erros.js';
import { formatarPercentual, percentuais } from '../lib/pesos.js';

export function totalDePerguntas(av) {
  return av.avaliacao_grupos.reduce((s, g) => s + g.avaliacao_perguntas.length, 0);
}

export function montarAjustes(raiz, av, aoMudar) {
  const ordenar = (l) => [...l].sort((a, b) => a.ordem - b.ordem);
  const grupos = () => ordenar(av.avaliacao_grupos);

  function campoEd({ tabela, rid, nome, rotulo, valor, numero = false, area = false, classe = '' }) {
    const cid = `${tabela === 'avaliacao_grupos' ? 'ag' : 'ap'}-${rid}-${nome}`;
    const dat = html`data-tabela="${tabela}" data-id="${rid}" data-campo="${nome}" data-numero="${numero}"`;
    const controle = numero
      ? html`<input class="input num" id="${cid}" type="number" step="any" min="0" value="${valor}" ${dat}>`
      : area
        ? html`<textarea class="textarea" id="${cid}" style="min-height:4rem" maxlength="500" required ${dat}>${valor}</textarea>`
        : html`<input class="input" id="${cid}" maxlength="120" required value="${valor}" ${dat}>`;
    return campo({ id: cid, rotulo, classe, controle });
  }

  function desenhar() {
    const pg = percentuais(grupos().map((g) => g.peso));
    raiz.innerHTML = String(html`<div class="pilha pilha--lg">
      <p class="muted">${totalDePerguntas(av)} perguntas em ${av.avaliacao_grupos.length} grupos. Edite textos e pesos ou remova o que não se aplica a esta empresa. Isso não altera o modelo original.</p>
      ${grupos().map((g, i) => {
        const pp = percentuais(ordenar(g.avaliacao_perguntas).map((p) => p.peso));
        return html`<section class="grupo-q"><header style="align-items:flex-start;padding:.75rem">
          <div class="grupo-campos" style="grid-template-columns:2fr 1fr 90px">
            ${campoEd({ tabela: 'avaliacao_grupos', rid: g.id, nome: 'nome', rotulo: `Grupo ${i + 1}`, valor: g.nome })}
            ${campoEd({ tabela: 'avaliacao_grupos', rid: g.id, nome: 'nome_curto', rotulo: 'Rótulo no radar', valor: g.nome_curto })}
            ${campoEd({ tabela: 'avaliacao_grupos', rid: g.id, nome: 'peso', rotulo: 'Peso', valor: g.peso, numero: true })}
          </div>
          <div class="acoes-grupo"><span class="badge">${formatarPercentual(pg[i] ?? 0)} da nota</span><button type="button" class="btn btn--ghost btn--icone" data-excluir-grupo="${g.id}" aria-label="Remover o grupo ${i + 1}">${icone('lixo')}</button></div>
        </header>
        ${ordenar(g.avaliacao_perguntas).map((p, j) => html`<div class="pergunta-q"><div class="conteudo">
          ${campoEd({ tabela: 'avaliacao_perguntas', rid: p.id, nome: 'enunciado', rotulo: `Pergunta ${j + 1}`, valor: p.enunciado, area: true })}
          <div class="opcoes-linha">
            ${campoEd({ tabela: 'avaliacao_perguntas', rid: p.id, nome: 'peso', rotulo: 'Peso', valor: p.peso, numero: true })}
            <p class="peso-rel" style="padding-bottom:.75rem">${formatarPercentual(pp[j] ?? 0)} do grupo</p>
            <label class="checagem checagem--linha"><input type="checkbox" data-tabela="avaliacao_perguntas" data-id="${p.id}" data-campo="escala_invertida" ${p.escala_invertida ? html`checked` : ''}>Escala invertida</label>
          </div></div>
          <div class="acoes"><button type="button" class="btn btn--ghost btn--icone" data-excluir-pergunta="${p.id}" aria-label="Remover a pergunta ${j + 1}">${icone('lixo')}</button></div></div>`)}
        </section>`;
      })}
    </div>`);
  }

  const achar = (tabela, rid) =>
    tabela === 'avaliacao_grupos' ? av.avaliacao_grupos.find((g) => g.id === rid) : av.avaliacao_grupos.flatMap((g) => g.avaliacao_perguntas).find((p) => p.id === rid);

  async function salvar(el) {
    const { tabela, id, campo: nome } = el.dataset;
    const item = achar(tabela, id);
    if (!item) return;
    let valor;
    if (el.type === 'checkbox') valor = el.checked;
    else if (el.dataset.numero === 'true') {
      valor = Number(el.value.replace(',', '.'));
      if (!Number.isFinite(valor) || valor <= 0 || valor > 1000) {
        el.value = item[nome];
        return toast('Use um número maior que zero no peso.', 'erro');
      }
    } else {
      valor = el.value.trim();
      if (!valor) {
        el.value = item[nome];
        return toast('Preencha este campo.', 'erro');
      }
    }
    if (valor === item[nome]) return;
    const { error } = await supabase.from(tabela).update({ [nome]: valor }).eq('id', id);
    if (error) {
      toast(mensagemDeErro(error, 'Não foi possível salvar a alteração.'), 'erro');
      if (el.type === 'checkbox') el.checked = item[nome];
      else el.value = item[nome];
      return;
    }
    item[nome] = valor;
    if (nome === 'peso') desenhar();
  }

  raiz.addEventListener('focusout', (e) => {
    if (e.target.matches('[data-campo]:not([type=checkbox])')) void salvar(e.target);
  });
  raiz.addEventListener('change', (e) => {
    if (e.target.matches('input[type=checkbox][data-campo]')) void salvar(e.target);
  });
  raiz.addEventListener('click', async (e) => {
    const g = e.target.closest('[data-excluir-grupo]')?.dataset.excluirGrupo;
    const p = e.target.closest('[data-excluir-pergunta]')?.dataset.excluirPergunta;
    if (!g && !p) return;
    if (!(await confirmar({ titulo: g ? 'Remover grupo' : 'Remover pergunta', descricao: g ? 'O grupo e as perguntas dele saem desta avaliação (o modelo não muda).' : 'A pergunta sai desta avaliação (o modelo não muda).', rotuloConfirmar: 'Remover' }))) return;
    const { error } = await supabase.from(g ? 'avaliacao_grupos' : 'avaliacao_perguntas').delete().eq('id', g ?? p);
    if (error) return toast(mensagemDeErro(error, 'Não foi possível remover.'), 'erro');
    if (g) av.avaliacao_grupos = av.avaliacao_grupos.filter((x) => x.id !== g);
    else av.avaliacao_grupos.forEach((x) => (x.avaliacao_perguntas = x.avaliacao_perguntas.filter((y) => y.id !== p)));
    desenhar();
    aoMudar?.();
  });
  desenhar();
}
