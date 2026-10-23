import { describe, expect, it, afterEach } from 'vitest';
import { FakeExtractor, clearFakeFixtures, registerFakeFixture } from '../src/fake.js';
import { extractedReceiptSchema } from '../src/types.js';

const img = (s: string) => new TextEncoder().encode(s);

describe('FakeExtractor', () => {
  afterEach(() => clearFakeFixtures());

  it('é determinístico para os mesmos bytes e valida o schema', async () => {
    const ex = new FakeExtractor();
    const signal = new AbortController().signal;
    const a = await ex.extract(img('foto-qualquer-1'), { signal });
    const b = await ex.extract(img('foto-qualquer-1'), { signal });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.receipt).toEqual(b.receipt);
      expect(extractedReceiptSchema.safeParse(a.receipt).success).toBe(true);
      // total impresso = soma dos itens + cobranças
      const itemsSum = a.receipt.items.reduce((s, i) => s + i.lineTotal, 0);
      const chargesSum = a.receipt.charges.reduce((s, c) => s + (c.amount ?? 0), 0);
      expect(a.receipt.printedTotal).toBe(itemsSum + chargesSum);
    }
  });

  it('bytes diferentes geram recibos diferentes', async () => {
    const ex = new FakeExtractor();
    const signal = new AbortController().signal;
    const a = await ex.extract(img('foto-A'), { signal });
    const b = await ex.extract(img('foto-B'), { signal });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(JSON.stringify(a.receipt)).not.toBe(JSON.stringify(b.receipt));
  });

  it('cenário de falha por prefixo', async () => {
    const ex = new FakeExtractor();
    const r = await ex.extract(img('!CJ-OCR-FAIL!OCR-01'), {
      signal: new AbortController().signal,
    });
    expect(r).toEqual({ ok: false, code: 'OCR-01', detail: expect.any(String) });
  });

  it('fixture explícita por prefixo', async () => {
    const receipt = {
      restaurantName: 'X',
      items: [{ name: 'Pizza', quantity: 1, unitPrice: 5000, lineTotal: 5000, confidence: 1 }],
      charges: [],
      printedTotal: 5000,
    };
    const r = await new FakeExtractor().extract(img(`!CJ-OCR!${JSON.stringify(receipt)}`), {
      signal: new AbortController().signal,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.receipt.items[0]!.name).toBe('Pizza');
  });

  it('fixture inválida → OCR-05', async () => {
    const r = await new FakeExtractor().extract(img('!CJ-OCR!{"items":[]}'), {
      signal: new AbortController().signal,
    });
    expect(r).toMatchObject({ ok: false, code: 'OCR-05' });
  });

  it('sinal abortado → OCR-03', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const r = await new FakeExtractor().extract(img('x'), { signal: ctrl.signal });
    expect(r).toMatchObject({ ok: false, code: 'OCR-03' });
  });

  it('registro de fixture por hash cobre bytes arbitrários', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    registerFakeFixture(bytes, { ok: false, code: 'OCR-02', detail: 'registrado' });
    const r = await new FakeExtractor().extract(bytes, { signal: new AbortController().signal });
    expect(r).toMatchObject({ ok: false, code: 'OCR-02' });
  });
});
