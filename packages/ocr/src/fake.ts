import { sha256 } from '@noble/hashes/sha256';
import {
  extractedReceiptSchema,
  type ExtractionResult,
  type ExtractedReceipt,
  type OcrErrorCode,
  type ReceiptExtractor,
} from './types.js';

const FIXTURE_PREFIX = '!CJ-OCR!';
const FAIL_PREFIX = '!CJ-OCR-FAIL!';

/**
 * Cenário global via env (dev): OCR_FAKE_SCENARIO=fail | delay:<ms>.
 * Sem cenário o extractor gera comanda aleatória determinística.
 */
const SCENARIO = (process.env.OCR_FAKE_SCENARIO ?? '').trim();

const RESTAURANTS = [
  'Boteco da Esquina',
  'Cantina Nonna',
  'Burger Lab',
  'Casa do Sushi',
  'Padaria Real',
  'Churrascaria Fogo Alto',
];

const ITEM_NAMES = [
  'Picanha na chapa',
  'Porcao de fritas',
  'Coca-Cola 350ml',
  'Caipirinha de limao',
  'Arroz a grega',
  'Salada Caesar',
  'Salmao grelhado',
  'Petit Gateau',
  'Heineken 350ml',
  'Guarana Antarctica',
  'Frango a passarinho',
  'Parmegiana de carne',
];

const SCENARIO_FIXTURES = new Map<string, ExtractionResult>();

/**
 * Permite registrar um resultado fixo para os bytes exatos (testes/E2E):
 * chaves são o hex do sha256 da imagem.
 */
export function registerFakeFixture(image: Uint8Array, result: ExtractionResult): void {
  SCENARIO_FIXTURES.set(hex(sha256(image)), result);
}

export function clearFakeFixtures(): void {
  SCENARIO_FIXTURES.clear();
}

export class FakeExtractor implements ReceiptExtractor {
  readonly name = 'fake';

  async extract(image: Uint8Array, options: { signal: AbortSignal }): Promise<ExtractionResult> {
    const started = Date.now();
    if (options.signal.aborted) return { ok: false, code: 'OCR-03', detail: 'abortado' };

    if (SCENARIO === 'fail')
      return { ok: false, code: 'OCR-01', detail: 'cenario de falha (OCR_FAKE_SCENARIO)' };
    if (SCENARIO.startsWith('delay:')) {
      const ms = Math.min(Math.max(Number(SCENARIO.slice(6)) || 0, 0), 120_000);
      const aborted = await sleep(ms, options.signal);
      if (aborted) return { ok: false, code: 'OCR-03', detail: 'abortado durante atraso fake' };
    }

    const asText = tryAscii(image);
    if (asText?.startsWith(FAIL_PREFIX)) {
      const code = asText.slice(FAIL_PREFIX.length).trim() as OcrErrorCode;
      return { ok: false, code, detail: 'cenario de falha fake' };
    }
    if (asText?.startsWith(FIXTURE_PREFIX)) {
      try {
        const parsed = extractedReceiptSchema.safeParse(
          JSON.parse(asText.slice(FIXTURE_PREFIX.length)),
        );
        if (!parsed.success) return { ok: false, code: 'OCR-05', detail: 'fixture invalida' };
        return {
          ok: true,
          receipt: parsed.data,
          diagnostics: { providerMs: Date.now() - started, parserMs: 0 },
        };
      } catch {
        return { ok: false, code: 'OCR-05', detail: 'fixture invalida' };
      }
    }

    const digest = sha256(image);
    const registered = SCENARIO_FIXTURES.get(hex(digest));
    if (registered) return registered;

    const receipt = generateReceipt(digest);
    const parsed = extractedReceiptSchema.safeParse(receipt);
    if (!parsed.success) return { ok: false, code: 'OCR-05', detail: 'schema' };
    return {
      ok: true,
      receipt: parsed.data,
      diagnostics: { providerMs: Date.now() - started, parserMs: 1 },
    };
  }
}

function generateReceipt(digest: Uint8Array): ExtractedReceipt {
  const b = (i: number) => digest[i % digest.length]!;
  const restaurantName = RESTAURANTS[b(0) % RESTAURANTS.length]!;
  const itemCount = 2 + (b(1) % 5); // 2..6
  const items = [];
  for (let i = 0; i < itemCount; i++) {
    const name = ITEM_NAMES[b(10 + i * 3) % ITEM_NAMES.length]!;
    const quantity = 1 + (b(11 + i * 3) % 2); // 1..2
    const unitPrice = (250 + b(12 + i * 3) * 40) % 6000; // 2,50 .. ~ R$60
    items.push({
      name,
      quantity,
      unitPrice: Math.max(250, unitPrice),
      lineTotal: Math.max(250, unitPrice) * quantity,
      confidence: 0.9 + (b(40 + i) % 10) / 100,
    });
  }
  const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);
  const hasService = b(2) % 3 !== 0;
  const charges = hasService
    ? [
        {
          description: 'Servico 10%',
          kind: 'FEE' as const,
          amount: Math.floor(subtotal / 10),
          percentBp: 1000,
          confidence: 0.95,
        },
      ]
    : [];
  const printedTotal = subtotal + charges.reduce((s, c) => s + (c.amount ?? 0), 0);
  return {
    restaurantName,
    table: String(1 + (b(3) % 30)),
    receiptNumber: String(1000 + ((b(4) * 7 + b(5)) % 9000)),
    items,
    charges,
    printedTotal,
    subtotalRead: subtotal,
  };
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

function tryAscii(image: Uint8Array): string | null {
  if (image.length > 64 * 1024) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(image);
  } catch {
    return null;
  }
}

/** Aguarda `ms`; resolve true se o sinal abortar. */
function sleep(ms: number, signal: AbortSignal): Promise<boolean> {
  if (ms <= 0) return Promise.resolve(signal.aborted);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve(false);
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve(true);
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
