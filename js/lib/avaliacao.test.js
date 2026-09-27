import test from 'node:test';
import assert from 'node:assert/strict';
import { acoesPermitidas, fimDoDia, linkEmail, linkWhatsApp, minutosEstimados, paraCampoData, prazoEncerrado, statusAoDesarquivar, telefoneParaWhatsApp, tituloDaNovaRodada, validarEnvio } from './avaliacao.js';

test('fim do dia escolhido, no fuso do navegador', () => {
  const d = fimDoDia('2026-10-09');
  assert.equal(d.getHours(), 23);
  assert.equal(d.getMinutes(), 59);
  assert.equal(d.getDate(), 9);
  assert.equal(fimDoDia('2026-02-31'), null);
  assert.equal(fimDoDia('09/10/2026'), null);
  assert.equal(paraCampoData(fimDoDia('2026-10-09')), '2026-10-09');
  assert.equal(paraCampoData(null), '');
});

test('prazo encerrado', () => {
  assert.equal(prazoEncerrado(null), false);
  assert.equal(prazoEncerrado('2026-01-01T00:00:00Z', new Date('2026-06-01')), true);
  assert.equal(prazoEncerrado('2026-12-01T00:00:00Z', new Date('2026-06-01')), false);
});

test('telefone para WhatsApp e links de compartilhamento', () => {
  assert.equal(telefoneParaWhatsApp('(54) 99999-0001'), '5554999990001');
  assert.equal(telefoneParaWhatsApp('5554999990001'), '5554999990001');
  assert.equal(telefoneParaWhatsApp('123'), '');
  assert.equal(linkWhatsApp({ telefone: '54999990001', texto: 'Olá & tudo?' }), 'https://wa.me/5554999990001?text=Ol%C3%A1%20%26%20tudo%3F');
  assert.equal(linkWhatsApp({ telefone: '', texto: 'oi' }), 'https://wa.me/?text=oi');
  assert.equal(linkEmail({ para: 'a@b.com', assunto: 'Assunto é', corpo: 'Linha 1\nhttps://x.y/#tok' }), 'mailto:a@b.com?subject=Assunto%20%C3%A9&body=Linha%201%0Ahttps%3A%2F%2Fx.y%2F%23tok');
});

test('tempo estimado', () => {
  assert.equal(minutosEstimados(30), 15);
  assert.equal(minutosEstimados(1), 1);
  assert.equal(minutosEstimados(0), 1);
});

test('ações permitidas por status', () => {
  assert.equal(acoesPermitidas('rascunho').enviar, true);
  assert.equal(acoesPermitidas('rascunho').compartilhar, false);
  assert.equal(acoesPermitidas('aguardando_resposta').estenderPrazo, true);
  assert.equal(acoesPermitidas('respondida').reabrir, true);
  assert.equal(acoesPermitidas('publicada').novaRodada, true);
  assert.equal(acoesPermitidas('arquivada').desarquivar, true);
  assert.equal(acoesPermitidas('arquivada').arquivar, false);
  assert.equal(acoesPermitidas('rascunho').regenerarLink, false);
});

test('validação do envio', () => {
  const agora = new Date('2026-06-01T12:00:00');
  assert.deepEqual(validarEnvio({ totalPerguntas: 5, prazo: '2026-06-10T23:59:59' }, agora), {});
  assert.ok(validarEnvio({ totalPerguntas: 0, prazo: '2026-06-10T23:59:59' }, agora).perguntas);
  assert.ok(validarEnvio({ totalPerguntas: 5, prazo: null }, agora).prazo);
  assert.ok(validarEnvio({ totalPerguntas: 5, prazo: '2026-05-01T23:59:59' }, agora).prazo);
});

test('desarquivar e nova rodada', () => {
  assert.equal(statusAoDesarquivar('2026-01-01'), 'respondida');
  assert.equal(statusAoDesarquivar(null), 'rascunho');
  assert.equal(tituloDaNovaRodada('Maturidade · 2026'), 'Maturidade · 2026 (rodada 2)');
  assert.equal(tituloDaNovaRodada('Maturidade (rodada 2)'), 'Maturidade (rodada 3)');
});
