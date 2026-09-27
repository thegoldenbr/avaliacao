/** Painel de usuários (Configurações): lista, papel, ativar/desativar e convite por link. */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { campo, mostrarErros } from '../forms.js';
import { supabase, dados, urlBase } from '../supabase.js';
import { abrirDialogo, toast } from '../ui.js';
import { emailValido } from '../lib/mascaras.js';
import { mensagemDeErro } from '../lib/erros.js';

async function convidar({ nome, email, papel }) {
  const { data, error } = await supabase.functions.invoke('convidar-usuario', { body: { nome, email, papel, url_base: urlBase() } });
  if (error) {
    const corpo = await error.context?.json?.().catch(() => null);
    throw new Error(corpo?.erro ?? 'Sem conexão com o servidor. Verifique sua internet e tente de novo.');
  }
  if (!data?.link) throw new Error('Não foi possível gerar o convite.');
  return data.link;
}

function dialogoConvite(aoConcluir) {
  const { el, fechar } = abrirDialogo({
    titulo: 'Convidar usuário',
    aoFechar: aoConcluir,
    corpo: html`<form class="pilha" id="form-convite" novalidate>
      ${campo({ id: 'nome', rotulo: 'Nome', controle: html`<input class="input" id="nome" autocomplete="off" maxlength="120">` })}
      ${campo({ id: 'email', rotulo: 'E-mail', controle: html`<input class="input" id="email" type="email" inputmode="email" autocomplete="off">` })}
      ${campo({ id: 'papel', rotulo: 'Papel', ajuda: 'Analistas cuidam de empresas, questionários, avaliações e relatórios. Administradores também gerenciam configurações e usuários.', controle: html`<select class="select" id="papel"><option value="analista">Analista</option><option value="admin">Administrador</option></select>` })}
      <div id="erro-geral"></div>
      <div class="dialogo-acoes"><button type="button" class="btn btn--sec" data-fechar>Cancelar</button><button type="submit" class="btn">Gerar convite</button></div>
    </form>`,
  });
  const form = el.querySelector('#form-convite');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const erros = {};
    if (form.nome.value.trim().length < 2) erros.nome = 'Informe o nome.';
    if (!emailValido(form.email.value)) erros.email = 'Informe um e-mail válido, como nome@empresa.com.br.';
    mostrarErros(form, erros, ['nome', 'email']);
    if (Object.keys(erros).length) return;
    const botao = form.querySelector('button[type=submit]');
    botao.disabled = true;
    botao.textContent = 'Gerando…';
    try {
      const nome = form.nome.value.trim();
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
        <div class="dialogo-acoes"><button class="btn" data-fechar>Concluir</button></div>
      </div>`);
      const campoLink = el.querySelector('#link-convite');
      campoLink.addEventListener('focus', () => campoLink.select());
      el.querySelector('#copiar').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(link);
          toast('Link copiado.');
        } catch {
          toast('Não foi possível copiar. Selecione o link e copie manualmente.', 'erro');
        }
      });
    } catch (erro) {
      botao.disabled = false;
      botao.textContent = 'Gerar convite';
      form.querySelector('#erro-geral').innerHTML = String(html`<p class="erro-geral" role="alert">${erro.message}</p>`);
    }
  });
  return fechar;
}

export async function montarUsuarios(raiz, perfilAtual) {
  async function desenhar() {
    let usuarios;
    try {
      usuarios = dados(await supabase.from('perfis').select('*').order('nome'));
    } catch {
      raiz.innerHTML = String(html`<p class="erro-geral" role="alert">Não foi possível carregar os usuários.</p>`);
      return;
    }
    raiz.innerHTML = String(html`<div class="pilha pilha--lg">
      <div class="linha linha--entre">
        <p class="muted" style="max-width:60ch">Quem tem acesso à área interna. Novos usuários entram por convite: você gera o link e envia pelo WhatsApp ou e-mail.</p>
        <button class="btn" id="btn-convidar">${icone('plus')}Convidar usuário</button>
      </div>
      <ul class="linhas">${usuarios.map((u) => {
        const eu = u.id === perfilAtual.id;
        return html`<li class="linha linha--entre"><div style="min-width:0"><b>${u.nome}</b> ${eu ? html`<span class="muted">(você)</span>` : ''}<p class="muted" style="font-size:.875rem">${u.email}</p></div>
          <div class="linha">${u.ativo ? '' : html`<span class="badge">Desativado</span>`}
            <select class="select" style="width:auto" data-papel="${u.id}" aria-label="Papel de ${u.nome}" ${eu ? html`disabled` : ''}>
              <option value="analista" ${u.papel === 'analista' ? html`selected` : ''}>Analista</option><option value="admin" ${u.papel === 'admin' ? html`selected` : ''}>Administrador</option></select>
            <button class="btn btn--sec" data-ativo="${u.id}" data-valor="${!u.ativo}" ${eu ? html`disabled` : ''}>${u.ativo ? 'Desativar' : 'Reativar'}</button></div></li>`;
      })}</ul>
    </div>`);
  }

  async function atualizar(rid, patch) {
    const { data, error } = await supabase.from('perfis').update(patch).eq('id', rid).select();
    if (error || !data?.length) toast(mensagemDeErro(error ?? { code: '42501' }, 'Não foi possível atualizar o usuário.'), 'erro');
    await desenhar();
  }

  raiz.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-papel]');
    if (sel) void atualizar(sel.dataset.papel, { papel: sel.value });
  });
  raiz.addEventListener('click', (e) => {
    if (e.target.closest('#btn-convidar')) dialogoConvite(desenhar);
    const b = e.target.closest('[data-ativo]');
    if (b) void atualizar(b.dataset.ativo, { ativo: b.dataset.valor === 'true' });
  });
  await desenhar();
}
