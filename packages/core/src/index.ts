export * from './types.js';
export { largestRemainder, percentAmount, tieBreakHex } from './calc.js';
export { derive, participantsWithAllocation, isParticipant } from './derive.js';
export { execute, executeEntry, executeSystem } from './execute.js';

import type { BillDocument } from '@cj/contracts';
import { billDocumentSchema } from '@cj/contracts';

/** Migração de documento (§5.4): cadeia v1. Hoje, validação da versão atual. */
export function migrateDocument(doc: unknown): BillDocument {
  return billDocumentSchema.parse(doc);
}
