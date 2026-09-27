import { describe, expect, it } from 'vitest';
import { formatarPercentual, percentuais } from './pesos';

describe('pesos relativos', () => {
  it('divide cada peso pela soma', () => {
    const [a, b] = percentuais([2, 1]);
    expect(a).toBeCloseTo(66.67, 1);
    expect(b).toBeCloseTo(33.33, 1);
  });

  it('não quebra com lista vazia ou soma zero', () => {
    expect(percentuais([])).toEqual([]);
    expect(percentuais([0, 0])).toEqual([0, 0]);
  });

  it('formata como inteiro e sinaliza valores muito pequenos', () => {
    expect(formatarPercentual(16.7)).toBe('17%');
    expect(formatarPercentual(0.2)).toBe('<1%');
    expect(formatarPercentual(0)).toBe('0%');
  });
});
