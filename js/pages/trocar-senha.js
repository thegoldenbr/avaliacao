/** Troca de senha. Obrigatória no primeiro login de quem entrou com a senha inicial (123456). */
import { html } from '../html.js';
import { campo, mostrarErros } from '../forms.js';
import { sair, sessaoAtual, perfilDe } from '../auth.js';
import { problemasDaSenha, SENHA_INICIAL, TAMANHO_MINIMO_SENHA } from '../lib/usuarios.js';
import { toast } from '../ui.js';
import { erroGeral, moldura, prepararAcesso } from './_auth.js';
import { chamarUsuarios } from './_conta.js';

const main = await prepararAcesso();
const sessao = await sessaoAtual();
if (!sessao) {
  location.replace('login.html');
  await new Promise(() => {});
}
const perfil = await perfilDe(sessao.user.id);
const voluntario = new URLSearchParams(location.search).has('voluntario');
if (!perfil || (!perfil.precisa_trocar_senha && !voluntario)) {
  location.replace('index.html');
  await new Promise(() => {});
}
const obrigatorio = perfil.precisa_trocar_senha;

main.innerHTML = String(
  moldura({
    titulo: obrigatorio ? 'Crie a sua senha' : 'Trocar senha',
    subtitulo: obrigatorio ? `Por segurança, troque a senha inicial (${SENHA_INICIAL}) por uma só sua antes de continuar.` : undefined,
    corpo: html`<form class="pilha" id="form" novalidate>
      ${campo({ id: 'senha', rotulo: 'Nova senha', ajuda: `Mínimo de ${TAMANHO_MINIMO_SENHA} caracteres, diferente da senha inicial.`, controle: html`<input class="input" id="senha" type="password" autocomplete="new-password">` })}
      ${campo({ id: 'confirmacao', rotulo: 'Repita a nova senha', controle: html`<input class="input" id="confirmacao" type="password" autocomplete="new-password">` })}
      <div id="erro-geral"></div>
      <button class="btn btn--bloco" type="submit">${obrigatorio ? 'Salvar e continuar' : 'Salvar nova senha'}</button>
      ${obrigatorio ? html`<button type="button" class="link" id="sair" style="background:none;border:0;padding:0;cursor:pointer;text-align:left">Sair</button>` : html`<a class="link" href="mais.html">Cancelar</a>`}
    </form>`,
  }),
);

const form = document.getElementById('form');
document.getElementById('sair')?.addEventListener('click', sair);
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const erros = {};
  const problemas = problemasDaSenha(form.senha.value, { usuario: perfil.usuario ?? '' });
  if (problemas.length) erros.senha = problemas[0];
  if (form.confirmacao.value !== form.senha.value) erros.confirmacao = 'As senhas não são iguais.';
  mostrarErros(form, erros, ['senha', 'confirmacao']);
  if (Object.keys(erros).length) return;

  const botao = form.querySelector('button[type=submit]');
  botao.disabled = true;
  botao.textContent = 'Salvando…';
  try {
    await chamarUsuarios('trocar-senha', { nova_senha: form.senha.value });
  } catch (erro) {
    form.querySelector('#erro-geral').innerHTML = String(erroGeral(erro.message));
    botao.disabled = false;
    botao.textContent = obrigatorio ? 'Salvar e continuar' : 'Salvar nova senha';
    return;
  }
  if (obrigatorio) {
    // A senha mudou no servidor: encerra a sessão e pede um novo login (é o "segundo login", quando oferecemos o PIN).
    const { supabase } = await import('../supabase.js');
    await supabase.auth.signOut();
    location.replace('login.html?msg=senha-alterada');
  } else {
    toast('Senha alterada.');
    location.replace('mais.html');
  }
});
