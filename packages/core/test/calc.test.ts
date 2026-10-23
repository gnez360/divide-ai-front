import { describe, expect, it } from 'vitest';
import { largestRemainder, percentAmount } from '../src/calc.js';

describe('largestRemainder (Maior Resto)', () => {
  it('R$100 ÷ 3 → 33,33 / 33,33 / 33,34', () => {
    const r = largestRemainder(
      10000n,
      [
        ['a', 1n],
        ['b', 1n],
        ['c', 1n],
      ],
      3n,
      'item:x',
    );
    const vals = [...r.values()].sort((x, y) => (x < y ? -1 : 1));
    expect(vals).toEqual([3333n, 3333n, 3334n]);
    const sum = [...r.values()].reduce((s, v) => s + v, 0n);
    expect(sum).toBe(10000n);
  });

  it('divide por 6: exato', () => {
    const r = largestRemainder(
      6000n,
      [
        ['a', 1n],
        ['b', 1n],
        ['c', 1n],
        ['d', 1n],
        ['e', 1n],
        ['f', 1n],
      ],
      6n,
      'item:y',
    );
    expect([...r.values()].every((v) => v === 1000n)).toBe(true);
  });

  it('divide por 3, 7 e 6: Σ partes = total (3 vetores obrigatórios)', () => {
    for (const [nPeople, total] of [
      [3, 10000n],
      [7, 9999n],
      [6, 5001n],
    ] as const) {
      const weights = Array.from({ length: nPeople }, (_, i): [string, bigint] => [`p${i}`, 1n]);
      const r = largestRemainder(total, weights, BigInt(nPeople), 'ctx');
      const sum = [...r.values()].reduce((s, v) => s + v, 0n);
      expect(sum).toBe(total);
    }
  });

  it('serviço de Nery: (2100 × 4000) / 21000 = 400 (não 700)', () => {
    const r = largestRemainder(
      2100n,
      [
        ['nery', 4000n],
        ['maria', 5900n],
        ['outros', 11100n],
      ],
      21000n,
      'charge:s',
    );
    expect(r.get('nery')).toBe(400n);
    expect(r.get('maria')).toBe(590n);
  });

  it('percentual 30% sobre 3000 = 900 (não 1500)', () => {
    const r = largestRemainder(
      3000n,
      [
        ['a', 3000n],
        ['b', 3000n],
        ['c', 4000n],
      ],
      10000n,
      'item:p',
    );
    expect(r.get('a')).toBe(900n);
    expect(r.get('b')).toBe(900n);
    expect(r.get('c')).toBe(1200n);
  });

  it('pesos < denominador: sobra NÃO distribuída (sem dono)', () => {
    // 2 de 4 unidades distribuídas em LINE_TOTAL de 1000
    const r = largestRemainder(1000n, [['a', 2n]], 4n, 'item:u');
    expect(r.get('a')).toBe(500n); // 1000 × 2/4 — e 500 ficam sem dono
  });

  it('empate de resto quebra por hash determinístico', () => {
    const a = largestRemainder(
      100n,
      [
        ['x', 1n],
        ['y', 1n],
      ],
      2n,
      'ctx:t',
    );
    const b2 = largestRemainder(
      100n,
      [
        ['y', 1n],
        ['x', 1n],
      ],
      2n,
      'ctx:t',
    );
    expect(a.get('x')).toBe(b2.get('x'));
    expect([...a.values()].reduce((s, v) => s + v, 0n)).toBe(100n);
  });

  it('total negativo (ajuste) distribui com sinal', () => {
    const r = largestRemainder(
      -5n,
      [
        ['a', 3n],
        ['b', 1n],
      ],
      4n,
      'bill:z',
    );
    const sum = [...r.values()].reduce((s, v) => s + v, 0n);
    expect(sum).toBe(-5n);
  });
});

describe('percentAmount (meio para cima)', () => {
  it('10% de 21000 = 2100', () => {
    expect(percentAmount(21000n, 1000n)).toBe(2100n);
  });
  it('arredonda meio para cima', () => {
    expect(percentAmount(1001n, 500n)).toBe(50n); // 50,05 → 51? 1001*500=500500+5000=505500/10000=50
    expect(percentAmount(1010n, 500n)).toBe(51n); // 50,5 → 51
  });
});
