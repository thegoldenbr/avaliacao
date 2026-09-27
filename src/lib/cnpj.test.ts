import { describe, expect, it } from 'vitest';
import { calcularDigitos, cnpjValido, limparCnpj, mascararCnpj } from './cnpj';
import { mascararTelefone, telefoneValido } from './mascaras';

describe('cnpj', () => {
  it('valida o formato numérico', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11.222.333/0001-82')).toBe(false);
    expect(cnpjValido('00.000.000/0000-00')).toBe(false);
    expect(cnpjValido('11111111111111')).toBe(false);
  });

  it('valida o exemplo oficial do formato alfanumérico', () => {
    expect(calcularDigitos('12ABC34501DE')).toBe('35');
    expect(cnpjValido('12.ABC.345/01DE-35')).toBe(true);
    expect(cnpjValido('12abc34501de35')).toBe(true);
    expect(cnpjValido('12.ABC.345/01DE-36')).toBe(false);
  });

  it('rejeita tamanho errado e letras no dígito verificador', () => {
    expect(cnpjValido('12.ABC.345/01DE')).toBe(false);
    expect(cnpjValido('12.ABC.345/01DE-3A')).toBe(false);
  });

  it('limpa e mascara progressivamente', () => {
    expect(limparCnpj('12.abc.345/01de-35')).toBe('12ABC34501DE35');
    expect(mascararCnpj('12abc34501de35')).toBe('12.ABC.345/01DE-35');
    expect(mascararCnpj('12abc')).toBe('12.ABC');
    expect(mascararCnpj('1122')).toBe('11.22');
  });
});

describe('telefone', () => {
  it('mascara celular e fixo', () => {
    expect(mascararTelefone('54999990001')).toBe('(54) 99999-0001');
    expect(mascararTelefone('5433334444')).toBe('(54) 3333-4444');
    expect(mascararTelefone('54')).toBe('(54');
  });

  it('exige DDD + 8 ou 9 dígitos; vazio é aceito', () => {
    expect(telefoneValido('(54) 9999-99')).toBe(false);
    expect(telefoneValido('(54) 99999-0001')).toBe(true);
    expect(telefoneValido('')).toBe(true);
  });
});
