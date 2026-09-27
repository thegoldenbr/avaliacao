/** Dashboard do cliente (sem login): relatorio.html#TOKEN. Mostra só o snapshot publicado, lido por RPC. */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { supabase } from '../supabase.js';
import { aplicarTema } from '../tema.js';
import { aplicarCor } from '../marca.js';
import { renderRelatorio } from '../relatorio-vista.js';
import { baixarDataUrl, svgParaPng } from '../radar-export.js';
import { nomeDeArquivo } from '../lib/csv.js';
import { campo, mostrarErros } from '../forms.js';
import { toast } from '../ui.js';

aplicarTema();
const raiz = document.getElementById('conteudo');
const token = decodeURIComponent(location.hash.slice(1)).split('/').filter(Boolean).pop() ?? '';
const CHAVE_SENHA = `rel-senha:${token.slice(0, 16)}`;

const lerSenha = () => {
  try {
    return sessionStorage.getItem(CHAVE_SENHA);
  } catch {
    return null;
  }
};
const guardarSenha = (v) => {
  try {
    if (v) sessionStorage.setItem(CHAVE_SENHA, v);
    else sessionStorage.removeItem(CHAVE_SENHA);
  } catch {
    // sem armazenamento: pede a senha de novo ao recarregar
  }
};

/** O snapshot publicado precisa ter o formato atual; relatórios antigos/de exemplo pedem nova publicação. */
const snapshotValido = (c) => Boolean(c && c.versao === 1 && c.geral && Array.isArray(c.grupos) && Array.isArray(c.faixas) && c.opcoes);

function pedirSenha(marca, { erro = '', bloqueado = false } = {}) {
  raiz.innerHTML = String(html`<div class="rel"><header>${cabecalho(marca)}</header>
    <div class="pilha" style="max-width:420px"><span class="faixa faixa--bom">${icone('cadeado', 'icone--lg')}</span><h1>Relatório protegido</h1>
    ${bloqueado
      ? html`<p class="erro-geral" role="alert">Muitas tentativas incorretas. Aguarde 10 minutos e tente de novo.</p>`
      : html`<p class="leitura">Digite a senha de 6 dígitos que você recebeu junto com o link.</p>
        <form class="pilha" id="form-senha" novalidate>
          ${campo({ id: 'senha', rotulo: 'Senha', controle: html`<input class="input num" id="senha" type="password" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]*">` })}
          ${erro ? html`<p class="erro-geral" role="alert">${erro}</p>` : ''}
          <button class="btn" type="submit">Abrir relatório</button></form>`}
    </div></div>`);
  const form = document.getElementById('form-senha');
  if (!form) return;
  form.senha.focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const digitada = form.senha.value.trim();
    if (!/^[0-9]{6}$/.test(digitada)) return mostrarErros(form, { senha: 'A senha tem 6 dígitos.' }, ['senha']);
    void carregar(digitada);
  });
}

function cabecalho(marca, acoes = '') {
  const logo = marca?.logo_url
    ? html`<img src="${marca.logo_url}" alt="" class="marca-logo" style="object-fit:contain;background:none">`
    : html`<span class="marca-logo" aria-hidden="true">${(marca?.nome ?? 'R').charAt(0).toUpperCase()}</span>`;
  return html`<div class="linha linha--entre"><span class="marca">${logo}<span>${marca?.nome ?? 'Radar de Desempenho'}</span></span>${acoes}</div>`;
}

function aviso(marca, { icon, cor, titulo, texto }) {
  raiz.innerHTML = String(html`<div class="rel"><header>${cabecalho(marca)}</header>
    <div class="pilha"><span class="faixa ${cor}">${icone(icon, 'icone--lg')}</span><h1>${titulo}</h1><p class="leitura">${texto}</p></div></div>`);
}

async function carregar(senhaDigitada = null) {
  raiz.innerHTML = String(html`<div class="rel"><div class="carregando" aria-busy="true"><div class="skeleton sk-titulo"></div><div class="skeleton sk-bloco"></div></div></div>`);
  const senha = senhaDigitada ?? lerSenha();
  const { data, error } = await supabase.rpc('obter_relatorio', senha ? { p_token: token, p_senha: senha } : { p_token: token });
  if (error) {
    raiz.innerHTML = String(html`<div class="rel"><h1>Sem conexão</h1><p class="muted">Não conseguimos abrir o relatório agora. Verifique sua internet.</p><button class="btn" id="tentar" style="align-self:flex-start">Tentar de novo</button></div>`);
    document.getElementById('tentar').addEventListener('click', () => void carregar());
    return;
  }
  if (!data) return aviso(null, { icon: 'aviso', cor: 'faixa--atencao', titulo: 'Link inválido', texto: 'Não encontramos este relatório. Confira se o endereço está completo ou peça um novo link a quem enviou.' });
  aplicarCor(data.marca);
  if (data.protegido) {
    if (data.bloqueado) return pedirSenha(data.marca, { bloqueado: true });
    if (data.erro) {
      guardarSenha(null);
      return pedirSenha(data.marca, { erro: senhaDigitada ? 'Senha incorreta. Confira e tente de novo.' : 'A senha mudou. Digite a nova senha.' });
    }
    return pedirSenha(data.marca);
  }
  if (senha) guardarSenha(senha);
  if (!data.disponivel) return aviso(data.marca, { icon: 'aviso', cor: 'faixa--atencao', titulo: 'Relatório indisponível', texto: 'Este relatório não está disponível no momento. Fale com quem enviou o link.' });

  if (!snapshotValido(data.conteudo)) {
    return aviso(data.marca, { icon: 'aviso', cor: 'faixa--atencao', titulo: 'Relatório em atualização', texto: 'O conteúdo deste relatório precisa ser publicado novamente. Fale com quem enviou o link.' });
  }
  const snapshot = { ...data.conteudo, publicado_em: data.publicado_em ?? data.conteudo.publicado_em };
  document.title = `${data.empresa} — Relatório de desempenho`;
  let corpo;
  try {
    corpo = renderRelatorio(snapshot, { animar: true });
  } catch {
    return aviso(data.marca, { icon: 'aviso', cor: 'faixa--atencao', titulo: 'Não foi possível exibir o relatório', texto: 'Houve um problema ao montar este relatório. Fale com quem enviou o link.' });
  }
  raiz.innerHTML = String(html`<div class="rel">
    <header>${cabecalho(data.marca, html`<div class="linha"><button class="btn btn--sec btn--sm" id="btn-png">${icone('imagem', 'icone--sm')}Radar (PNG)</button><button class="btn btn--sec btn--sm" id="btn-pdf">${icone('baixar', 'icone--sm')}Baixar PDF</button></div>`)}</header>
    ${corpo}
    <footer class="muted"><hr class="divisor" style="margin-bottom:1rem">${data.rodape}</footer></div>`);

  const nomeBase = nomeDeArquivo(`${snapshot.empresa}-${snapshot.titulo}`);
  document.getElementById('btn-pdf').addEventListener('click', async (e) => {
    const botao = e.currentTarget;
    const original = botao.innerHTML;
    botao.disabled = true;
    botao.textContent = 'Gerando PDF…';
    try {
      const { gerarPdf } = await import('../pdf.js'); // carregado só quando pedido
      const doc = await gerarPdf(snapshot, { marca: data.marca, rodape: data.rodape });
      doc.save(`${nomeBase}.pdf`);
    } catch (erro) {
      toast(erro.message || 'Não foi possível gerar o PDF. Tente de novo.', 'erro');
    }
    botao.disabled = false;
    botao.innerHTML = original;
  });
  document.getElementById('btn-png').addEventListener('click', async () => {
    try {
      const { radarDoSnapshot } = await import('../pdf.js');
      const png = await svgParaPng(radarDoSnapshot(snapshot), 3);
      baixarDataUrl(png.dataUrl, `${nomeBase}-radar.png`);
    } catch {
      toast('Não foi possível gerar a imagem do radar.', 'erro');
    }
  });
}

addEventListener('hashchange', () => location.reload());
await carregar();
