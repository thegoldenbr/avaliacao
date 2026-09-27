/**
 * Destino do e-mail "Esqueci minha senha". O link traz ?code=... na query: o cliente do Supabase troca o código
 * por uma sessão sozinho (PKCE). Aqui só esperamos a sessão existir e pedimos a nova senha.
 */
import { html } from '../html.js';
import { supabase } from '../supabase.js';
import { formSenha, moldura, prepararAcesso } from './_auth.js';

const main = await prepararAcesso();
const { data } = await supabase.auth.getSession(); // espera a troca do código terminar

if (data.session) {
  main.innerHTML = String(moldura({ titulo: 'Criar nova senha', corpo: html`<div id="area"></div>` }));
  formSenha(document.getElementById('area'), { rotuloBotao: 'Salvar nova senha', aoConcluir: () => location.replace('index.html') });
} else {
  main.innerHTML = String(
    moldura({
      titulo: 'Criar nova senha',
      corpo: html`<p class="erro-geral" role="alert">Este link expirou ou já foi usado. Peça um novo link para continuar.</p>
        <a class="link" href="esqueci-senha.html">Pedir novo link</a>`,
    }),
  );
}
