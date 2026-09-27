import { html } from '../html.js';
import { campo, mostrarErros } from '../forms.js';
import { destinoSeguro, entrar, sessaoAtual } from '../auth.js';
import { erroGeral, moldura, prepararAcesso } from './_auth.js';

const main = await prepararAcesso();
const destino = destinoSeguro(new URLSearchParams(location.search).get('de'));

if (await sessaoAtual()) {
  location.replace(destino);
} else {
  main.innerHTML = String(
    moldura({
      titulo: 'Entrar',
      subtitulo: 'Acesso da equipe da empresa avaliadora.',
      corpo: html`<form class="pilha" id="form-login" novalidate>
        ${campo({ id: 'email', rotulo: 'E-mail', controle: html`<input class="input" id="email" type="email" inputmode="email" autocomplete="username">` })}
        ${campo({ id: 'senha', rotulo: 'Senha', controle: html`<input class="input" id="senha" type="password" autocomplete="current-password">` })}
        <div id="erro-geral"></div>
        <button class="btn btn--bloco" type="submit">Entrar</button>
        <a class="link" href="esqueci-senha.html">Esqueci minha senha</a>
      </form>`,
    }),
  );

  const form = document.getElementById('form-login');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const erros = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.value.trim())) erros.email = 'Informe um e-mail válido, como nome@empresa.com.br.';
    if (!form.senha.value) erros.senha = 'Informe a senha.';
    mostrarErros(form, erros, ['email', 'senha']);
    if (Object.keys(erros).length) return;

    const botao = form.querySelector('button[type=submit]');
    botao.disabled = true;
    botao.textContent = 'Entrando…';
    const alvo = form.querySelector('#erro-geral');
    alvo.innerHTML = '';
    try {
      await entrar(form.email.value.trim(), form.senha.value);
      location.replace(destino);
    } catch {
      alvo.innerHTML = String(erroGeral('E-mail ou senha incorretos. Confira os dados e tente de novo, ou use “Esqueci minha senha”.'));
      botao.disabled = false;
      botao.textContent = 'Entrar';
    }
  });
}
