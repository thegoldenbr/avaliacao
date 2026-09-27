/** Painel de usuários (Configurações): lista, papel, ativar/desativar, convite por link e contas sem e-mail. */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { campo, mostrarErros } from '../forms.js';
import { supabase, dados, urlBase } from '../supabase.js';
import { abrirDialogo, confirmar, toast } from '../ui.js';
import { emailValido } from '../lib/mascaras.js';
import { mensagemDeErro } from '../lib/erros.js';
import { SENHA_INICIAL, gerarUsuario } from '../lib/usuarios.js';
import { chamarUsuarios } from './_conta.js';

async function convidar({ nome, email, papel }) {
  const { data, error } = await supabase.functions.invoke('convidar-usuario', { body: { nome, email, papel, url_base: urlBase() } });
  if (error) {
    const corpo = await error.context?.json?.().catch(() => null);
    throw new Error(corpo?.erro ?? 'Sem conexão com o servidor. Verifique sua internet e tente de novo.');
  }
  if (!data?.link) throw new Error('Não foi possível gerar o convite.');
  return data.link;
}

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    toast('Copiado.');
  } catch {
    toast('Não foi possível copiar. Selecione o texto e copie manualmente.', 'erro');
  }
}

/** Mostra o usuário e a senha inicial de uma conta sem e-mail (criada ou redefinida). */
function mostrarCredenciais(el, { nome, usuario, senha_inicial: senha }) {
  const texto = `Olá, ${nome.split(' ')[0]}! Seu acesso ao Radar de Desempenho: ${urlBase()}login.html\nUsuário: ${usuario}\nSenha inicial: ${senha}\nNo primeiro acesso você precisa criar uma senha só sua.`;
  el.querySelector('[data-conteudo]').innerHTML = String(html`<div class="pilha">
    <p>Passe estes dados para ${nome}. No primeiro acesso a pessoa é obrigada a trocar a senha.</p>
    <div class="cartao pilha pilha--sm"><p>Usuário: <b class="num" id="cred-usuario">${usuario}</b></p><p>Senha inicial: <b class="num" id="cred-senha">${senha}</b></p></div>
    <div class="linha">
      <button class="btn btn--sec" id="copiar-cred">${icone('copia', 'icone--sm')}Copiar dados</button>
      <a class="btn btn--sec" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${encodeURIComponent(texto)}">${icone('zap', 'icone--sm')}WhatsApp</a>
    </div>
    <div class="dialogo-acoes"><button class="btn" data-fechar>Concluir</button></div></div>`);
  el.querySelector('#copiar-cred').addEventListener('click', () => copiar(texto));
}

function dialogoNovoUsuario(aoConcluir, usuariosExistentes) {
  const { el } = abrirDialogo({
    titulo: 'Novo usuário',
    aoFechar: aoConcluir,
    corpo: html`<form class="pilha" id="form-convite" novalidate>
      <fieldset class="pilha pilha--sm"><legend style="font-weight:500">Como a pessoa vai entrar?</legend>
        <label class="checagem"><input type="radio" name="modo" value="semail" checked>Sem e-mail: usuário e senha inicial</label>
        <label class="checagem"><input type="radio" name="modo" value="email">Com e-mail: convite por link</label></fieldset>
      ${campo({ id: 'nome', rotulo: 'Nome e sobrenome', controle: html`<input class="input" id="nome" autocomplete="off" maxlength="120">` })}
      <p class="muted" id="previa-usuario" style="margin-top:-.5rem"></p>
      <div id="campo-email" hidden>${campo({ id: 'email', rotulo: 'E-mail', controle: html`<input class="input" id="email" type="email" inputmode="email" autocomplete="off">` })}</div>
      ${campo({ id: 'papel', rotulo: 'Papel', ajuda: 'Analistas cuidam de empresas, questionários, avaliações e relatórios. Administradores também gerenciam configurações e usuários.', controle: html`<select class="select" id="papel"><option value="analista">Analista</option><option value="admin">Administrador</option></select>` })}
      <div id="erro-geral"></div>
      <div class="dialogo-acoes"><button type="button" class="btn btn--sec" data-fechar>Cancelar</button><button type="submit" class="btn">Criar usuário</button></div>
    </form>`,
  });
  const form = el.querySelector('#form-convite');
  const semEmail = () => form.modo.value === 'semail';
  const atualizarModo = () => {
    el.querySelector('#campo-email').hidden = semEmail();
    form.querySelector('button[type=submit]').textContent = semEmail() ? 'Criar usuário' : 'Gerar convite';
    const u = gerarUsuario(form.nome.value, usuariosExistentes);
    el.querySelector('#previa-usuario').textContent = semEmail() ? (u ? `Usuário: ${u} · senha inicial ${SENHA_INICIAL} (troca obrigatória no primeiro acesso)` : 'O usuário será nome.sobrenome.') : '';
  };
  form.addEventListener('input', atualizarModo);
  form.addEventListener('change', atualizarModo);
  atualizarModo();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = form.nome.value.trim().replace(/\s+/g, ' ');
    const erros = {};
    if (semEmail() && !gerarUsuario(nome, [])) erros.nome = 'Informe nome e sobrenome.';
    if (!semEmail() && nome.length < 2) erros.nome = 'Informe o nome.';
    if (!semEmail() && !emailValido(form.email.value)) erros.email = 'Informe um e-mail válido, como nome@empresa.com.br.';
    mostrarErros(form, erros, ['nome', 'email']);
    if (Object.keys(erros).length) return;
    const botao = form.querySelector('button[type=submit]');
    const rotulo = botao.textContent;
    botao.disabled = true;
    botao.textContent = 'Criando…';
    try {
      if (semEmail()) {
        const r = await chamarUsuarios('criar', { nome_completo: nome, papel: form.papel.value });
        mostrarCredenciais(el, { nome, ...r });
        return;
      }
      const link = await convidar({ nome, email: form.email.value.trim().toLowerCase(), papel: form.papel.value });
      const mensagem = `Olá, ${nome}! Você foi convidado(a) para o Radar de Desempenho. Crie sua senha por este link: ${link}`;
      el.querySelector('[data-conteudo]').innerHTML = String(html`<div class="pilha">
        <p>Envie este link para ${nome}. Ele vale por tempo limitado e só pode ser usado uma vez.</p>
        <input class="input" readonly aria-label="Link de convite" id="link-convite" value="${link}" style="font-size:.875rem">
        <div class="linha">
          <button class="btn btn--sec" id="copiar">${icone('copia', 'icone--sm')}Copiar link</button>
          <a class="btn btn--sec" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${encodeURIComponent(mensagem)}">${icone('zap', 'icone--sm')}WhatsApp</a>
          <a class="btn btn--sec" href="mailto:?subject=${encodeURIComponent('Convite para o Radar de Desempenho')}&body=${encodeURIComponent(mensagem)}">${icone('email', 'icone--sm')}E-mail</a>
        </div>
        <div class="dialogo-acoes"><button class="btn" data-fechar>Concluir</button></div></div>`);
      const campoLink = el.querySelector('#link-convite');
      campoLink.addEventListener('focus', () => campoLink.select());
      el.querySelector('#copiar').addEventListener('click', () => copiar(link));
    } catch (erro) {
      botao.disabled = false;
      botao.textContent = rotulo;
      form.querySelector('#erro-geral').innerHTML = String(html`<p class="erro-geral" role="alert">${erro.message}</p>`);
    }
  });
}

export async function montarUsuarios(raiz, perfilAtual) {
  let usuarios = [];

  async function desenhar() {
    try {
      usuarios = dados(await supabase.from('perfis').select('*').order('nome'));
    } catch {
      raiz.innerHTML = String(html`<p class="erro-geral" role="alert">Não foi possível carregar os usuários.</p>`);
      return;
    }
    raiz.innerHTML = String(html`<div class="pilha pilha--lg">
      <div class="linha linha--entre">
        <p class="muted" style="max-width:60ch">Quem tem acesso à área interna. Pessoas sem e-mail entram com <b>nome.sobrenome</b> e a senha inicial ${SENHA_INICIAL} (trocada no primeiro acesso); as demais entram por convite com link.</p>
        <button class="btn" id="btn-convidar">${icone('plus')}Novo usuário</button>
      </div>
      <ul class="linhas">${usuarios.map((u) => {
        const eu = u.id === perfilAtual.id;
        return html`<li class="linha linha--entre"><div style="min-width:0"><b>${u.nome}</b> ${eu ? html`<span class="muted">(você)</span>` : ''}
            <p class="muted" style="font-size:.875rem">${u.usuario ? html`Usuário: <span class="num">${u.usuario}</span>` : u.email}${u.precisa_trocar_senha ? ' · aguardando o primeiro acesso' : ''}${u.pin_estado === 'ativo' ? ' · com PIN' : ''}</p></div>
          <div class="linha">${u.ativo ? '' : html`<span class="badge">Desativado</span>`}
            <select class="select" style="width:auto" data-papel="${u.id}" aria-label="Papel de ${u.nome}" ${eu ? html`disabled` : ''}>
              <option value="analista" ${u.papel === 'analista' ? html`selected` : ''}>Analista</option><option value="admin" ${u.papel === 'admin' ? html`selected` : ''}>Administrador</option></select>
            ${u.usuario && !eu ? html`<button class="btn btn--sec" data-redefinir="${u.id}">Redefinir senha</button>` : ''}
            <button class="btn btn--sec" data-ativo="${u.id}" data-valor="${String(!u.ativo)}" ${eu ? html`disabled` : ''}>${u.ativo ? 'Desativar' : 'Reativar'}</button></div></li>`;
      })}</ul>
    </div>`);
  }

  async function atualizar(rid, patch) {
    const { data, error } = await supabase.from('perfis').update(patch).eq('id', rid).select();
    if (error || !data?.length) toast(mensagemDeErro(error ?? { code: '42501' }, 'Não foi possível atualizar o usuário.'), 'erro');
    await desenhar();
  }

  async function redefinir(rid) {
    const u = usuarios.find((x) => x.id === rid);
    const sim = await confirmar({ titulo: 'Redefinir senha', descricao: `A senha de ${u.nome} volta para a inicial (${SENHA_INICIAL}), o PIN é apagado e será obrigatório criar uma nova senha no próximo acesso.`, rotuloConfirmar: 'Redefinir senha' });
    if (!sim) return;
    try {
      const r = await chamarUsuarios('redefinir', { usuario_id: rid });
      const { el } = abrirDialogo({ titulo: 'Senha redefinida', corpo: html`<div data-conteudo></div>`, aoFechar: desenhar });
      mostrarCredenciais(el, { nome: u.nome, ...r });
    } catch (erro) {
      toast(erro.message, 'erro');
    }
  }

  raiz.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-papel]');
    if (sel) void atualizar(sel.dataset.papel, { papel: sel.value });
  });
  raiz.addEventListener('click', (e) => {
    if (e.target.closest('#btn-convidar')) dialogoNovoUsuario(desenhar, usuarios.map((u) => u.usuario).filter(Boolean));
    const b = e.target.closest('[data-ativo]');
    if (b) void atualizar(b.dataset.ativo, { ativo: b.dataset.valor === 'true' });
    const r = e.target.closest('[data-redefinir]');
    if (r) void redefinir(r.dataset.redefinir);
  });
  await desenhar();
}
