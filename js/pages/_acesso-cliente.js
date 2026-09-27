/**
 * Acesso do cliente ao dashboard: link público (copiar, QR, WhatsApp, e-mail, novo link) e PIN opcional de 6 dígitos.
 * Usado na página da avaliação e no editor do relatório.
 */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { qrSvg } from '../qr.js';
import { supabase, urlDaPagina } from '../supabase.js';
import { confirmar, toast } from '../ui.js';
import { formatarData } from '../lib/formatacao.js';
import { linkEmail, linkWhatsApp } from '../lib/avaliacao.js';
import { mensagemDeErro } from '../lib/erros.js';

export const linkDoRelatorio = (token) => `${urlDaPagina('relatorio.html')}#${token}`;

/**
 * @param raiz elemento que recebe o painel
 * @param av avaliação (com token_relatorio, status, relatorio_senha, publicado_em); é atualizada aqui
 * @param empresa dados da empresa (contatos para WhatsApp/e-mail)
 */
export function montarAcessoCliente(raiz, av, empresa, { aoAlterar } = {}) {
  const nome = empresa.nome_fantasia ?? empresa.razao_social;
  const publicada = () => av.status === 'publicada';

  function desenhar() {
    const pin = av.relatorio_senha;
    const link = linkDoRelatorio(av.token_relatorio);
    const texto = `Olá! O relatório de desempenho de ${nome} está disponível neste link: ${link}${pin ? `\nPIN de acesso: ${pin}` : ''}`;
    raiz.innerHTML = String(html`<section class="cartao pilha pilha--lg" aria-labelledby="h-acesso">
      <div class="pilha"><h2 id="h-acesso">Link público do dashboard do cliente</h2>
        ${publicada()
          ? html`<div class="link-copia"><input class="input" id="link-relatorio" readonly aria-label="Link do relatório" value="${link}"><button class="btn btn--sec btn--icone" data-acesso="copiar-link" aria-label="Copiar link">${icone('copia')}</button></div>
            <div class="linha" style="align-items:flex-start;gap:1.5rem">${qrSvg(link, 'QR code do relatório')}
              <div class="linha">
                <a class="btn btn--sec" target="_blank" rel="noopener noreferrer" href="${linkWhatsApp({ telefone: empresa.responsavel_telefone, texto })}">${icone('zap', 'icone--sm')}WhatsApp</a>
                <a class="btn btn--sec" href="${linkEmail({ para: empresa.responsavel_email, assunto: `Relatório de desempenho: ${nome}`, corpo: texto })}">${icone('email', 'icone--sm')}E-mail</a>
                <a class="btn btn--sec" target="_blank" rel="noopener noreferrer" href="${link}">${icone('olho', 'icone--sm')}Abrir</a>
                <button class="btn btn--ghost" data-acesso="novo-link">Gerar novo link</button></div></div>
            <p class="muted">Publicado em ${av.publicado_em ? formatarData(av.publicado_em) : '—'}. Se o link vazar, gere outro: o anterior deixa de funcionar.</p>`
          : html`<p class="aviso aviso--atencao" role="status">${icone('aviso')}<span>O relatório ainda não foi publicado, então o link não abre para o cliente. Publique pelo editor do relatório.</span></p>`}
      </div>
      <div class="pilha pilha--sm" style="border-top:1px solid var(--color-border);padding-top:1rem"><h3>PIN de acesso</h3>
        <label class="interruptor"><span>Exigir PIN de 6 dígitos para abrir o dashboard</span><input type="checkbox" id="pin-ativo" ${pin ? html`checked` : ''}></label>
        ${pin
          ? html`<div class="linha"><span class="muted">PIN atual:</span><b class="num" id="pin-codigo" style="font-size:1.75rem;letter-spacing:.2em">${pin}</b>
              <button class="btn btn--sec btn--sm" data-acesso="copiar-pin">${icone('copia', 'icone--sm')}Copiar</button>
              <button class="btn btn--sec btn--sm" data-acesso="novo-pin">${icone('editar', 'icone--sm')}Gerar novo PIN</button></div>
            <p class="muted">Envie o PIN ao cliente junto com o link. Ao gerar um novo PIN, o anterior para de funcionar e o cliente precisa digitar o novo. 5 erros seguidos bloqueiam o link por 10 minutos.</p>`
          : html`<p class="muted">Sem PIN, qualquer pessoa com o link abre o dashboard.</p>`}
      </div>
    </section>`);
  }

  async function definirPin(ativar, renovar = false) {
    const { data, error } = await supabase.rpc('definir_senha_relatorio', { p_avaliacao_id: av.id, p_ativar: ativar, p_renovar: renovar });
    if (error) {
      toast(mensagemDeErro(error, 'Não foi possível alterar o PIN do dashboard.'), 'erro');
      return desenhar();
    }
    av.relatorio_senha = data;
    desenhar();
    aoAlterar?.();
    toast(!ativar ? 'PIN desativado: o link abre direto.' : renovar ? 'Novo PIN gerado. O anterior não funciona mais.' : 'PIN ativado.');
  }

  async function copiar(valor, ok) {
    try {
      await navigator.clipboard.writeText(valor);
      toast(ok);
    } catch {
      toast('Selecione o texto e copie manualmente (Ctrl+C).', 'erro');
    }
  }

  raiz.addEventListener('change', (e) => {
    if (e.target.id === 'pin-ativo') void definirPin(e.target.checked);
  });
  raiz.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-acesso]');
    if (!b) return;
    const acao = b.dataset.acesso;
    if (acao === 'copiar-link') return copiar(linkDoRelatorio(av.token_relatorio), 'Link copiado.');
    if (acao === 'copiar-pin') return copiar(av.relatorio_senha, 'PIN copiado.');
    if (acao === 'novo-pin') {
      if (!(await confirmar({ titulo: 'Gerar novo PIN', descricao: 'O PIN atual deixa de funcionar. Envie o novo ao cliente.', rotuloConfirmar: 'Gerar novo PIN' }))) return;
      return definirPin(true, true);
    }
    if (acao === 'novo-link') {
      if (!(await confirmar({ titulo: 'Gerar novo link', descricao: 'O link atual deixa de funcionar; envie o novo ao cliente.', rotuloConfirmar: 'Gerar novo link' }))) return;
      const { data, error } = await supabase.rpc('regenerar_token', { p_avaliacao_id: av.id, p_qual: 'relatorio' });
      if (error) return toast(mensagemDeErro(error), 'erro');
      av.token_relatorio = data;
      desenhar();
      aoAlterar?.();
      toast('Novo link gerado.');
    }
  });

  desenhar();
  return { atualizar: desenhar };
}
