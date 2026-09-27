/**
 * Cálculo dos indicadores. Funções PURAS e determinísticas: a IA nunca calcula notas.
 * Fonte única da verdade: este arquivo é usado pelo navegador e copiado para
 * supabase/functions/_shared/indicadores.js (Edge Function gerar-relatorio) por `npm run compartilhar`;
 * um teste garante que as duas cópias são idênticas.
 *
 * Entrada (snapshot da avaliação + respostas):
 *   grupos: [{ id, nome, nome_curto, peso, meta, perguntas: [{ id, enunciado, peso, escala_invertida, nota }] }]
 *   `nota` é a resposta bruta (0–10) ou null/undefined quando não respondida.
 */

/** Uma casa decimal, sem surpresas de ponto flutuante (6,95 → 7,0). */
export const arredondar = (valor) => Math.round((valor + Number.EPSILON) * 10) / 10;

/** Nota efetiva da pergunta: n' = escala_invertida ? 10 − n : n. */
export const notaEfetiva = (nota, invertida) => (invertida ? 10 - nota : nota);

const respondida = (p) => p.nota !== null && p.nota !== undefined;
const soma = (lista, fn) => lista.reduce((total, item) => total + fn(item), 0);

/** Média ponderada das notas efetivas das perguntas respondidas (null se nenhuma). */
export function notaDoGrupo(perguntas) {
  const validas = perguntas.filter(respondida);
  const pesos = soma(validas, (p) => p.peso);
  if (!validas.length || pesos <= 0) return null;
  return soma(validas, (p) => notaEfetiva(p.nota, p.escala_invertida) * p.peso) / pesos;
}

/** Desvio-padrão ponderado das notas efetivas (dispersão dentro do grupo). */
export function dispersaoDoGrupo(perguntas) {
  const validas = perguntas.filter(respondida);
  const pesos = soma(validas, (p) => p.peso);
  if (validas.length < 2 || pesos <= 0) return 0;
  const media = soma(validas, (p) => notaEfetiva(p.nota, p.escala_invertida) * p.peso) / pesos;
  const variancia = soma(validas, (p) => p.peso * (notaEfetiva(p.nota, p.escala_invertida) - media) ** 2) / pesos;
  return Math.sqrt(variancia);
}

/** Faixa da nota JÁ ARREDONDADA, para o rótulo nunca contradizer o número exibido. Sem nota → null. */
export function classificar(nota, faixas) {
  if (nota === null || nota === undefined) return null;
  const n = arredondar(nota);
  return faixas.find((f) => n >= f.de && n <= f.ate) ?? (n < faixas[0].de ? faixas[0] : faixas[faixas.length - 1]);
}

/**
 * Indicadores completos: nota geral, nota e peso relativo de cada grupo e, por pergunta,
 * nota efetiva, peso efetivo (participação na nota geral) e ganho potencial.
 * Ganho potencial = (10 − n') × peso efetivo: quanto a nota geral subiria se a pergunta chegasse a 10.
 */
export function calcularIndicadores(grupos) {
  const pesoTotal = soma(grupos, (g) => g.peso);
  const resultadoGrupos = grupos.map((g) => {
    const pesoGrupo = pesoTotal > 0 ? g.peso / pesoTotal : 0;
    const pesoPerguntas = soma(g.perguntas, (p) => p.peso);
    const perguntas = g.perguntas.map((p) => {
      const pesoNoGrupo = pesoPerguntas > 0 ? p.peso / pesoPerguntas : 0;
      const efetiva = respondida(p) ? notaEfetiva(p.nota, p.escala_invertida) : null;
      const pesoEfetivo = pesoNoGrupo * pesoGrupo;
      return {
        id: p.id,
        enunciado: p.enunciado,
        peso: p.peso,
        nota: respondida(p) ? p.nota : null,
        notaEfetiva: efetiva,
        invertida: Boolean(p.escala_invertida),
        pesoNoGrupo,
        pesoEfetivo,
        ganhoPotencial: efetiva === null ? 0 : (10 - efetiva) * pesoEfetivo,
        comentario: p.comentario ?? null,
      };
    });
    return {
      id: g.id,
      grupoOrigemId: g.grupo_origem_id ?? null,
      nome: g.nome,
      nomeCurto: g.nome_curto,
      meta: g.meta ?? null,
      pesoRelativo: pesoGrupo,
      nota: notaDoGrupo(g.perguntas),
      dispersao: dispersaoDoGrupo(g.perguntas),
      perguntas,
    };
  });

  const comNota = resultadoGrupos.filter((g) => g.nota !== null);
  const pesosComNota = soma(comNota, (g) => g.pesoRelativo);
  const geral = comNota.length && pesosComNota > 0 ? soma(comNota, (g) => g.nota * g.pesoRelativo) / pesosComNota : null;
  return { geral, grupos: resultadoGrupos };
}

const porNota = (a, b) => a.nota - b.nota;

/**
 * Insights automáticos a partir dos indicadores (e, se houver, dos indicadores da avaliação anterior
 * do mesmo modelo, casando os grupos por grupoOrigemId ou pelo nome).
 */
export function gerarInsights(indicadores, { anterior = null, dispersaoAlta = 2.5, quantidade = 3 } = {}) {
  const grupos = indicadores.grupos.filter((g) => g.nota !== null);
  const perguntas = indicadores.grupos.flatMap((g) => g.perguntas.filter((p) => p.notaEfetiva !== null).map((p) => ({ ...p, grupo: g.nome, nota: p.notaEfetiva })));

  const ordenadosGrupos = [...grupos].sort(porNota);
  const ordenadasPerguntas = [...perguntas].sort((a, b) => a.nota - b.nota || b.ganhoPotencial - a.ganhoPotencial);
  const enxuto = (g) => ({ id: g.id, nome: g.nome, nota: g.nota });

  const casar = (g) => anterior?.grupos.find((a) => (g.grupoOrigemId && a.grupoOrigemId === g.grupoOrigemId) || a.nome === g.nome) ?? null;
  const variacaoGrupos = anterior
    ? grupos.flatMap((g) => {
        const ant = casar(g);
        return ant && ant.nota !== null ? [{ id: g.id, nome: g.nome, anterior: ant.nota, atual: g.nota, variacao: g.nota - ant.nota }] : [];
      })
    : [];

  return {
    maioresGrupos: ordenadosGrupos.slice(-quantidade).reverse().map(enxuto),
    menoresGrupos: ordenadosGrupos.slice(0, quantidade).map(enxuto),
    maioresPerguntas: [...ordenadasPerguntas].slice(-quantidade).reverse(),
    menoresPerguntas: ordenadasPerguntas.slice(0, quantidade),
    prioridades: [...perguntas].filter((p) => p.ganhoPotencial > 0).sort((a, b) => b.ganhoPotencial - a.ganhoPotencial).slice(0, 5),
    dispersaoAlta: indicadores.grupos
      .filter((g) => g.dispersao >= dispersaoAlta && g.perguntas.filter((p) => p.notaEfetiva !== null).length >= 2)
      .map((g) => {
        const notas = g.perguntas.filter((p) => p.notaEfetiva !== null).map((p) => p.notaEfetiva);
        return { id: g.id, nome: g.nome, minimo: Math.min(...notas), maximo: Math.max(...notas), desvio: g.dispersao };
      }),
    distanciaMeta: grupos.filter((g) => g.meta !== null).map((g) => ({ id: g.id, nome: g.nome, nota: g.nota, meta: g.meta, distancia: g.meta - g.nota })),
    variacao: anterior && anterior.geral !== null && indicadores.geral !== null ? { geral: indicadores.geral - anterior.geral, anterior: anterior.geral, grupos: variacaoGrupos } : null,
  };
}

/** Média por grupo (casando por grupoOrigemId) entre várias avaliações; só devolve com pelo menos `minimo` avaliações. */
export function mediaDosGrupos(listaDeIndicadores, minimo = 5) {
  if (listaDeIndicadores.length < minimo) return null;
  const acumulado = new Map();
  for (const ind of listaDeIndicadores) {
    for (const g of ind.grupos) {
      if (g.nota === null || !g.grupoOrigemId) continue;
      const atual = acumulado.get(g.grupoOrigemId) ?? { soma: 0, n: 0 };
      atual.soma += g.nota;
      atual.n += 1;
      acumulado.set(g.grupoOrigemId, atual);
    }
  }
  return new Map([...acumulado].map(([id, { soma: s, n }]) => [id, s / n]));
}
