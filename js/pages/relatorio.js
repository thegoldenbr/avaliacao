/** Dashboard do cliente (sem login): relatorio.html#TOKEN. Mostra só o snapshot publicado, lido por RPC. Pede o PIN se o operador ativou. */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { supabase } from '../supabase.js';
import { aplicarTema } from '../tema.js';
import { aplicarCor } from '../marca.js';
import { cabecalhoDaMarca, montarPaginaDoRelatorio, snapshotValido } from '../relatorio-pagina.js';
import { montarApresentacao } from '../apresentacao-vista.js';
import { campo, mostrarErros } from '../forms.js';

aplicarTema();
const raiz = document.getElementById('conteudo');
const token = decodeURIComponent(location.hash.slice(1)).split('/').filter(Boolean).pop() ?? '';
const CHAVE_PIN = `rel-pin:${token.slice(0, 16)}`;

const lerPin = () => {
  try {
    return sessionStorage.getItem(CHAVE_PIN);
  } catch {
    return null;
  }
};
const guardarPin = (v) => {
  try {
    if (v) sessionStorage.setItem(CHAVE_PIN, v);
    else sessionStorage.removeItem(CHAVE_PIN);
  } catch {
    // sem armazenamento: pede o PIN de novo ao recarregar
  }
};

function aviso(marca, { icon, cor, titulo, texto }) {
  raiz.innerHTML = String(html`<div class="rel"><header>${cabecalhoDaMarca(marca)}</header>
    <div class="pilha"><span class="faixa ${cor}">${icone(icon, 'icone--lg')}</span><h1>${titulo}</h1><p class="leitura">${texto}</p></div></div>`);
}

function pedirPin(marca, { erro = '', bloqueado = false } = {}) {
  raiz.innerHTML = String(html`<div class="rel"><header>${cabecalhoDaMarca(marca)}</header>
    <div class="pilha" style="max-width:420px"><span class="faixa faixa--bom">${icone('cadeado', 'icone--lg')}</span><h1>Relatório protegido</h1>
    ${bloqueado
      ? html`<p class="erro-geral" role="alert">Muitas tentativas incorretas. Aguarde 10 minutos e tente de novo.</p>`
      : html`<p class="leitura">Digite o PIN de 6 dígitos que você recebeu junto com o link.</p>
        <form class="pilha" id="form-pin" novalidate>
          ${campo({ id: 'pin', rotulo: 'PIN', controle: html`<input class="input num" id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]*">` })}
          ${erro ? html`<p class="erro-geral" role="alert">${erro}</p>` : ''}
          <button class="btn" type="submit">Abrir relatório</button></form>`}
    </div></div>`);
  const form = document.getElementById('form-pin');
  if (!form) return;
  form.pin.focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const digitado = form.pin.value.trim();
    if (!/^[0-9]{6}$/.test(digitado)) return mostrarErros(form, { pin: 'O PIN tem 6 dígitos.' }, ['pin']);
    void carregar(digitado);
  });
}

async function carregar(pinDigitado = null) {
  raiz.innerHTML = String(html`<div class="rel"><div class="carregando" aria-busy="true"><div class="skeleton sk-titulo"></div><div class="skeleton sk-bloco"></div></div></div>`);
  const pin = pinDigitado ?? lerPin();
  const { data, error } = await supabase.rpc('obter_relatorio', pin ? { p_token: token, p_senha: pin } : { p_token: token });
  if (error) {
    raiz.innerHTML = String(html`<div class="rel"><h1>Sem conexão</h1><p class="muted">Não conseguimos abrir o relatório agora. Verifique sua internet.</p><button class="btn" id="tentar" style="align-self:flex-start">Tentar de novo</button></div>`);
    document.getElementById('tentar').addEventListener('click', () => void carregar());
    return;
  }
  if (!data) return aviso(null, { icon: 'aviso', cor: 'faixa--atencao', titulo: 'Link inválido', texto: 'Não encontramos este relatório. Confira se o endereço está completo ou peça um novo link a quem enviou.' });
  aplicarCor(data.marca);
  if (data.liberado === false) return aviso(data.marca, { icon: 'cadeado', cor: 'faixa--atencao', titulo: 'Relatório ainda não liberado', texto: 'O resultado será liberado depois da apresentação. Assim que for liberado, este mesmo link passa a abrir o relatório.' });
  if (data.protegido) {
    if (data.bloqueado) return pedirPin(data.marca, { bloqueado: true });
    if (data.erro) {
      guardarPin(null);
      return pedirPin(data.marca, { erro: pinDigitado ? 'PIN incorreto. Confira e tente de novo.' : 'O PIN mudou. Digite o novo PIN.' });
    }
    return pedirPin(data.marca);
  }
  if (pin) guardarPin(pin);
  if (!data.disponivel) return aviso(data.marca, { icon: 'aviso', cor: 'faixa--atencao', titulo: 'Relatório indisponível', texto: 'Este relatório não está disponível no momento. Fale com quem enviou o link.' });
  if (!snapshotValido(data.conteudo)) {
    return aviso(data.marca, { icon: 'aviso', cor: 'faixa--atencao', titulo: 'Relatório em atualização', texto: 'O conteúdo deste relatório precisa ser publicado novamente. Fale com quem enviou o link.' });
  }
  const snapshot = { ...data.conteudo, publicado_em: data.publicado_em ?? data.conteudo.publicado_em };
  document.title = `${data.empresa} — Relatório de desempenho`;
  montarRelatorio({ snapshot, marca: data.marca, rodape: data.rodape, apresentacaoLiberada: Boolean(data.apresentacao_liberada) });
}

/** Mostra o dashboard, com o botão "Modo de apresentação" quando o operador liberou esse modo ao cliente. */
function montarRelatorio(ctx) {
  let desmontarApresentacao = null;
  const abrirApresentacao = () => {
    desmontarApresentacao = montarApresentacao(raiz, {
      snapshot: ctx.snapshot,
      marca: ctx.marca,
      rodape: ctx.rodape,
      sair: () => {
        desmontarApresentacao?.();
        desmontarApresentacao = null;
        montarPagina();
      },
    });
  };
  function montarPagina() {
    montarPaginaDoRelatorio(raiz, {
      snapshot: ctx.snapshot,
      marca: ctx.marca,
      rodape: ctx.rodape,
      acoesExtra: ctx.apresentacaoLiberada ? html`<button type="button" class="btn btn--sec btn--sm" id="btn-apresentacao">${icone('monitor', 'icone--sm')}Modo de apresentação</button>` : '',
    });
    raiz.querySelector('#btn-apresentacao')?.addEventListener('click', abrirApresentacao);
  }
  montarPagina();
}

addEventListener('hashchange', () => location.reload());
await carregar();
