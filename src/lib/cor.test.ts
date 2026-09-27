import { describe, expect, it } from 'vitest';
import { contraste, corSobre, hexParaRgb, variaveisDaMarca } from './cor';

describe('cor', () => {
  it('lê hex e rejeita valores inválidos', () => {
    expect(hexParaRgb('#2B4ACB')).toEqual([43, 74, 203]);
    expect(hexParaRgb('azul')).toBeNull();
  });

  it('escolhe o texto de maior contraste sobre a cor de destaque', () => {
    expect(corSobre([43, 74, 203])).toEqual([255, 255, 255]);
    expect(corSobre([250, 204, 21])).toEqual([11, 18, 48]);
  });

  it('mantém contraste AA da cor primária com o fundo nos dois temas', () => {
    const claro = variaveisDaMarca('#FACC15', 'claro');
    const escuro = variaveisDaMarca('#1E3A8A', 'escuro');
    expect(claro).not.toBeNull();
    expect(escuro).not.toBeNull();
    const c = hexParaRgb(claro!['--color-primary'])!;
    const e = hexParaRgb(escuro!['--color-primary'])!;
    expect(contraste(c, [248, 250, 252])).toBeGreaterThanOrEqual(4.5);
    expect(contraste(e, [30, 41, 59])).toBeGreaterThanOrEqual(4.5);
  });
});
