/** Oferta de PIN de 6 dígitos (no segundo login) e gerenciamento do PIN. */
import { html } from '../html.js';
import { campo, mostrarErros } from '../forms.js';
import { icone } from '../icones.js';
import { perfilDe, sessaoAtual } from '../auth.js';
import { problemasDoPin } from '../lib/usuarios.js';
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
const gerenciar = new URLSearchParams(location.search).has('gerenciar');
if (!perfil || perfil.precisa_trocar_senha || (!gerenciar && perfil.pin_estado !== 'segundo_login')) {
  location.replace(perfil?.precisa_trocar_senha ? 'trocar-senha.html' : 'index.html');
  await new Promise(() => {});
}
const temPin = perfil.pin_estado === 'ativo';

main.innerHTML = String(
  moldura({
    titulo: gerenciar ? (temPin ? 'Seu PIN' : 'Cadastrar PIN') : 'Quer entrar mais rápido?',
    subtitulo: 'Com um PIN de 6 dígitos você entra só com o usuário e o PIN, sem digitar a senha. A senha continua funcionando.',
    corpo: html`<form class="pilha" id="form" novalidate>
      ${temPin ? html`<p class="aviso aviso--ok" role="status">${icone('ok')}<span>Você já tem um PIN cadastrado. Preencha abaixo para trocar por outro.</span></p>` : ''}
      ${campo({ id: 'pin', rotulo: 'PIN de 6 dígitos', ajuda: 'Evite datas, repetições e sequências.', controle: html`<input class="input num" id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]*">` })}
      ${campo({ id: 'pin2', rotulo: 'Repita o PIN', controle: html`<input class="input num" id="pin2" type="password" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]*">` })}
      <div id="erro-geral"></div>
      <button class="btn btn--bloco" type="submit">${temPin ? 'Trocar PIN' : 'Cadastrar PIN'}</button>
      ${temPin ? html`<button type="button" class="btn btn--sec btn--bloco" id="remover">Remover PIN</button>` : ''}
      <button type="button" class="link" id="agora-nao" style="background:none;border:0;padding:0;cursor:pointer;text-align:left">${gerenciar ? 'Voltar' : 'Agora não'}</button>
    </form>`,
  }),
);

const form = document.getElementById('form');
const irParaInicio = () => location.replace(gerenciar ? 'mais.html' : 'index.html');

document.getElementById('agora-nao').addEventListener('click', async () => {
  if (!gerenciar) await chamarUsuarios('recusar-pin').catch(() => {});
  irParaInicio();
});
document.getElementById('remover')?.addEventListener('click', async () => {
  try {
    await chamarUsuarios('remover-pin');
    toast('PIN removido.');
    irParaInicio();
  } catch (erro) {
    toast(erro.message, 'erro');
  }
});
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const erros = {};
  const problemas = problemasDoPin(form.pin.value);
  if (problemas.length) erros.pin = problemas[0];
  if (form.pin2.value !== form.pin.value) erros.pin2 = 'Os PINs não são iguais.';
  mostrarErros(form, erros, ['pin', 'pin2']);
  if (Object.keys(erros).length) return;
  const botao = form.querySelector('button[type=submit]');
  botao.disabled = true;
  try {
    await chamarUsuarios('definir-pin', { pin: form.pin.value });
    toast('PIN cadastrado.');
    irParaInicio();
  } catch (erro) {
    form.querySelector('#erro-geral').innerHTML = String(erroGeral(erro.message));
    botao.disabled = false;
  }
});
