import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emailInterno, entradaParaEmail, gerarUsuario, palavrasDoNome, problemasDaSenha, problemasDoPin } from './usuarios.js';

test('usuário = primeiro.último nome, sem acentos nem símbolos', () => {
  assert.equal(gerarUsuario('João da Silva'), 'joao.silva');
  assert.equal(gerarUsuario('  Maria   Conceição  Ávila '), 'maria.avila');
  assert.equal(gerarUsuario("Ana O'Neil-Souza"), 'ana.oneilsouza');
  assert.equal(gerarUsuario('José'), null);
  assert.equal(gerarUsuario(''), null);
  assert.deepEqual(palavrasDoNome('Çélia D’Ávila'), ['celia', 'davila']);
});

test('usuário repetido ganha número', () => {
  assert.equal(gerarUsuario('João Silva', ['joao.silva']), 'joao.silva2');
  assert.equal(gerarUsuario('João Silva', ['joao.silva', 'JOAO.SILVA2']), 'joao.silva3');
});

test('login por usuário vira o e-mail interno; e-mail real fica como está', () => {
  assert.equal(emailInterno('Joao.Silva'), 'joao.silva@radar.local');
  assert.equal(entradaParaEmail(' Joao.Silva '), 'joao.silva@radar.local');
  assert.equal(entradaParaEmail('Ana@Empresa.com'), 'ana@empresa.com');
});

test('nova senha precisa ser diferente da inicial e minimamente forte', () => {
  assert.ok(problemasDaSenha('123456').length >= 2);
  assert.ok(problemasDaSenha('abc').length);
  assert.ok(problemasDaSenha('joao.silva', { usuario: 'joao.silva' }).length);
  assert.ok(problemasDaSenha('aaaaaaaa').length);
  assert.deepEqual(problemasDaSenha('Cav4lo-Azul'), []);
});

test('PIN de 6 dígitos sem sequências óbvias', () => {
  for (const ruim of ['12345', '1234567', 'abcdef', '000000', '111111', '123456', '654321', '345678']) assert.ok(problemasDoPin(ruim).length, ruim);
  for (const bom of ['482913', '907142', '135791']) assert.deepEqual(problemasDoPin(bom), [], bom);
});

test('cópia da Edge Function é idêntica à fonte', () => {
  const fonte = readFileSync(new URL('./usuarios.js', import.meta.url), 'utf8');
  const copia = readFileSync(new URL('../../supabase/functions/_shared/usuarios.js', import.meta.url), 'utf8');
  assert.equal(copia, fonte, 'rode npm run compartilhar');
});
