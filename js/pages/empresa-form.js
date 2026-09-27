import { html, raw } from '../html.js';
import { icone } from '../icones.js';
import { iniciarPagina } from '../shell.js';
import { supabase } from '../supabase.js';
import { campo, ligarMascaras, mostrarErros, valoresDoForm, vazioParaNulo } from '../forms.js';
import { toast } from '../ui.js';
import { cnpjValido, limparCnpj, mascararCnpj } from '../lib/cnpj.js';
import { PORTES, UFS, emailValido, mascararTelefone, somenteDigitos, telefoneValido } from '../lib/mascaras.js';
import { mensagemDeErro } from '../lib/erros.js';

const { main } = await iniciarPagina({ ativo: 'empresas' });
const id = new URLSearchParams(location.search).get('id');

let e = {};
if (id) {
  const { data, error } = await supabase.from('empresas').select('*').eq('id', id).maybeSingle();
  if (error || !data) {
    main.innerHTML = String(html`<p class="erro-geral" role="alert">Empresa não encontrada. <a class="link" href="empresas.html">Voltar para a lista</a></p>`);
    throw new Error('empresa não encontrada');
  }
  e = data;
}

const IDS = ['razao_social', 'nome_fantasia', 'cnpj', 'segmento', 'porte', 'municipio', 'uf', 'responsavel_nome', 'responsavel_cargo', 'responsavel_email', 'responsavel_telefone', 'observacoes'];
const texto = (idc, rotulo, valor, extra = '', classe = '') => campo({ id: idc, rotulo, classe, controle: html`<input class="input" id="${idc}" value="${valor ?? ''}" ${raw(extra)}>` });

main.innerHTML = String(html`<section class="pilha pilha--lg">
  <header>
    <p class="migalha"><a href="empresas.html">Empresas</a> ${icone('dir', 'icone--sm')} ${id ? 'Editar' : 'Nova empresa'}</p>
    <h1>${id ? 'Editar empresa' : 'Nova empresa'}</h1>
  </header>
  <form id="form" class="pilha pilha--lg leitura" novalidate>
    <fieldset class="pilha"><legend><h2>Dados da empresa</h2></legend>
      <div class="form-grade">
        ${texto('razao_social', 'Razão social', e.razao_social, 'autocomplete="organization" maxlength="200"', 'cheio')}
        ${texto('nome_fantasia', 'Nome fantasia', e.nome_fantasia, 'maxlength="200"')}
        ${campo({ id: 'cnpj', rotulo: 'CNPJ', ajuda: 'Aceita o formato numérico e o alfanumérico.', controle: html`<input class="input num" id="cnpj" data-mascara="cnpj" autocapitalize="characters" value="${mascararCnpj(e.cnpj ?? '')}">` })}
        ${texto('segmento', 'Segmento', e.segmento, 'maxlength="120" placeholder="Ex.: Indústria metalmecânica"')}
        ${campo({ id: 'porte', rotulo: 'Porte', controle: html`<select class="select" id="porte"><option value="">Não informado</option>${PORTES.map((p) => html`<option ${e.porte === p ? 'selected' : ''}>${p}</option>`)}</select>` })}
        ${texto('municipio', 'Município', e.municipio, 'maxlength="120"')}
        ${campo({ id: 'uf', rotulo: 'UF', controle: html`<select class="select" id="uf"><option value="">—</option>${UFS.map((u) => html`<option ${e.uf === u ? 'selected' : ''}>${u}</option>`)}</select>` })}
      </div>
    </fieldset>
    <fieldset class="pilha"><legend><h2>Responsável</h2></legend>
      <div class="form-grade">
        ${texto('responsavel_nome', 'Nome', e.responsavel_nome, 'maxlength="120"')}
        ${texto('responsavel_cargo', 'Cargo', e.responsavel_cargo, 'maxlength="120"')}
        ${campo({ id: 'responsavel_email', rotulo: 'E-mail', controle: html`<input class="input" id="responsavel_email" type="email" inputmode="email" value="${e.responsavel_email ?? ''}">` })}
        ${campo({ id: 'responsavel_telefone', rotulo: 'Telefone', controle: html`<input class="input num" id="responsavel_telefone" type="tel" inputmode="tel" data-mascara="telefone" value="${mascararTelefone(e.responsavel_telefone ?? '')}">` })}
        ${campo({ id: 'observacoes', rotulo: 'Observações', classe: 'cheio', controle: html`<textarea class="textarea" id="observacoes" maxlength="2000">${e.observacoes ?? ''}</textarea>` })}
      </div>
    </fieldset>
    <label class="checagem"><input type="checkbox" id="ativo" ${e.ativo === false ? '' : 'checked'}>Empresa ativa</label>
    <div class="linha"><button class="btn" type="submit">Salvar empresa</button><a class="btn btn--ghost" href="${id ? `empresa.html?id=${id}` : 'empresas.html'}">Cancelar</a></div>
  </form>
</section>`);

const form = document.getElementById('form');
ligarMascaras(form);

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const v = valoresDoForm(form);
  const erros = {};
  if (v.razao_social.length < 2) erros.razao_social = 'Informe a razão social.';
  if (!cnpjValido(v.cnpj)) erros.cnpj = 'CNPJ inválido. Confira os 14 caracteres e os dois dígitos finais.';
  if (v.responsavel_email && !emailValido(v.responsavel_email)) erros.responsavel_email = 'Informe um e-mail válido, como nome@empresa.com.br.';
  if (!telefoneValido(v.responsavel_telefone)) erros.responsavel_telefone = 'O telefone está incompleto. Use DDD e 8 ou 9 dígitos, como (54) 99999-0000.';
  mostrarErros(form, erros, IDS);
  if (Object.keys(erros).length) return;

  const dados = {
    razao_social: v.razao_social,
    nome_fantasia: vazioParaNulo(v.nome_fantasia),
    cnpj: limparCnpj(v.cnpj),
    segmento: vazioParaNulo(v.segmento),
    porte: vazioParaNulo(v.porte),
    municipio: vazioParaNulo(v.municipio),
    uf: vazioParaNulo(v.uf),
    responsavel_nome: vazioParaNulo(v.responsavel_nome),
    responsavel_cargo: vazioParaNulo(v.responsavel_cargo),
    responsavel_email: vazioParaNulo(v.responsavel_email),
    responsavel_telefone: vazioParaNulo(somenteDigitos(v.responsavel_telefone)),
    observacoes: vazioParaNulo(v.observacoes),
    ativo: v.ativo,
  };
  const botao = form.querySelector('button[type=submit]');
  botao.disabled = true;
  botao.textContent = 'Salvando…';
  const consulta = id ? supabase.from('empresas').update(dados).eq('id', id).select().single() : supabase.from('empresas').insert(dados).select().single();
  const { data, error } = await consulta;
  if (error) {
    botao.disabled = false;
    botao.textContent = 'Salvar empresa';
    if (error.code === '23505') mostrarErros(form, { cnpj: 'Já existe uma empresa com esse CNPJ.' }, IDS);
    else toast(mensagemDeErro(error, 'Não foi possível salvar a empresa.'), 'erro');
    return;
  }
  location.href = `empresa.html?id=${data.id}`;
});
