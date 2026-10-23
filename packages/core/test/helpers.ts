import type { BillDocument, Charge, Item, Participant } from '@cj/contracts';
import { derive, execute, executeSystem, type ExecutionContext } from '../src/index.js';

let seq = 0;
export const newId = (): string => {
  seq += 1;
  return '00000000-0000-4000-8000-' + String(seq).padStart(12, '0');
};

export function ctx(
  actor: ExecutionContext['actor'],
  extra: Partial<Pick<ExecutionContext, 'expected' | 'acceptedReopens'>> = {},
): ExecutionContext {
  return { actor, now: '2026-10-22T12:00:00.000Z', newId, ...extra };
}

export const creatorCtx = (id: string) =>
  ctx({ kind: 'PARTICIPANT', participantId: id, isCreator: true });
export const systemCtx = () => ctx({ kind: 'SYSTEM' });
export const visitorCtx = () => ctx({ kind: 'VISITOR' });

export function participant(
  id: string,
  name: string,
  joinOrder: number,
  over: Partial<Participant> = {},
): Participant {
  return {
    id,
    displayName: name,
    avatar: { initial: name[0]!.toUpperCase(), color: 'blue' },
    status: 'ACTIVE',
    consumptionConfirmed: false,
    confirmationSource: null,
    confirmedBy: null,
    confirmedAt: null,
    consumptionVersion: 0,
    closedShareAmount: null,
    shareClosedAt: null,
    preRegisteredBy: null,
    joinedAt: '2026-10-22T12:00:00.000Z',
    joinOrder,
    anonymized: false,
    version: 1,
    ...over,
  };
}

export function item(over: Partial<Item> = {}): Item {
  return {
    id: newId(),
    name: 'Item',
    quantity: 1,
    priceMode: 'UNIT_PRICE',
    unitPrice: 1000,
    lineTotal: 1000,
    splitMode: null,
    allocations: [],
    origin: 'MANUAL',
    deletedAt: null,
    deletedBy: null,
    version: 1,
    ...over,
  };
}

export function charge(over: Partial<Charge> = {}): Charge {
  return {
    id: newId(),
    description: 'Serviço',
    kind: 'FEE',
    scope: 'RECEIPT', // impresso na comanda (§7.4 taxas COMANDA)
    amount: 0,
    percentBp: null,
    amountSource: 'MANUAL',
    origin: 'MANUAL',
    distribution: 'PROPORTIONAL',
    splitAmong: [],
    waiver: 'NONE',
    waivedFor: [],
    confirmed: true,
    confirmedBy: null,
    reviewReason: null,
    version: 1,
    ...over,
  };
}

export function bill(over: Partial<BillDocument> = {}): BillDocument {
  return {
    schemaVersion: 1,
    id: newId(),
    status: 'OPEN',
    createdBy: 'p10000000-0000-4000-8000-000000000001',
    details: { version: 1 },
    printedTotal: null,
    seatLimit: 6,
    ocrAttempt: null,
    items: [],
    charges: [],
    participants: [],
    claims: [],
    receiptConfirmedAt: '2026-10-22T12:00:00.000Z',
    closedAt: null,
    createdAt: '2026-10-22T12:00:00.000Z',
    ...over,
  };
}

/** Dataset §F2.6: Σ consumo 21.000, serviço 2.100 (10%), Maria 5.900 + 590 = 6.490. */
export function datasetBill(opts: { confirmAll?: boolean } = {}): BillDocument {
  const maria = 'p10000000-0000-4000-8000-000000000002';
  const nery = 'p10000000-0000-4000-8000-000000000003';
  const ana = 'p10000000-0000-4000-8000-000000000004';
  const pedro = 'p10000000-0000-4000-8000-000000000005';
  const bia = 'p10000000-0000-4000-8000-000000000006';
  const people = [maria, nery, ana, pedro, bia];
  const it = (name: string, total: number, alloc: Record<string, number>): Item =>
    item({
      name,
      quantity: 1,
      priceMode: 'LINE_TOTAL',
      unitPrice: null,
      lineTotal: total,
      splitMode: 'CUSTOM_AMOUNT',
      allocations: Object.entries(alloc).map(([pid, v]) => ({
        participantId: pid,
        fixedAmount: v,
      })),
    });
  return bill({
    createdBy: maria,
    participants: people.map((id, i) =>
      participant(id, ['Maria', 'Nery', 'Ana', 'Pedro', 'Bia'][i]!, i + 1, {
        ...(opts.confirmAll === false
          ? {}
          : {
              consumptionConfirmed: true,
              confirmationSource: 'SELF' as const,
              confirmedBy: id,
              confirmedAt: '2026-10-22T12:00:00.000Z',
            }),
      }),
    ),
    items: [
      it('Comanda', 21000, {
        [maria]: 5900,
        [nery]: 4000,
        [ana]: 5000,
        [pedro]: 4100,
        [bia]: 2000,
      }),
    ],
    charges: [charge({ description: 'Serviço', amount: 2100, origin: 'MANUAL', confirmed: true })],
    printedTotal: 23100,
  });
}

export const MARIA = 'p10000000-0000-4000-8000-000000000002';
export const NERY = 'p10000000-0000-4000-8000-000000000003';

export function ok<T>(r: { ok: true } & T): T & { ok: true } {
  if (!r.ok) throw new Error('esperava sucesso');
  return r as T & { ok: true };
}

export { derive, execute, executeSystem };
