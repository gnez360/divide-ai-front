export * from './types.js';
export { FakeExtractor, registerFakeFixture, clearFakeFixtures } from './fake.js';

import { FakeExtractor } from './fake.js';
import type { ReceiptExtractor } from './types.js';

/** OCR_PROVIDER=fake (local/testes); google-vision fica para produção (§9.2). */
export function createExtractor(provider = process.env.OCR_PROVIDER ?? 'fake'): ReceiptExtractor {
  switch (provider) {
    case 'fake':
      return new FakeExtractor();
    default:
      throw new Error(`OCR_PROVIDER desconhecido: ${provider}`);
  }
}
