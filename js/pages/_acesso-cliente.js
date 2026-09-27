/**
 * Acesso do cliente ao dashboard: link público (copiar, QR, WhatsApp, e-mail, novo link) e PIN opcional de 6 dígitos.
 * Usado na página da avaliação e no editor do relatório.
 */
import { html } from '../html.js';
import { icone } from '../icones.js';
import { qrSvg } from '../qr.js';
import { supabase, urlDaPagina } from '../supabase.js';
import { confirmar, toast } from '../ui.js';
import { formatarData, formatarDataHora } from '../lib/formatacao.js';
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

  const liberacao = () => av.relatorio_liberado_em
    ? html`<div class="aviso aviso--ok" role="status">${icone('ok')}<div class="pilha pilha--sm"><p><b>Liberado para o cliente</b> desde ${formatarDataHora(av.relatorio_liberado_em)}. Quem tiver o link${av.relatorio_senha ? ' e o PIN' : ''} consegue ver o dashboard.</p>
        <div><button class="btn btn--sec btn--sm" data-acesso="revogar">${icone('cadeado', 'icone--sm')}Revogar acesso do cliente</button></div></div></div>`
    : html`<div class="aviso aviso--atencao" role="status">${icone('aviso')}<div class="pilha pilha--sm"><p><b>Travado para o cliente.</b> Quem abrir o link vê apenas um aviso de que o relatório ainda não foi liberado. Libere depois de apresentar o resultado.</p>
        <div><button class="btn btn--sm" data-acesso="liberar">${icone('ok', 'icone--sm')}Liberar para o cliente</button></div></div></div>`;

  const liberacaoApresentacao = () => {
    if (!av.relatorio_liberado_em) {
      return html`<div class="aviso" role="status">${icone('cadeado')}<p><b>Modo de apresentação travado.</b> Libere primeiro o dashboard do cliente, acima, para depois poder liberar o modo de apresentação.</p></div>`;
    }
    if (!av.apresentacao_realizada_em) {
      return html`<div class="aviso" role="status">${icone('cadeado')}<p><b>Modo de apresentação travado.</b> Abra o "Modo de apresentação" pelo menos uma vez, na página da avaliação, para apresentar o resultado ao cliente. Depois disso você pode liberar esse modo para ele, se quiser.</p></div>`;
    }
    return av.apresentacao_liberada_em
      ? html`<div class="aviso aviso--ok" role="status">${icone('ok')}<div class="pilha pilha--sm"><p><b>Modo de apresentação liberado</b> desde ${formatarDataHora(av.apresentacao_liberada_em)}. O cliente vê o botão "Modo de apresentação" no dashboard dele.</p>
          <div><button class="btn btn--sec btn--sm" data-acesso="revogar-apresentacao">${icone('cadeado', 'icone--sm')}Revogar modo de apresentação</button></div></div></div>`
      : html`<div class="aviso aviso--atencao" role="status">${icone('aviso')}<div class="pilha pilha--sm"><p>O cliente ainda não vê o botão de modo de apresentação no dashboard dele.</p>
          <div><button class="btn btn--sec btn--sm" data-acesso="liberar-apresentacao">${icone('monitor', 'icone--sm')}Liberar modo de apresentação para o cliente</button></div></div></div>`;
  };

  function desenhar() {
    const pin = av.relatorio_senha;
    const link = linkDoRelatorio(av.token_relatorio);
    const texto = `Olá! O relatório de desempenho de ${nome} está disponível neste link: ${link}${pin ? `\nPIN de acesso: ${pin}` : ''}`;
    raiz.innerHTML = String(html`<section class="cartao pilha pilha--lg" aria-labelledby="h-acesso">
      <h2 id="h-acesso">Liberações/permissões para o cliente</h2>
      <div class="pilha"><h3>Dashboard do cliente</h3>
        ${publicada() ? liberacao() : ''}
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
      <div class="pilha pilha--sm" style="border-top:1px solid var(--color-border);padding-top:1rem"><h3>Modo de apresentação para o cliente</h3>
        <p class="muted">Além do dashboard, o cliente pode abrir os mesmos dados em tela cheia, slide a slide — a mesma apresentação que você usa aqui dentro.</p>
        ${liberacaoApresentacao()}
      </div>
    </section>`);
  }

  async function liberar(liberarAgora) {
    const { data, error } = await supabase.rpc('liberar_relatorio', { p_avaliacao_id: av.id, p_liberar: liberarAgora });
    if (error) return toast(mensagemDeErro(error, 'Não foi possível alterar a liberação.'), 'erro');
    av.relatorio_liberado_em = data;
    if (!liberarAgora) av.apresentacao_liberada_em = null; // revogar o dashboard revoga o modo de apresentação junto
    desenhar();
    aoAlterar?.();
    toast(liberarAgora ? 'Relatório liberado para o cliente.' : 'Acesso do cliente revogado: o link voltou a ficar travado.');
  }

  async function liberarApresentacao(liberarAgora) {
    const { data, error } = await supabase.rpc('liberar_apresentacao_cliente', { p_avaliacao_id: av.id, p_liberar: liberarAgora });
    if (error) return toast(mensagemDeErro(error, 'Não foi possível alterar o modo de apresentação.'), 'erro');
    av.apresentacao_liberada_em = data;
    desenhar();
    aoAlterar?.();
    toast(liberarAgora ? 'Modo de apresentação liberado para o cliente.' : 'Modo de apresentação revogado.');
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
    if (acao === 'liberar') {
      if (!(await confirmar({ titulo: 'Já apresentou o resultado?', descricao: `Só libere o dashboard para ${nome} depois de apresentar a avaliação. Ao confirmar que já foi apresentada, o link passa a abrir para o cliente${av.relatorio_senha ? ' (com o PIN)' : ''}. Você pode revogar a qualquer momento.`, rotuloConfirmar: 'Sim, já apresentei: liberar', perigo: false }))) return;
      return liberar(true);
    }
    if (acao === 'revogar') {
      if (!(await confirmar({ titulo: 'Revogar acesso do cliente', descricao: 'O link deixa de mostrar o relatório imediatamente. Você pode liberar de novo depois.', rotuloConfirmar: 'Revogar acesso' }))) return;
      return liberar(false);
    }
    if (acao === 'liberar-apresentacao') {
      if (!(await confirmar({ titulo: 'Liberar modo de apresentação', descricao: `O cliente passa a ver o botão "Modo de apresentação" no dashboard dele, com os mesmos dados em tela cheia. Você pode revogar a qualquer momento.`, rotuloConfirmar: 'Liberar modo de apresentação', perigo: false }))) return;
      return liberarApresentacao(true);
    }
    if (acao === 'revogar-apresentacao') {
      if (!(await confirmar({ titulo: 'Revogar modo de apresentação', descricao: 'O botão some do dashboard do cliente imediatamente. O dashboard em si continua liberado.', rotuloConfirmar: 'Revogar' }))) return;
      return liberarApresentacao(false);
    }
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
