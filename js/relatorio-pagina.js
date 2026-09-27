/**
 * Monta a página do relatório (o que o cliente vê): cabeçalho com marca e botões de exportação, conteúdo e rodapé.
 * Usada pelo dashboard público (relatorio.html) e pela prévia interna (previa-cliente.html).
 */
import { html } from './html.js';
import { icone } from './icones.js';
import { renderRelatorio } from './relatorio-vista.js';
import { baixarDataUrl, svgParaPng } from './radar-export.js';
import { nomeDeArquivo } from './lib/csv.js';
import { toast } from './ui.js';

/** O snapshot publicado precisa ter o formato atual; relatórios antigos/de exemplo pedem nova publicação. */
export const snapshotValido = (c) => Boolean(c && c.versao === 1 && c.geral && Array.isArray(c.grupos) && Array.isArray(c.faixas) && c.opcoes);

export function cabecalhoDaMarca(marca, acoes = '') {
  const logo = marca?.logo_url
    ? html`<img src="${marca.logo_url}" alt="" class="marca-logo" style="object-fit:contain;background:none">`
    : html`<span class="marca-logo" aria-hidden="true">${(marca?.nome ?? 'R').charAt(0).toUpperCase()}</span>`;
  return html`<div class="linha linha--entre"><span class="marca">${logo}<span>${marca?.nome ?? 'Radar de Desempenho'}</span></span>${acoes}</div>`;
}

/** Desenha o relatório em `raiz`. `aviso` (HTML seguro) aparece no topo, útil para a prévia interna. */
export function montarPaginaDoRelatorio(raiz, { snapshot, marca, rodape, aviso = '' }) {
  let corpo;
  try {
    corpo = renderRelatorio(snapshot, { animar: true });
  } catch {
    raiz.innerHTML = String(html`<div class="rel"><header>${cabecalhoDaMarca(marca)}</header><p class="erro-geral" role="alert">Não foi possível montar este relatório. Publique-o novamente pelo editor.</p></div>`);
    return;
  }
  raiz.innerHTML = String(html`<div class="rel">
    ${aviso}
    <header>${cabecalhoDaMarca(marca, html`<div class="linha"><button class="btn btn--sec btn--sm" id="btn-png">${icone('imagem', 'icone--sm')}Radar (PNG)</button><button class="btn btn--sec btn--sm" id="btn-pdf">${icone('baixar', 'icone--sm')}Baixar PDF</button></div>`)}</header>
    ${corpo}
    <footer class="muted"><hr class="divisor" style="margin-bottom:1rem">${rodape ?? ''}</footer></div>`);

  const nomeBase = nomeDeArquivo(`${snapshot.empresa}-${snapshot.titulo}`);
  raiz.querySelector('#btn-pdf').addEventListener('click', async (e) => {
    const botao = e.currentTarget;
    const original = botao.innerHTML;
    botao.disabled = true;
    botao.textContent = 'Gerando PDF…';
    try {
      const { gerarPdf } = await import('./pdf.js'); // carregado só quando pedido
      const doc = await gerarPdf(snapshot, { marca, rodape });
      doc.save(`${nomeBase}.pdf`);
    } catch (erro) {
      toast(erro.message || 'Não foi possível gerar o PDF. Tente de novo.', 'erro');
    }
    botao.disabled = false;
    botao.innerHTML = original;
  });
  raiz.querySelector('#btn-png').addEventListener('click', async () => {
    try {
      const { radarDoSnapshot } = await import('./pdf.js');
      const png = await svgParaPng(radarDoSnapshot(snapshot), 3);
      baixarDataUrl(png.dataUrl, `${nomeBase}-radar.png`);
    } catch {
      toast('Não foi possível gerar a imagem do radar.', 'erro');
    }
  });
}
