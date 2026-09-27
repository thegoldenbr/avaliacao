/** Painel de compartilhamento do link de resposta: copiar, WhatsApp, e-mail e QR code. */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { qrSvg } from '../qr.js';
import { toast } from '../ui.js';
import { urlDaPagina } from '../supabase.js';
import { formatarData } from '../lib/formatacao.js';
import { linkEmail, linkWhatsApp } from '../lib/avaliacao.js';

export const linkDeResposta = (token) => `${urlDaPagina('responder.html')}#${token}`;

export function textoDoConvite(av, empresa) {
  const nome = empresa.responsavel_nome ? `Olá, ${empresa.responsavel_nome.split(' ')[0]}! ` : 'Olá! ';
  const prazo = av.prazo ? ` e pode ser respondido pelo celular, com prazo até ${formatarData(av.prazo)}` : ' e pode ser respondido pelo celular';
  return `${nome}Segue o link do questionário "${av.titulo}" da ${empresa.nome_fantasia ?? empresa.razao_social}. Leva alguns minutos${prazo}:\n${linkDeResposta(av.token_resposta)}`;
}

export function painelCompartilhar(av, empresa) {
  const link = linkDeResposta(av.token_resposta);
  const texto = textoDoConvite(av, empresa);
  return html`<section class="pilha pilha--lg" aria-labelledby="h-link">
    <div class="pilha leitura"><h2 id="h-link">Link de resposta</h2>
      <div class="link-copia"><input class="input" id="link-resposta" readonly aria-label="Link de resposta" value="${link}"><button class="btn btn--sec btn--icone" id="copiar-link" aria-label="Copiar link">${icone('copia')}</button></div>
      <p class="muted">Quem tiver este link pode responder. Se ele vazar, gere outro: o anterior deixa de funcionar.</p></div>
    <div class="pilha"><h2>Enviar por</h2>
      <div class="linha">
        <a class="btn btn--sec" target="_blank" rel="noopener noreferrer" href="${linkWhatsApp({ telefone: empresa.responsavel_telefone, texto })}">${icone('zap', 'icone--sm')}WhatsApp</a>
        <a class="btn btn--sec" href="${linkEmail({ para: empresa.responsavel_email, assunto: `Avaliação: ${av.titulo}`, corpo: texto })}">${icone('email', 'icone--sm')}E-mail</a>
      </div>
      <div class="linha" style="align-items:flex-start;gap:1.5rem">${qrSvg(link, 'QR code do link de resposta')}
        <div class="pilha pilha--sm leitura"><p><b>Texto pronto</b></p><p class="muted" style="white-space:pre-line">${texto}</p></div></div>
    </div>
  </section>`;
}

/** Liga o botão de copiar do painel. */
export function ligarCopiar(raiz) {
  raiz.querySelector('#copiar-link')?.addEventListener('click', async () => {
    const campo = raiz.querySelector('#link-resposta');
    try {
      await navigator.clipboard.writeText(campo.value);
      toast('Link copiado.');
    } catch {
      campo.select();
      toast('Selecione o link e copie manualmente (Ctrl+C).', 'erro');
    }
  });
}
