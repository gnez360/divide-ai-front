import { describe, expect, it } from 'vitest';
import { receiptToApplyPayload } from '../src/app/image.js';
import { mintJoinToken, verifyJoinToken, billIdFromToken } from '../src/app/join-token.js';
import { sniffType, mintUploadUrl, parseUploadToken } from '../src/app/image.js';
import {
  serializeCookie,
  parseCookies,
  sessionCookieName,
  uuidv5,
  sha256,
} from '../src/util/crypto.js';
import { loadConfig } from '../src/config.js';
import { errorCodes, errorMessages, statusTitles } from '@cj/contracts';
import type { ExtractedReceipt } from '@cj/ocr';

const config = loadConfig();
const BILL = 'a1000000-0000-4000-8000-000000000001';

describe('receiptToApplyPayload (§9.1)', () => {
  const receipt: ExtractedReceipt = {
    restaurantName: 'Boteco Teste',
    table: '7',
    items: [
      { name: 'Pizza', quantity: 1, unitPrice: 5000, lineTotal: 5000, confidence: 1 },
      { name: 'Refrigerante', quantity: 2, unitPrice: 750, lineTotal: 1500, confidence: 1 },
      { name: 'Porção especial', quantity: 1, lineTotal: 3000, confidence: 0.9 },
    ],
    charges: [
      { description: 'Serviço 10%', kind: 'FEE', amount: 950, percentBp: 1000, confidence: 1 },
      { description: 'Taxa extra', kind: 'FEE', amount: 500, confidence: 1 },
      { description: 'Desconto combo', kind: 'DISCOUNT', percentBp: 500, confidence: 1 },
    ],
    printedTotal: 8450,
    subtotalRead: 9500,
  };

  it('converte qty×unit em UNIT_PRICE e o resto em LINE_TOTAL', () => {
    const p = receiptToApplyPayload('attempt', receipt);
    expect(p.items[0]).toMatchObject({ priceMode: 'UNIT_PRICE', unitPrice: 5000 });
    expect(p.items[2]).toMatchObject({ priceMode: 'LINE_TOTAL', unitPrice: null, lineTotal: 3000 });
  });

  it('classifica reviewReason: compatível, só valor, só percentual e incompatível', () => {
    const p = receiptToApplyPayload('attempt', receipt);
    // 10% de 9500 = 950 → compatível
    expect(p.charges[0]).toMatchObject({ reviewReason: null, amount: 950, percentBp: 1000 });
    // só valor
    expect(p.charges[1]).toMatchObject({ reviewReason: 'OCR_AMOUNT_ONLY' });
    // só percentual (amount sintetizado = 475)
    expect(p.charges[2]).toMatchObject({
      reviewReason: 'OCR_PERCENT_ONLY',
      amount: 475,
      percentBp: 500,
    });
  });

  it('percentual incompatível com valor → PERCENT_MISMATCH', () => {
    const p = receiptToApplyPayload('attempt', {
      ...receipt,
      charges: [
        { description: 'Serviço', kind: 'FEE', amount: 2000, percentBp: 1000, confidence: 1 },
      ],
    });
    expect(p.charges[0]!.reviewReason).toBe('PERCENT_MISMATCH');
  });

  it('leva restaurantName, table e printedTotal', () => {
    const p = receiptToApplyPayload('attempt', receipt);
    expect(p.restaurantName).toBe('Boteco Teste');
    expect(p.table).toBe('7');
    expect(p.printedTotal).toBe(8450);
  });
});

describe('joinToken (§11.1)', () => {
  it('mint/verify roundtrip e extração do billId', () => {
    const token = mintJoinToken(config, BILL, 3);
    expect(verifyJoinToken(config, token, BILL, 3)).toBe(true);
    expect(billIdFromToken(token)).toBe(BILL);
  });

  it('versão antiga → inválido', () => {
    const token = mintJoinToken(config, BILL, 3);
    expect(verifyJoinToken(config, token, BILL, 4)).toBe(false);
  });

  it('MAC adulterado → inválido', () => {
    const token = mintJoinToken(config, BILL, 1);
    const parts = token.split('.');
    parts[2] = 'AAAAAAAAAAAAAAAAAAAAAAAAAA';
    expect(verifyJoinToken(config, parts.join('.'), BILL, 1)).toBe(false);
  });
});

describe('URL assinada de upload (§10.1)', () => {
  const key = `bills/${BILL}/b1000000-0000-4000-8000-000000000002.png`;

  it('roundtrip válido', () => {
    const url = mintUploadUrl(config, BILL, 'image/png', key);
    const token = url.replace('/api/upload/', '');
    const claim = parseUploadToken(config, token);
    expect(claim.billId).toBe(BILL);
    expect(claim.objectKey).toBe(key);
  });

  it('assinatura adulterada → 404', () => {
    const url = mintUploadUrl(config, BILL, 'image/png', key);
    const token = url.replace('/api/upload/', '');
    const [p, m] = token.split('.');
    expect(() => parseUploadToken(config, `${p}.AAAAAAAAAAAAAAAAAAAAAAAAAAA`)).toThrowError(
      /URL inválida/i,
    );
    expect(() => parseUploadToken(config, `${p}x.${m}`)).toThrow();
  });

  it('tipo fora da allowlist → 415 no mint', () => {
    expect(() => mintUploadUrl(config, BILL, 'image/gif', key)).toThrowError(/tipo/i);
  });
});

describe('sniffType por assinatura (§10.2)', () => {
  it('detecta jpeg, png, webp e rejeita lixo', () => {
    expect(sniffType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]))).toBe('image/jpeg');
    expect(sniffType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe(
      'image/png',
    );
    expect(
      sniffType(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')])),
    ).toBe('image/webp');
    expect(sniffType(Buffer.from('nada aqui'))).toBeNull();
  });
});

describe('cookies e ids', () => {
  it('serializa com atributos __Host- e parseia', () => {
    const c = serializeCookie(sessionCookieName(BILL), 'valor-secreto', { maxAge: 60 });
    expect(c).toContain(`__Host-cj_${BILL.replace(/-/g, '')}=valor-secreto`);
    expect(c).toContain('HttpOnly');
    expect(c).toContain('Secure');
    expect(c).toContain('SameSite=Lax');
    expect(parseCookies(c.split(';').slice(0, 1).join(';'))[sessionCookieName(BILL)]).toBe(
      'valor-secreto',
    );
  });

  it('uuidv5 é determinístico e tem formato uuid', () => {
    const a = uuidv5('APPLY_OCR_RESULT:abc');
    const b = uuidv5('APPLY_OCR_RESULT:abc');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuidv5('outro')).not.toBe(a);
  });

  it('sha256 estável', () => {
    expect(sha256('abc').toString('hex')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('catálogo CTR-02', () => {
  it('todo ErrorCode tem mensagem pt-BR e não há chaves extras', () => {
    expect(Object.keys(errorMessages).sort()).toEqual([...errorCodes].sort());
    for (const code of errorCodes) expect(errorMessages[code]).toBeTruthy();
  });

  it('statusTitles cobre todos os status problem+json usados', () => {
    for (const status of [400, 401, 403, 404, 409, 413, 415, 422, 429, 500, 503]) {
      expect(statusTitles[status as keyof typeof statusTitles]).toBeTruthy();
    }
  });
});
