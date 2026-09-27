/** Formulários das Configurações: marca, textos/escala e faixas de classificação. */
import { html } from '../html.js';
import { campo, mostrarErro, mostrarErros } from '../forms.js';
import { supabase } from '../supabase.js';
import { toast } from '../ui.js';
import { formatarNota } from '../lib/formatacao.js';
import { limitesValidos, lerFaixas, montarFaixas } from '../lib/faixas.js';
import { mensagemDeErro } from '../lib/erros.js';
import { aplicarCor, carregarMarca } from '../marca.js';

/** Grava e confirma que alguma linha mudou (a RLS não devolve erro quando o usuário não é admin). */
async function salvarConfig(patch) {
  const { data, error } = await supabase.from('configuracoes').update(patch).eq('id', true).select();
  if (error) throw error;
  if (!data?.length) throw { code: '42501' };
  sessionStorage.removeItem('marca-cache');
  await carregarMarca();
}

export function formMarca(raiz, config) {
  raiz.innerHTML = String(html`<form class="pilha pilha--lg" id="form" novalidate>
    <div class="form-grade">
      ${campo({ id: 'nome_empresa', rotulo: 'Nome da empresa', controle: html`<input class="input" id="nome_empresa" maxlength="120" value="${config.nome_empresa}">` })}
      ${campo({ id: 'cor_destaque', rotulo: 'Cor de destaque', ajuda: 'O sistema ajusta a cor nos temas claro e escuro para manter o contraste de leitura.', controle: html`<div class="linha"><input type="color" class="cor-input" id="cor-seletor" aria-label="Escolher cor" value="${config.cor_destaque.toLowerCase()}"><input class="input num" id="cor_destaque" style="max-width:10rem" value="${config.cor_destaque}"></div>` })}
      ${campo({ classe: 'cheio', id: 'logo', rotulo: 'Logo', ajuda: 'PNG, JPG, SVG ou WebP, até 1 MB. Aparece no login, no formulário e no relatório.', controle: html`<div class="linha"><input class="input" id="logo" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style="padding-block:.5rem;max-width:28rem">${config.logo_url ? html`<img class="logo-atual" src="${config.logo_url}" alt="Logo atual">` : ''}</div>` })}
    </div>
    <button class="btn" style="align-self:flex-start" type="submit">Salvar marca</button>
  </form>`);
  const form = raiz.querySelector('#form');
  const seletor = form.querySelector('#cor-seletor');
  const hex = form.querySelector('#cor_destaque');
  seletor.addEventListener('input', () => {
    hex.value = seletor.value.toUpperCase();
    aplicarCor({ cor_destaque: hex.value });
  });
  hex.addEventListener('input', () => {
    if (/^#[0-9a-f]{6}$/i.test(hex.value)) {
      seletor.value = hex.value.toLowerCase();
      aplicarCor({ cor_destaque: hex.value });
    }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const erros = {};
    if (form.nome_empresa.value.trim().length < 2) erros.nome_empresa = 'Informe o nome da empresa.';
    if (!/^#[0-9a-f]{6}$/i.test(hex.value)) erros.cor_destaque = 'Use uma cor no formato #2B4ACB.';
    const arquivo = form.logo.files[0];
    if (arquivo && arquivo.size > 1_048_576) erros.logo = 'A imagem passa de 1 MB. Reduza o tamanho e tente de novo.';
    mostrarErros(form, erros, ['nome_empresa', 'logo', 'cor_destaque']);
    if (Object.keys(erros).length) return;
    const botao = form.querySelector('button[type=submit]');
    botao.disabled = true;
    try {
      const patch = { nome_empresa: form.nome_empresa.value.trim(), cor_destaque: hex.value.toUpperCase() };
      if (arquivo) {
        const extensao = (arquivo.name.split('.').pop() ?? 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
        const caminho = `logo-${Date.now()}.${extensao}`;
        const { error } = await supabase.storage.from('marca').upload(caminho, arquivo, { cacheControl: '3600' });
        if (error) throw error;
        patch.logo_url = supabase.storage.from('marca').getPublicUrl(caminho).data.publicUrl;
      }
      await salvarConfig(patch);
      toast('Marca salva.');
      config.logo_url = patch.logo_url ?? config.logo_url;
      formMarca(raiz, { ...config, ...patch });
    } catch (erro) {
      toast(mensagemDeErro(erro, 'Não foi possível salvar a marca.'), 'erro');
      botao.disabled = false;
    }
  });
}

export function formTextos(raiz, config) {
  const area = (id, rotulo, valor, ajuda) => campo({ id, rotulo, ajuda, controle: html`<textarea class="textarea" id="${id}" maxlength="2000">${valor}</textarea>` });
  raiz.innerHTML = String(html`<form class="pilha pilha--lg" id="form" novalidate>
    ${area('texto_apresentacao', 'Apresentação do formulário', config.texto_apresentacao, 'Usada quando a avaliação não tem mensagem própria.')}
    ${area('texto_privacidade', 'Aviso de privacidade', config.texto_privacidade, 'Aparece na abertura do formulário (LGPD).')}
    ${campo({ id: 'texto_rodape', rotulo: 'Rodapé do relatório', controle: html`<input class="input" id="texto_rodape" maxlength="300" value="${config.texto_rodape}">` })}
    <div class="form-grade">
      ${campo({ id: 'rotulo_escala_min', rotulo: 'Rótulo padrão do 0', controle: html`<input class="input" id="rotulo_escala_min" maxlength="60" value="${config.rotulo_escala_min}">` })}
      ${campo({ id: 'rotulo_escala_max', rotulo: 'Rótulo padrão do 10', controle: html`<input class="input" id="rotulo_escala_max" maxlength="60" value="${config.rotulo_escala_max}">` })}
    </div>
    <button class="btn" style="align-self:flex-start" type="submit">Salvar textos</button>
  </form>`);
  const form = raiz.querySelector('#form');
  const ids = ['texto_apresentacao', 'texto_privacidade', 'texto_rodape', 'rotulo_escala_min', 'rotulo_escala_max'];
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const erros = {};
    for (const id of ids) if (!form[id].value.trim()) erros[id] = 'Preencha este campo.';
    mostrarErros(form, erros, ids);
    if (Object.keys(erros).length) return;
    const botao = form.querySelector('button[type=submit]');
    botao.disabled = true;
    try {
      await salvarConfig(Object.fromEntries(ids.map((id) => [id, form[id].value.trim()])));
      toast('Textos salvos.');
    } catch (erro) {
      toast(mensagemDeErro(erro, 'Não foi possível salvar os textos.'), 'erro');
    }
    botao.disabled = false;
  });
}

export function formFaixas(raiz, config) {
  const atuais = lerFaixas(config.faixas);
  const rotulos = ['Atenção a partir de', 'Bom a partir de', 'Excelente a partir de'];
  raiz.innerHTML = String(html`<div class="pilha pilha--lg leitura">
    <p class="muted">A nota já arredondada (uma casa decimal) define a faixa, para o rótulo nunca contradizer o número exibido.</p>
    <div class="grade-3">${rotulos.map((r, i) => campo({ id: `limite-${i}`, rotulo: r, controle: html`<input class="input num" id="limite-${i}" inputmode="decimal" value="${atuais[i + 1].de}">` }))}</div>
    <ul id="previa"></ul>
    <button class="btn" style="align-self:flex-start" id="salvar">Salvar faixas</button>
  </div>`);
  const ler = () => [0, 1, 2].map((i) => Number(raiz.querySelector(`#limite-${i}`).value.replace(',', '.')));
  const cores = { critico: 'faixa--critico', atencao: 'faixa--atencao', bom: 'faixa--bom', excelente: 'faixa--excelente' };

  function previa() {
    const limites = ler();
    const valido = limitesValidos(limites);
    mostrarErro(raiz, 'limite-0', valido ? '' : 'Use limites crescentes entre 0,1 e 10.');
    raiz.querySelector('#salvar').disabled = !valido;
    const faixas = valido ? montarFaixas(atuais, limites) : atuais;
    raiz.querySelector('#previa').innerHTML = String(html`${faixas.map((f) => html`<li class="resultado-faixa ${cores[f.id]}" style="color:var(--cor-faixa)"><span>${f.rotulo}</span><span class="num">${formatarNota(f.de)} a ${formatarNota(f.ate)}</span></li>`)}`);
  }
  raiz.addEventListener('input', previa);
  raiz.querySelector('#salvar').addEventListener('click', async (e) => {
    const limites = ler();
    if (!limitesValidos(limites)) return;
    e.currentTarget.disabled = true;
    try {
      await salvarConfig({ faixas: montarFaixas(atuais, limites) });
      toast('Faixas salvas.');
    } catch (erro) {
      toast(mensagemDeErro(erro, 'Não foi possível salvar as faixas.'), 'erro');
    }
    e.currentTarget.disabled = false;
  });
  previa();
}
