import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularDigitos, cnpjValido, limparCnpj, mascararCnpj } from './cnpj.js';
import { mascararTelefone, telefoneValido, emailValido } from './mascaras.js';
import { formatarPercentual, percentuais } from './pesos.js';
import { FAIXAS_PADRAO, lerFaixas, limitesValidos, montarFaixas } from './faixas.js';
import { contraste, corSobre, hexParaRgb, variaveisDaMarca } from './cor.js';
import { html, raw, esc } from '../html.js';

test('CNPJ numérico', () => {
  assert.equal(cnpjValido('11.222.333/0001-81'), true);
  assert.equal(cnpjValido('11.222.333/0001-82'), false);
  assert.equal(cnpjValido('00.000.000/0000-00'), false);
  assert.equal(cnpjValido('11111111111111'), false);
});

test('CNPJ alfanumérico: exemplo oficial da Receita', () => {
  assert.equal(calcularDigitos('12ABC34501DE'), '35');
  assert.equal(cnpjValido('12.ABC.345/01DE-35'), true);
  assert.equal(cnpjValido('12abc34501de35'), true);
  assert.equal(cnpjValido('12.ABC.345/01DE-36'), false);
  assert.equal(cnpjValido('12.ABC.345/01DE'), false);
  assert.equal(cnpjValido('12.ABC.345/01DE-3A'), false);
});

test('CNPJ do seed são válidos', () => {
  for (const c of ['12345678000195', '23456789000195', '34567890000130']) assert.equal(cnpjValido(c), true, c);
});

test('máscara de CNPJ e telefone', () => {
  assert.equal(limparCnpj('12.abc.345/01de-35'), '12ABC34501DE35');
  assert.equal(mascararCnpj('12abc34501de35'), '12.ABC.345/01DE-35');
  assert.equal(mascararCnpj('1122'), '11.22');
  assert.equal(mascararTelefone('54999990001'), '(54) 99999-0001');
  assert.equal(mascararTelefone('5433334444'), '(54) 3333-4444');
  assert.equal(telefoneValido('(54) 9999-99'), false);
  assert.equal(telefoneValido(''), true);
  assert.equal(emailValido('a@b.co'), true);
  assert.equal(emailValido('a@b'), false);
});

test('pesos relativos', () => {
  const [a, b] = percentuais([2, 1]);
  assert.ok(Math.abs(a - 66.67) < 0.01 && Math.abs(b - 33.33) < 0.01);
  assert.deepEqual(percentuais([]), []);
  assert.deepEqual(percentuais([0, 0]), [0, 0]);
  assert.equal(formatarPercentual(16.7), '17%');
  assert.equal(formatarPercentual(0.2), '<1%');
});

test('faixas de classificação', () => {
  assert.deepEqual(montarFaixas(FAIXAS_PADRAO, [5, 7, 8.5]), FAIXAS_PADRAO);
  const [critico, atencao] = montarFaixas(FAIXAS_PADRAO, [6, 7.5, 9]);
  assert.equal(critico.ate, 5.9);
  assert.equal(atencao.ate, 7.4);
  assert.equal(limitesValidos([5, 7, 8.5]), true);
  assert.equal(limitesValidos([7, 5, 8.5]), false);
  assert.equal(limitesValidos([5, 7, 11]), false);
  assert.deepEqual(lerFaixas(null), FAIXAS_PADRAO);
});

test('cor de destaque mantém contraste AA nos dois temas', () => {
  assert.deepEqual(hexParaRgb('#2B4ACB'), [43, 74, 203]);
  assert.equal(hexParaRgb('azul'), null);
  assert.deepEqual(corSobre([43, 74, 203]), [255, 255, 255]);
  const claro = variaveisDaMarca('#FACC15', 'claro');
  const escuro = variaveisDaMarca('#1E3A8A', 'escuro');
  assert.ok(contraste(hexParaRgb(claro['--color-primary']), [248, 250, 252]) >= 4.5);
  assert.ok(contraste(hexParaRgb(escuro['--color-primary']), [30, 41, 59]) >= 4.5);
});

test('html`` escapa o que vem de fora e preserva raw()', () => {
  const perigoso = '<img src=x onerror=alert(1)> "aspas" & \'apóstrofo\'';
  const saida = String(html`<p title="${perigoso}">${perigoso}</p>`);
  assert.ok(!saida.includes('<img'));
  assert.ok(saida.includes('&lt;img'));
  assert.ok(!saida.includes('"aspas"'));
  assert.equal(String(html`<b>${raw('<i>ok</i>')}</b>`), '<b><i>ok</i></b>');
  assert.equal(String(html`${[html`<li>${'a<'}</li>`, null, false, 'b']}`), '<li>a&lt;</li>b');
  assert.equal(esc(null), '');
});
