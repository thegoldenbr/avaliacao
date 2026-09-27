export const FAIXAS_PADRAO = [
  { id: 'critico', rotulo: 'Crítico', de: 0, ate: 4.9 },
  { id: 'atencao', rotulo: 'Atenção', de: 5, ate: 6.9 },
  { id: 'bom', rotulo: 'Bom', de: 7, ate: 8.4 },
  { id: 'excelente', rotulo: 'Excelente', de: 8.5, ate: 10 },
];

const arredondar = (n) => Math.round(n * 10) / 10;

/** Lê o JSON salvo; se estiver fora do formato esperado, usa as faixas padrão. */
export function lerFaixas(json) {
  if (!Array.isArray(json) || json.length !== 4) return FAIXAS_PADRAO;
  return json.map((item, i) => {
    const o = item ?? {};
    const padrao = FAIXAS_PADRAO[i];
    return {
      id: padrao.id,
      rotulo: typeof o.rotulo === 'string' ? o.rotulo : padrao.rotulo,
      de: typeof o.de === 'number' ? o.de : padrao.de,
      ate: typeof o.ate === 'number' ? o.ate : padrao.ate,
    };
  });
}

/** Monta as 4 faixas a partir dos 3 limites inferiores (atenção, bom, excelente). O fim de cada faixa é 0,1 abaixo do início da próxima. */
export function montarFaixas(atual, [atencao, bom, excelente]) {
  const rotulo = (i) => (atual[i] ?? FAIXAS_PADRAO[i]).rotulo;
  return [
    { id: 'critico', rotulo: rotulo(0), de: 0, ate: arredondar(atencao - 0.1) },
    { id: 'atencao', rotulo: rotulo(1), de: atencao, ate: arredondar(bom - 0.1) },
    { id: 'bom', rotulo: rotulo(2), de: bom, ate: arredondar(excelente - 0.1) },
    { id: 'excelente', rotulo: rotulo(3), de: excelente, ate: 10 },
  ];
}

/** Limites válidos: crescentes, entre 0,1 e 10. */
export function limitesValidos([atencao, bom, excelente]) {
  return [atencao, bom, excelente].every((n) => Number.isFinite(n) && n > 0 && n <= 10) && atencao < bom && bom < excelente;
}
