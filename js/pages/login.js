import { html } from '../html.js';
import { campo, mostrarErros } from '../forms.js';
import { icone } from '../icones.js';
import { destinoSeguro, entrar, sessaoAtual } from '../auth.js';
import { entradaParaEmail } from '../lib/usuarios.js';
import { erroGeral, moldura, prepararAcesso } from './_auth.js';
import { entrarComPin } from './_conta.js';

const main = await prepararAcesso();
const parametros = new URLSearchParams(location.search);
const destino = destinoSeguro(parametros.get('de'));

if (await sessaoAtual()) {
  location.replace(destino);
} else {
  let modo = 'senha';

  function desenhar() {
    const senha = modo === 'senha';
    main.innerHTML = String(
      moldura({
        titulo: 'Entrar',
        subtitulo: 'Acesso da equipe da empresa avaliadora.',
        corpo: html`${parametros.get('msg') === 'senha-alterada' ? html`<p class="aviso aviso--ok" role="status">${icone('ok')}<span>Senha alterada. Entre de novo com a nova senha.</span></p>` : ''}
          <form class="pilha" id="form-login" novalidate>
            ${campo({ id: 'usuario', rotulo: senha ? 'Usuário ou e-mail' : 'Usuário', ajuda: senha ? 'Quem não tem e-mail entra com nome.sobrenome.' : undefined, controle: html`<input class="input" id="usuario" autocomplete="username" autocapitalize="none" spellcheck="false">` })}
            ${senha
              ? campo({ id: 'segredo', rotulo: 'Senha', controle: html`<input class="input" id="segredo" type="password" autocomplete="current-password">` })
              : campo({ id: 'segredo', rotulo: 'PIN de 6 dígitos', controle: html`<input class="input num" id="segredo" type="password" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*">` })}
            <div id="erro-geral"></div>
            <button class="btn btn--bloco" type="submit">Entrar</button>
            <button class="link" type="button" id="trocar-modo" style="background:none;border:0;padding:0;cursor:pointer;text-align:left">${senha ? 'Entrar com PIN' : 'Entrar com senha'}</button>
            ${senha ? html`<a class="link" href="esqueci-senha.html">Esqueci minha senha</a>` : ''}
          </form>`,
      }),
    );
    const form = document.getElementById('form-login');
    document.getElementById('trocar-modo').addEventListener('click', () => {
      modo = senha ? 'pin' : 'senha';
      desenhar();
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const usuario = form.usuario.value.trim();
      const segredo = form.segredo.value;
      const erros = {};
      if (!usuario) erros.usuario = senha ? 'Informe o usuário ou e-mail.' : 'Informe o usuário.';
      if (!segredo) erros.segredo = senha ? 'Informe a senha.' : 'Informe o PIN.';
      else if (!senha && !/^[0-9]{6}$/.test(segredo)) erros.segredo = 'O PIN tem 6 dígitos.';
      mostrarErros(form, erros, ['usuario', 'segredo']);
      if (Object.keys(erros).length) return;

      const botao = form.querySelector('button[type=submit]');
      const alvo = form.querySelector('#erro-geral');
      botao.disabled = true;
      botao.textContent = 'Entrando…';
      alvo.innerHTML = '';
      try {
        if (senha) await entrar(entradaParaEmail(usuario), segredo);
        else await entrarComPin(usuario, segredo);
        location.replace(destino);
      } catch (erro) {
        alvo.innerHTML = String(erroGeral(senha ? 'Usuário/e-mail ou senha incorretos. Confira os dados e tente de novo.' : erro.message));
        botao.disabled = false;
        botao.textContent = 'Entrar';
      }
    });
  }
  desenhar();
}
