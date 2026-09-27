/**
 * Destino do link de convite gerado pela Edge Function: aceitar-convite.html?token_hash=...&type=invite
 * O token vai na query; verifyOtp abre a sessão e depois o convidado cria a senha.
 */
import { html } from '../html.js';
import { supabase } from '../supabase.js';
import { formSenha, moldura, prepararAcesso } from './_auth.js';

const main = await prepararAcesso();
const parametros = new URLSearchParams(location.search);
const tokenHash = parametros.get('token_hash');
const tipo = parametros.get('type');

async function verificar() {
  if (!tokenHash || (tipo !== 'invite' && tipo !== 'recovery')) return false;
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
  if (error) return false;
  // Tira o token da barra de endereço para não ser reaproveitado nem compartilhado sem querer.
  history.replaceState(null, '', location.pathname);
  return true;
}

if (await verificar()) {
  main.innerHTML = String(moldura({ titulo: 'Bem-vindo(a)', subtitulo: 'Crie sua senha para acessar o sistema.', corpo: html`<div id="area"></div>` }));
  formSenha(document.getElementById('area'), { rotuloBotao: 'Criar senha e entrar', aoConcluir: () => location.replace('index.html') });
} else {
  main.innerHTML = String(
    moldura({
      titulo: 'Bem-vindo(a)',
      corpo: html`<p class="erro-geral" role="alert">Este convite expirou ou já foi usado. Peça a um administrador que gere um novo link.</p>
        <a class="link" href="login.html">Ir para o login</a>`,
    }),
  );
}
