/** Peças comuns das telas de acesso (login, recuperação, convite): moldura centralizada e formulário de nova senha. */
import { html } from '../html.js';
import { logoMarca } from '../shell.js';
import { aplicarTema } from '../tema.js';
import { carregarMarca, marcaEmCache } from '../marca.js';
import { campo, mostrarErros } from '../forms.js';
import { supabase } from '../supabase.js';

export async function prepararAcesso() {
  aplicarTema();
  await carregarMarca();
  return document.getElementById('conteudo');
}

export function moldura({ titulo, subtitulo, corpo }) {
  return html`<div class="centro"><div class="caixa pilha pilha--lg">
    <div class="pilha pilha--sm">${logoMarca(marcaEmCache())}<h1 style="margin-top:1rem">${titulo}</h1>${subtitulo ? html`<p class="muted">${subtitulo}</p>` : ''}</div>
    ${corpo}
  </div></div>`;
}

export const erroGeral = (texto) => html`<p class="erro-geral" role="alert">${texto}</p>`;

/** Formulário de nova senha (redefinição e aceite de convite): a sessão já foi aberta pelo link. */
export function formSenha(raiz, { rotuloBotao, aoConcluir }) {
  raiz.innerHTML = String(html`<form class="pilha" id="form-senha" novalidate>
    ${campo({ id: 'senha', rotulo: 'Nova senha', ajuda: 'Mínimo de 8 caracteres.', controle: html`<input class="input" id="senha" type="password" autocomplete="new-password">` })}
    ${campo({ id: 'confirmacao', rotulo: 'Repita a nova senha', controle: html`<input class="input" id="confirmacao" type="password" autocomplete="new-password">` })}
    <div id="erro-geral"></div>
    <button class="btn btn--bloco" type="submit">${rotuloBotao}</button>
  </form>`);
  const form = raiz.querySelector('#form-senha');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const senha = form.senha.value;
    const erros = {};
    if (senha.length < 8) erros.senha = 'Use pelo menos 8 caracteres.';
    if (form.confirmacao.value !== senha) erros.confirmacao = 'As senhas não são iguais.';
    mostrarErros(form, erros, ['senha', 'confirmacao']);
    if (Object.keys(erros).length) return;
    const botao = form.querySelector('button[type=submit]');
    botao.disabled = true;
    const { error } = await supabase.auth.updateUser({ password: senha });
    botao.disabled = false;
    if (error) {
      form.querySelector('#erro-geral').innerHTML = String(
        erroGeral(error.message.toLowerCase().includes('different') ? 'A nova senha precisa ser diferente da anterior.' : 'Não foi possível salvar a senha. Abra o link do e-mail novamente e tente de novo.'),
      );
      return;
    }
    aoConcluir();
  });
}
