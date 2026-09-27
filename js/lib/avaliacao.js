/** Regras puras das avaliações: prazo, links de compartilhamento e transições de status. */
import { somenteDigitos } from './mascaras.js';

/** "2026-10-09" → Date às 23:59:59 do fuso do navegador (fim do dia escolhido). Devolve null se a data for inválida. */
export function fimDoDia(dataISO) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dataISO ?? ''));
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(ano, mes - 1, dia, 23, 59, 59);
  return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia ? d : null;
}

/** Date/ISO → "aaaa-mm-dd" no fuso do navegador (para preencher <input type="date">). */
export function paraCampoData(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** O prazo já passou? Sem prazo, nunca encerra. */
export function prazoEncerrado(prazo, agora = new Date()) {
  return Boolean(prazo) && new Date(prazo) < agora;
}

/** Telefone brasileiro para o WhatsApp (wa.me): só dígitos, com 55 na frente. Vazio se não houver telefone válido. */
export function telefoneParaWhatsApp(telefone) {
  const d = somenteDigitos(telefone);
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d;
  return '';
}

export function linkWhatsApp({ telefone, texto }) {
  const numero = telefoneParaWhatsApp(telefone);
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export function linkEmail({ para, assunto, corpo }) {
  return `mailto:${encodeURIComponent(para ?? '').replace('%40', '@')}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

/** Tempo estimado de resposta em minutos (meio minuto por pergunta, mínimo 1). */
export function minutosEstimados(totalPerguntas) {
  return Math.max(1, Math.round(totalPerguntas / 2));
}

/** Estados em que o formulário público aceita respostas. */
export const ACEITA_RESPOSTAS = ['aguardando_resposta'];

/** Ações permitidas em cada status (a interface só mostra o que faz sentido). */
export function acoesPermitidas(status) {
  return {
    editarSetup: status === 'rascunho',
    enviar: status === 'rascunho',
    compartilhar: status === 'aguardando_resposta',
    estenderPrazo: status === 'aguardando_resposta',
    reabrir: ['respondida', 'em_analise', 'publicada'].includes(status),
    novaRodada: ['respondida', 'em_analise', 'publicada', 'arquivada'].includes(status),
    arquivar: status !== 'arquivada',
    desarquivar: status === 'arquivada',
    regenerarLink: status !== 'rascunho',
  };
}

/** Validação do envio: precisa de pelo menos uma pergunta e de um prazo futuro. */
export function validarEnvio({ totalPerguntas, prazo }, agora = new Date()) {
  const erros = {};
  if (totalPerguntas < 1) erros.perguntas = 'A avaliação não tem perguntas. Volte e escolha um questionário com perguntas.';
  if (!prazo) erros.prazo = 'Escolha o prazo para responder.';
  else if (prazoEncerrado(prazo, agora)) erros.prazo = 'O prazo precisa ser hoje ou uma data futura.';
  return erros;
}

/** Status de destino ao desarquivar. */
export const statusAoDesarquivar = (respondidoEm) => (respondidoEm ? 'respondida' : 'rascunho');

/** Título sugerido para uma nova rodada a partir do título anterior. */
export function tituloDaNovaRodada(tituloAnterior) {
  const m = /\(rodada (\d+)\)$/.exec(tituloAnterior ?? '');
  if (m) return tituloAnterior.replace(/\(rodada \d+\)$/, `(rodada ${Number(m[1]) + 1})`);
  return `${tituloAnterior ?? 'Avaliação'} (rodada 2)`;
}
