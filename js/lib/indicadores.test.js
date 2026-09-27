import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arredondar, calcularIndicadores, classificar, dispersaoDoGrupo, gerarInsights, mediaDosGrupos, notaDoGrupo, notaEfetiva } from './indicadores.js';
import { nomeDeArquivo, paraCsv } from './csv.js';
import { FAIXAS_PADRAO } from './faixas.js';

const q = (id, peso, nota, escala_invertida = false) => ({ id, enunciado: id, peso, nota, escala_invertida });

// Caso obrigatório da especificação (seção 7)
const CASO = [
  { id: 'A', nome: 'A', nome_curto: 'A', peso: 2, meta: null, perguntas: [q('a1', 1, 8), q('a2', 3, 6)] },
  { id: 'B', nome: 'B', nome_curto: 'B', peso: 1, meta: null, perguntas: [q('b1', 1, 9)] },
];

test('caso obrigatório: grupo A = 6,5; grupo B = 9,0; nota geral = 7,3', () => {
  const ind = calcularIndicadores(CASO);
  assert.equal(ind.grupos[0].nota, 6.5);
  assert.equal(ind.grupos[1].nota, 9);
  assert.equal(arredondar(ind.geral), 7.3);
  assert.ok(Math.abs(ind.geral - 22 / 3) < 1e-12);
});

test('caso obrigatório: ganho potencial da pergunta de nota 6 = 2,0', () => {
  const p = calcularIndicadores(CASO).grupos[0].perguntas[1];
  assert.ok(Math.abs(p.pesoEfetivo - (3 / 4) * (2 / 3)) < 1e-12);
  assert.ok(Math.abs(p.ganhoPotencial - 2) < 1e-12);
});

test('caso obrigatório: escala invertida respondida com 2 vale 8', () => {
  assert.equal(notaEfetiva(2, true), 8);
  assert.equal(notaEfetiva(2, false), 2);
  assert.equal(notaDoGrupo([q('x', 1, 2, true)]), 8);
});

test('perguntas sem resposta não entram na média nem no ganho', () => {
  const grupo = [q('a', 1, 10), q('b', 1, null)];
  assert.equal(notaDoGrupo(grupo), 10);
  assert.equal(notaDoGrupo([q('c', 1, undefined)]), null);
  const ind = calcularIndicadores([{ id: 'g', nome: 'g', nome_curto: 'g', peso: 1, perguntas: grupo }]);
  assert.equal(ind.grupos[0].perguntas[1].ganhoPotencial, 0);
});

test('arredondamento sem surpresas e classificação pela nota arredondada', () => {
  assert.equal(arredondar(6.95), 7);
  assert.equal(arredondar(7.333), 7.3);
  assert.equal(arredondar(1.005), 1);
  // 6,96 arredonda para 7,0 → "Bom", nunca "Atenção 7,0"
  assert.equal(classificar(6.96, FAIXAS_PADRAO).id, 'bom');
  assert.equal(classificar(6.94, FAIXAS_PADRAO).id, 'atencao');
  assert.equal(classificar(8.45, FAIXAS_PADRAO).id, 'excelente'); // 8,45 → 8,5
  assert.equal(classificar(4.9, FAIXAS_PADRAO).id, 'critico');
  assert.equal(classificar(10, FAIXAS_PADRAO).id, 'excelente');
  assert.equal(classificar(0, FAIXAS_PADRAO).id, 'critico');
  assert.equal(classificar(null, FAIXAS_PADRAO), null);
});

test('dispersão alta é detectada', () => {
  assert.equal(dispersaoDoGrupo([q('a', 1, 5)]), 0);
  assert.ok(dispersaoDoGrupo([q('a', 1, 2), q('b', 1, 9)]) > 3);
  const ind = calcularIndicadores([{ id: 'g', nome: 'Finanças', nome_curto: 'F', peso: 1, perguntas: [q('a', 1, 2), q('b', 1, 9), q('c', 1, 8)] }]);
  const ins = gerarInsights(ind);
  assert.equal(ins.dispersaoAlta.length, 1);
  assert.equal(ins.dispersaoAlta[0].minimo, 2);
  assert.equal(ins.dispersaoAlta[0].maximo, 9);
});

test('insights: maiores/menores, prioridades, meta e variação', () => {
  const atual = calcularIndicadores([
    { id: 'g1', grupo_origem_id: 'o1', nome: 'Estratégia', nome_curto: 'E', peso: 2, meta: 8, perguntas: [q('p1', 3, 8), q('p2', 1, 7)] },
    { id: 'g2', grupo_origem_id: 'o2', nome: 'Finanças', nome_curto: 'F', peso: 3, meta: 8, perguntas: [q('p3', 3, 2), q('p4', 2, 9)] },
    { id: 'g3', grupo_origem_id: 'o3', nome: 'Pessoas', nome_curto: 'P', peso: 2, meta: null, perguntas: [q('p5', 1, 9)] },
    { id: 'g4', grupo_origem_id: 'o4', nome: 'Tecnologia', nome_curto: 'T', peso: 1, meta: 8, perguntas: [q('p6', 1, 5)] },
  ]);
  const anterior = calcularIndicadores([
    { id: 'h1', grupo_origem_id: 'o1', nome: 'Estratégia', nome_curto: 'E', peso: 2, perguntas: [q('x', 1, 6)] },
    { id: 'h2', grupo_origem_id: 'o2', nome: 'Finanças', nome_curto: 'F', peso: 3, perguntas: [q('y', 1, 4)] },
  ]);
  const ins = gerarInsights(atual, { anterior });
  assert.deepEqual(ins.maioresGrupos.map((g) => g.nome), ['Pessoas', 'Estratégia', 'Tecnologia']);
  assert.deepEqual(ins.menoresGrupos.map((g) => g.nome), ['Finanças', 'Tecnologia', 'Estratégia']);
  assert.equal(ins.menoresPerguntas[0].id, 'p3');
  assert.equal(ins.prioridades[0].id, 'p3'); // maior ganho potencial
  assert.equal(ins.distanciaMeta.length, 3);
  assert.ok(ins.distanciaMeta.find((d) => d.nome === 'Finanças').distancia > 0);
  assert.ok(ins.variacao.geral !== 0);
  assert.equal(ins.variacao.grupos.find((g) => g.nome === 'Estratégia').variacao > 0, true);
  assert.equal(ins.variacao.grupos.length, 2); // só grupos presentes nas duas avaliações
});

test('média das empresas só com pelo menos 5 avaliações', () => {
  const um = (nota) => calcularIndicadores([{ id: 'g', grupo_origem_id: 'o1', nome: 'g', nome_curto: 'g', peso: 1, perguntas: [q('p', 1, nota)] }]);
  assert.equal(mediaDosGrupos([um(5), um(6), um(7), um(8)]), null);
  const media = mediaDosGrupos([um(4), um(6), um(7), um(8), um(10)]);
  assert.equal(media.get('o1'), 7);
});

test('CSV para o Excel: BOM, ponto e vírgula, vírgula decimal e proteção contra fórmulas', () => {
  const csv = paraCsv([['Grupo', 'Nota', 'Comentário'], ['Finanças', 7.3, 'Disse "ok"; e mais\nlinha'], ['X', 6, '=SOMA(A1)']]);
  assert.ok(csv.startsWith('﻿'));
  assert.ok(csv.includes('Grupo;Nota;Comentário'));
  assert.ok(csv.includes('Finanças;7,3;"Disse ""ok""; e mais\nlinha"'));
  assert.ok(csv.includes("X;6;'=SOMA(A1)"));
  assert.equal(nomeDeArquivo('Serra Azul — 2º sem. 2026'), 'serra-azul-2-sem-2026');
});

test('cópia da Edge Function é idêntica à fonte (rode npm run compartilhar se falhar)', () => {
  const fonte = readFileSync(new URL('./indicadores.js', import.meta.url), 'utf8');
  const copia = readFileSync(new URL('../../supabase/functions/_shared/indicadores.js', import.meta.url), 'utf8');
  assert.equal(copia, fonte);
});
