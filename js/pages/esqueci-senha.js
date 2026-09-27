import { html } from '../html.js';
import { campo, mostrarErros } from '../forms.js';
import { icone } from '../icones.js';
import { supabase, urlDaPagina } from '../supabase.js';
import { erroGeral, moldura, prepararAcesso } from './_auth.js';

const main = await prepararAcesso();

main.innerHTML = String(
  moldura({
    titulo: 'Esqueci minha senha',
    subtitulo: 'Enviamos um link para você criar uma nova senha.',
    corpo: html`<form class="pilha" id="form" novalidate>
      ${campo({ id: 'email', rotulo: 'E-mail', controle: html`<input class="input" id="email" type="email" inputmode="email" autocomplete="email">` })}
      <div id="erro-geral"></div>
      <button class="btn btn--bloco" type="submit">Enviar link</button>
      <a class="link" href="login.html">Voltar para o login</a>
    </form>`,
  }),
);

const form = document.getElementById('form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  const erros = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? {} : { email: 'Informe um e-mail válido, como nome@empresa.com.br.' };
  mostrarErros(form, erros, ['email']);
  if (erros.email) return;

  const botao = form.querySelector('button[type=submit]');
  botao.disabled = true;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: urlDaPagina('redefinir-senha.html') });
  if (error) {
    botao.disabled = false;
    form.querySelector('#erro-geral').innerHTML = String(erroGeral('Não foi possível enviar agora. Aguarde alguns minutos e tente de novo.'));
    return;
  }
  // Mesma resposta exista ou não a conta, para não revelar quem tem cadastro.
  form.innerHTML = String(html`<p class="aviso aviso--ok" role="status">${icone('ok')}<span>Se ${email} tiver cadastro, o link chega em alguns minutos. Confira também a caixa de spam.</span></p>
    <a class="link" href="login.html">Voltar para o login</a>`);
});
