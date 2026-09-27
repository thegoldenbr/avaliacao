import { describe, expect, it } from 'vitest';
import { FAIXAS_PADRAO, limitesValidos, lerFaixas, montarFaixas } from './faixas';

describe('faixas de classificação', () => {
  it('reproduz as faixas padrão a partir dos limites 5, 7 e 8,5', () => {
    expect(montarFaixas(FAIXAS_PADRAO, [5, 7, 8.5])).toEqual(FAIXAS_PADRAO);
  });

  it('recalcula o fim de cada faixa quando os limites mudam', () => {
    const [critico, atencao, bom, excelente] = montarFaixas(FAIXAS_PADRAO, [6, 7.5, 9]);
    expect(critico?.ate).toBe(5.9);
    expect(atencao).toMatchObject({ de: 6, ate: 7.4 });
    expect(bom).toMatchObject({ de: 7.5, ate: 8.9 });
    expect(excelente).toMatchObject({ de: 9, ate: 10 });
  });

  it('só aceita limites crescentes entre 0 e 10', () => {
    expect(limitesValidos([5, 7, 8.5])).toBe(true);
    expect(limitesValidos([7, 5, 8.5])).toBe(false);
    expect(limitesValidos([5, 7, 11])).toBe(false);
    expect(limitesValidos([0, 7, 8])).toBe(false);
  });

  it('cai no padrão quando o JSON salvo é inválido', () => {
    expect(lerFaixas(null)).toEqual(FAIXAS_PADRAO);
    expect(lerFaixas([{ id: 'x' }])).toEqual(FAIXAS_PADRAO);
  });
});
