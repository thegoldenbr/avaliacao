import test from 'node:test';
import assert from 'node:assert/strict';
import { montarSnapshot, normalizarOpcoes, problemasParaPublicar } from './snapshot.js';
import { calcularIndicadores } from './indicadores.js';
import { FAIXAS_PADRAO } from './faixas.js';
import { mdParaHtml } from '../markdown.js';

const q = (id, peso, nota, inv = false) => ({ id, enunciado: id, peso, nota, escala_invertida: inv });
const grupos = (n1, n2) => [
  { id: 'g1', grupo_origem_id: 'o1', nome: 'Estratégia', nome_curto: 'Estr', peso: 2, meta: 8, perguntas: [q('a', 1, n1)] },
  { id: 'g2', grupo_origem_id: 'o2', nome: 'Finanças', nome_curto: 'Fin', peso: 3, meta: null, perguntas: [q('b', 1, n2, true)] },
];
const atual = calcularIndicadores(grupos(8, 3));
const anterior = calcularIndicadores(grupos(6, 8));

test('snapshot autocontido com arredondamento, faixas e opções', () => {
  const s = montarSnapshot({ avaliacao: { titulo: 'T', periodo_referencia: '2026' }, empresa: { razao_social: 'Razão', nome_fantasia: 'Fantasia' }, indicadores: atual, faixas: FAIXAS_PADRAO, anterior, variacao: { geral: 1.06, anterior: 6.6 }, media: new Map([['o1', 7.25]]), conteudo: { resumo_executivo: 'x' }, opcoes: {} });
  assert.equal(s.empresa, 'Fantasia');
  assert.equal(s.geral.nota, 7.4); // (8*2 + 7*3) / 5
  assert.equal(s.grupos[0].meta, 8);
  assert.equal(s.grupos[0].anterior, 6);
  assert.equal(s.grupos[1].perguntas[0].nota, 7); // escala invertida 3 → 7
  assert.equal(s.grupos[0].media, 7.3);
  assert.equal(s.variacao.geral, 1.1);
  assert.equal(s.versao, 1);
});

test('opções escondem meta, anterior e média no snapshot', () => {
  const s = montarSnapshot({ avaliacao: { titulo: 'T' }, empresa: { razao_social: 'R' }, indicadores: atual, faixas: FAIXAS_PADRAO, anterior, variacao: { geral: 1, anterior: 6 }, media: new Map([['o1', 7]]), conteudo: {}, opcoes: { mostrarAnterior: false, mostrarMeta: false, mostrarMedia: false, ocultar: { o_que_evitar: true } } });
  assert.equal(s.variacao, null);
  assert.ok(s.grupos.every((g) => g.meta === null && g.anterior === null && g.media === null));
  assert.equal(s.opcoes.ocultar.o_que_evitar, true);
  assert.equal(normalizarOpcoes(undefined).mostrarMeta, true);
});

test('só publica com resumo e ao menos uma recomendação', () => {
  assert.equal(problemasParaPublicar({}).length, 2);
  assert.deepEqual(problemasParaPublicar({ resumo_executivo: 'ok', recomendacoes: [{}] }), []);
});

test('markdown básico é seguro: escapa HTML e só aceita negrito, itálico e listas', () => {
  const saida = String(mdParaHtml('**forte** e *suave*\n\n- item <b>1</b>\n- item 2\n\n<script>alert(1)</script> [x](javascript:alert(1)) ![i](x)'));
  assert.ok(saida.includes('<strong>forte</strong>') && saida.includes('<em>suave</em>'));
  assert.ok(saida.includes('<ul><li>item &lt;b&gt;1&lt;/b&gt;</li><li>item 2</li></ul>'));
  assert.ok(!saida.includes('<script') && !saida.includes('<img') && !saida.includes('<a '));
  assert.ok(saida.includes('&lt;script&gt;'));
  assert.equal(String(mdParaHtml('1. um\n2. dois')), '<ol><li>um</li><li>dois</li></ol>');
  assert.equal(String(mdParaHtml('')), '');
});
