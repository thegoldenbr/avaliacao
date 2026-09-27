import { html } from '../html.js';
import { icone } from '../icones.js';
import { iniciarPagina } from '../shell.js';
import { supabase } from '../supabase.js';
import { confirmar, toast } from '../ui.js';
import { mascararCnpj } from '../lib/cnpj.js';
import { formatarData } from '../lib/formatacao.js';
import { mascararTelefone } from '../lib/mascaras.js';
import { ROTULO_STATUS, TOM_STATUS } from '../lib/status.js';
import { mensagemDeErro } from '../lib/erros.js';

const { main, perfil } = await iniciarPagina({ ativo: 'empresas' });
const id = new URLSearchParams(location.search).get('id');

const [{ data: e, error }, { data: avaliacoes }] = await Promise.all([
  supabase.from('empresas').select('*').eq('id', id ?? '').maybeSingle(),
  supabase.from('avaliacoes').select('id, titulo, periodo_referencia, status, criado_em').eq('empresa_id', id ?? '').order('criado_em', { ascending: false }),
]);

if (error || !e) {
  main.innerHTML = String(html`<p class="erro-geral" role="alert">Empresa não encontrada. <a class="link" href="empresas.html">Voltar para a lista</a></p>`);
  throw new Error('empresa não encontrada');
}

const nome = e.nome_fantasia ?? e.razao_social;
const dado = (rotulo, valor) => html`<div><dt>${rotulo}</dt><dd>${valor || '—'}</dd></div>`;

main.innerHTML = String(html`<section class="pilha pilha--lg">
  <header class="pilha">
    <p class="migalha"><a href="empresas.html">Empresas</a> ${icone('dir', 'icone--sm')} ${nome}</p>
    <div class="pagina-topo" style="margin-bottom:0">
      <div><h1>${nome}</h1><p class="muted num">${e.razao_social} · ${mascararCnpj(e.cnpj)}</p></div>
      <div class="linha">${e.ativo ? '' : html`<span class="badge">Inativa</span>`}<a class="btn btn--sec" href="empresa-form.html?id=${e.id}">${icone('editar', 'icone--sm')}Editar</a></div>
    </div>
  </header>
  <dl class="dl-grade">
    ${dado('Segmento', e.segmento)}${dado('Porte', e.porte)}${dado('Local', e.municipio ? `${e.municipio}/${e.uf ?? ''}` : e.uf)}
    ${dado('Responsável', e.responsavel_nome)}${dado('Cargo', e.responsavel_cargo)}${dado('E-mail', e.responsavel_email)}
    ${dado('Telefone', e.responsavel_telefone ? mascararTelefone(e.responsavel_telefone) : '')}
    <div style="grid-column: span 2">${dado('Observações', e.observacoes)}</div>
  </dl>
  <section aria-labelledby="hist"><h2 id="hist" style="margin-bottom:.75rem">Avaliações</h2>
    ${!avaliacoes || avaliacoes.length === 0
      ? html`<p class="muted">Nenhuma avaliação para esta empresa ainda.</p>`
      : html`<ul class="linhas">${avaliacoes.map((a) => html`<li class="linha linha--entre"><div><a href="avaliacao.html?id=${a.id}" style="color:inherit;font-weight:600">${a.titulo}</a><p class="muted" style="font-size:.875rem">${a.periodo_referencia ? `${a.periodo_referencia} · ` : ''}criada em ${formatarData(a.criado_em)}</p></div><span class="badge ${TOM_STATUS[a.status] ?? ''}">${ROTULO_STATUS[a.status] ?? a.status}</span></li>`)}</ul>`}
  </section>
  ${perfil.papel === 'admin'
    ? html`<section aria-labelledby="risco" class="pilha pilha--sm leitura" style="border-top:1px solid var(--color-border);padding-top:1.5rem">
        <h2 id="risco">Excluir empresa</h2><p class="muted">Apaga a empresa com todas as avaliações, respostas e relatórios dela. Não dá para desfazer.</p>
        <button class="btn btn--perigo" id="btn-excluir" style="align-self:flex-start">${icone('lixo', 'icone--sm')}Excluir empresa</button></section>`
    : ''}
</section>`);

document.getElementById('btn-excluir')?.addEventListener('click', async () => {
  const sim = await confirmar({
    titulo: 'Excluir empresa e todos os dados',
    descricao: `Isso apaga ${nome} com todas as avaliações, respostas e relatórios. Não dá para desfazer.`,
    textoParaDigitar: nome,
    rotuloConfirmar: 'Excluir definitivamente',
  });
  if (!sim) return;
  const { error: erroExclusao } = await supabase.from('empresas').delete().eq('id', e.id);
  if (erroExclusao) return toast(mensagemDeErro(erroExclusao, 'Não foi possível excluir a empresa.'), 'erro');
  location.replace('empresas.html');
});
