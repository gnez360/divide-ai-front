/**
 * Propriedades (§F11.J, §17.2) com fast-check sobre contas geradas
 * aleatoriamente dentro dos limites de §9.1. Seed aparece no falha.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Allocation, BillDocument, Charge, Item, Participant } from '@cj/contracts';
import { derive, execute } from '../src/index.js';
import type { ExecutionContext } from '../src/index.js';

const MAX_CENTS = 99_999_999; // §4.1: valores como number inteiro seguros
const NOW = '2026-10-23T12:00:00.000Z';

const uid = (prefix: string, n: number): string =>
  `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`;

let seq = 0;
const ctx = (actorId: string): ExecutionContext => ({
  actor: { kind: 'PARTICIPANT', participantId: actorId, isCreator: true },
  now: NOW,
  newId: () => uid('e0000000-', ++seq).replace('e0000000', 'e1000000'),
});

function person(i: number): Participant {
  const id = uid('a1000000', i + 1);
  return {
    id,
    displayName: `P${i + 1}`,
    avatar: { initial: 'P', color: 'blue' },
    status: 'ACTIVE',
    consumptionConfirmed: true,
    confirmationSource: 'SELF',
    confirmedBy: id,
    confirmedAt: NOW,
    consumptionVersion: 0,
    closedShareAmount: null,
    shareClosedAt: null,
    preRegisteredBy: null,
    joinedAt: NOW,
    joinOrder: i + 1,
    anonymized: false,
    version: 1,
  };
}

const cents = fc.integer({ min: 1, max: 50_000 });

const genItem = (ids: string[], index: number): fc.Arbitrary<Item> =>
  fc.oneof(
    // EQUAL: atribuições diretas; derive usa Maior Resto
    fc
      .record({
        lineTotal: cents,
        subset: fc.subarray(ids, { minLength: 1 }),
      })
      .map(({ lineTotal, subset }): Item => ({
        id: uid('d1000000', 100 + index),
        name: `Item ${index + 1}`,
        quantity: 1,
        priceMode: 'LINE_TOTAL',
        unitPrice: null,
        lineTotal,
        splitMode: 'EQUAL',
        allocations: subset.map((participantId) => ({ participantId })),
        origin: 'MANUAL',
        deletedAt: null,
        deletedBy: null,
        version: 1,
      })),
    // BY_UNITS em UNIT_PRICE: partilha = unidades × preço
    fc
      .record({
        quantity: fc.integer({ min: 1, max: 6 }),
        unitPrice: fc.integer({ min: 1, max: 5_000 }),
        units: fc.array(fc.integer({ min: 1, max: 6 }), { minLength: 1, maxLength: 3 }),
      })
      .map(({ quantity, unitPrice, units }): Item => {
        const allocations: Allocation[] = [];
        let left = quantity;
        for (let i = 0; i < units.length && left > 0; i++) {
          const u = Math.min(units[i]!, left);
          allocations.push({ participantId: ids[i % ids.length]!, units: u });
          left -= u;
        }
        return {
          id: uid('d1000000', 100 + index),
          name: `Item ${index + 1}`,
          quantity,
          priceMode: 'UNIT_PRICE',
          unitPrice,
          lineTotal: quantity * unitPrice,
          splitMode: 'BY_UNITS',
          allocations,
          origin: 'MANUAL',
          deletedAt: null,
          deletedBy: null,
          version: 1,
        };
      }),
    // CUSTOM_AMOUNT: partição exata (SPLIT completo) — 1 ou 2 pessoas
    fc
      .tuple(fc.integer({ min: 2, max: 50_000 }), fc.boolean())
      .chain<number[]>(([lineTotal, twoPeople]) =>
        twoPeople && ids.length >= 2
          ? fc
              .integer({ min: 1, max: lineTotal - 1 })
              .map((cut): number[] => [cut, lineTotal - cut])
          : fc.constant<number[]>([lineTotal]),
      )
      .map((parts): Item => ({
        id: uid('d1000000', 100 + index),
        name: `Item ${index + 1}`,
        quantity: 1,
        priceMode: 'LINE_TOTAL',
        unitPrice: null,
        lineTotal: parts.reduce((s: number, p: number) => s + p, 0),
        splitMode: 'CUSTOM_AMOUNT',
        allocations: parts.map((fixedAmount: number, i: number) => ({
          participantId: ids[i % ids.length]!,
          fixedAmount,
        })),
        origin: 'MANUAL',
        deletedAt: null,
        deletedBy: null,
        version: 1,
      })),
    // CUSTOM_PERCENT parcial (faltante vira saldo)
    fc
      .record({
        lineTotal: cents,
        bps: fc.array(fc.integer({ min: 1, max: 4000 }), { minLength: 1, maxLength: 3 }),
      })
      .map(({ lineTotal, bps }): Item => {
        const sum = bps.reduce((s, b) => s + b, 0);
        const scale = sum > 10000 ? 10000 / sum : 1;
        const allocBp = bps.map((b) => Math.max(1, Math.floor(b * scale)));
        return {
          id: uid('d1000000', 100 + index),
          name: `Item ${index + 1}`,
          quantity: 1,
          priceMode: 'LINE_TOTAL',
          unitPrice: null,
          lineTotal,
          splitMode: 'CUSTOM_PERCENT',
          allocations: allocBp.map((percentBp, i) => ({
            participantId: ids[i % ids.length]!,
            percentBp,
          })),
          origin: 'MANUAL',
          deletedAt: null,
          deletedBy: null,
          version: 1,
        };
      }),
    // sem dividir (valor sem dono — estado esperado)
    fc.integer({ min: 1, max: 20_000 }).map((lineTotal): Item => ({
      id: uid('d1000000', 100 + index),
      name: `Item ${index + 1}`,
      quantity: 1,
      priceMode: 'LINE_TOTAL',
      unitPrice: null,
      lineTotal,
      splitMode: null,
      allocations: [],
      origin: 'MANUAL',
      deletedAt: null,
      deletedBy: null,
      version: 1,
    })),
  );

const genCharge = (ids: string[], chargeIndex: number): fc.Arbitrary<Charge> =>
  fc.oneof(
    fc.integer({ min: 1, max: 10_000 }).map((amount): Charge => ({
      id: uid('c1000000', 200 + chargeIndex),
      description: 'Serviço',
      kind: 'FEE',
      scope: 'RECEIPT',
      amount,
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
    })),
    fc
      .tuple(fc.integer({ min: 1, max: 15_000 }), fc.subarray(ids, { minLength: 1 }))
      .map(([amount, splitAmong]): Charge => ({
        id: uid('c1000000', 200 + chargeIndex),
        description: 'Couvert',
        kind: 'FEE',
        scope: 'TABLE',
        amount,
        percentBp: null,
        amountSource: 'MANUAL',
        origin: 'MANUAL',
        distribution: 'EQUAL_PER_PERSON',
        splitAmong,
        waiver: 'NONE',
        waivedFor: [],
        confirmed: true,
        confirmedBy: null,
        reviewReason: null,
        version: 1,
      })),
  );

const genBill: fc.Arbitrary<BillDocument> = fc
  .tuple(
    fc.integer({ min: 1, max: 6 }),
    fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 5 }),
    fc.option(fc.integer({ min: -5, max: 5 }), { nil: null }),
  )
  .chain(([nPeople, itemIdxs, printedDelta]) =>
    fc
      .tuple(
        ...itemIdxs.map((_, i) =>
          genItem(
            Array.from({ length: nPeople }, (_, j) => uid('a1000000', j + 1)),
            i,
          ),
        ),
      )
      .chain((items) =>
        fc
          .tuple(
            fc.constant(items),
            fc.option(
              genCharge(
                Array.from({ length: nPeople }, (_, j) => uid('a1000000', j + 1)),
                1,
              ),
              { nil: null },
            ),
          )
          .map(([its, charge]) => {
            const people = Array.from({ length: nPeople }, (_, j) => person(j));
            const itemsTotal = its.reduce((s, i) => s + i.lineTotal, 0);
            const fees =
              charge && charge.kind === 'FEE' && charge.distribution !== undefined
                ? charge.amount
                : 0;
            const printed =
              printedDelta === null ? null : Math.max(0, itemsTotal + fees + printedDelta);
            return {
              schemaVersion: 1,
              id: uid('b1000000', 1),
              status: 'OPEN',
              createdBy: people[0]!.id,
              details: { version: 1 },
              printedTotal: printed,
              seatLimit: 12,
              ocrAttempt: null,
              items: its,
              charges: charge ? [charge] : [],
              participants: people,
              claims: [],
              receiptConfirmedAt: NOW,
              closedAt: null,
              createdAt: NOW,
            } satisfies BillDocument;
          }),
      ),
  );

const sumShares = (d: ReturnType<typeof derive>): number =>
  Object.values(d.shares).reduce((s, x) => s + x.amount, 0);

describe('propriedades §11.J (fast-check)', () => {
  it('nenhuma parte < 0 no estado servido; Σ partilhas + saldo = totalAPagar (I1)', () => {
    fc.assert(
      fc.property(genBill, (doc) => {
        const d = derive(doc); // não lança ⇒ I1 vale
        for (const s of Object.values(d.shares)) expect(s.amount).toBeGreaterThanOrEqual(0);
        expect(sumShares(d) + d.unallocated.total).toBe(d.totals.amountDue);
      }),
      { numRuns: 150 },
    );
  });

  it('Σ partilhas de um item = valor do item; DIVIDIDO ⇒ igualdade exata', () => {
    fc.assert(
      fc.property(genBill, (doc) => {
        const d = derive(doc);
        for (const item of doc.items) {
          if (item.deletedAt !== null) continue;
          const shares = d.items[item.id]!;
          const sum = Object.values(shares.shares).reduce((s, v) => s + v, 0);
          expect(sum + shares.unassigned).toBe(item.lineTotal);
          if (shares.status === 'SPLIT') expect(sum).toBe(item.lineTotal);
        }
      }),
      { numRuns: 150 },
    );
  });

  it('mesma entrada ⇒ mesmo resultado; recalcular duas vezes ⇒ mesmo estado', () => {
    fc.assert(
      fc.property(genBill, (doc) => {
        const a = derive(doc);
        const b = derive(doc);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      }),
      { numRuns: 100 },
    );
  });

  it('nenhum valor trafegado fora de 64 bits (|v| ≤ 99.999.999 e inteiro seguro)', () => {
    fc.assert(
      fc.property(genBill, (doc) => {
        const d = derive(doc);
        const walk = (v: unknown): void => {
          if (typeof v === 'number') {
            expect(Number.isSafeInteger(v)).toBe(true);
            expect(Math.abs(v)).toBeLessThanOrEqual(MAX_CENTS);
          } else if (Array.isArray(v)) v.forEach(walk);
          else if (v && typeof v === 'object') Object.values(v).forEach(walk);
        };
        walk(d.totals);
        walk(d.shares);
        walk(d.charges);
        walk(d.unallocated);
      }),
      { numRuns: 100 },
    );
  });

  it('desconto criado ou rejeitado (422); servido nunca negativo (§7.10)', () => {
    fc.assert(
      fc.property(
        genBill,
        fc.constantFrom<'PROPORTIONAL' | 'EQUAL_PER_PERSON'>('PROPORTIONAL', 'EQUAL_PER_PERSON'),
        fc.integer({ min: 1, max: 30_000 }),
        (doc, distribution, amount) => {
          const r = execute(
            doc,
            { type: 'ADD_CHARGE', description: 'Desconto', kind: 'DISCOUNT', amount, distribution },
            ctx(doc.createdBy),
          );
          if (!r.ok) {
            expect(['NEGATIVE_SHARE', 'DISCOUNT_EXCEEDS_RECEIPT']).toContain(r.error.code);
            return;
          }
          if (r.noChange) return;
          for (const s of Object.values(r.derived.shares)) {
            expect(s.amount).toBeGreaterThanOrEqual(0);
          }
        },
      ),
      { numRuns: 120 },
    );
  });

  it('I2: fechar sem bloqueios ⇒ saldo 0, |diferença| ≤ 5, Σ partes = totalAPagar', () => {
    fc.assert(
      fc.property(genBill, (doc) => {
        const r = execute(doc, { type: 'CLOSE_BILL' }, ctx(doc.createdBy));
        if (!r.ok) {
          expect(r.error.code).toBe('OPEN_BLOCKERS');
          return;
        }
        if (r.noChange) return;
        const d = r.derived;
        expect(d.unallocated.total).toBe(0);
        expect(Math.abs(d.totals.difference)).toBeLessThanOrEqual(5);
        expect(sumShares(d)).toBe(d.totals.amountDue);
        expect(d.blockers).toHaveLength(0);
      }),
      { numRuns: 120 },
    );
  });

  it('dividir um item não altera a parcela proporcional de quem não está nele enquanto houver valor sem dono (§7.7.1)', () => {
    const genScenario = fc
      .tuple(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 1, max: 8_000 }),
        fc.integer({ min: 1, max: 8_000 }),
        fc.integer({ min: 1, max: 5_000 }),
      )
      .map(([nPeople, splitTotal, orphanTotal, fee]) => {
        const people = Array.from({ length: nPeople + 1 }, (_, j) => person(j));
        const outsider = people[nPeople]!; // nunca entra em nenhum item
        const touched = people.slice(0, 2);
        const doc: BillDocument = {
          schemaVersion: 1,
          id: uid('b1000000', 2),
          status: 'OPEN',
          createdBy: people[0]!.id,
          details: { version: 1 },
          printedTotal: null,
          seatLimit: 12,
          ocrAttempt: null,
          items: [
            {
              id: uid('d1000000', 300),
              name: 'A dividir',
              quantity: 1,
              priceMode: 'LINE_TOTAL',
              unitPrice: null,
              lineTotal: splitTotal,
              splitMode: null,
              allocations: [],
              origin: 'MANUAL',
              deletedAt: null,
              deletedBy: null,
              version: 1,
            },
            {
              id: uid('d1000000', 301),
              name: 'Sem dono',
              quantity: 1,
              priceMode: 'LINE_TOTAL',
              unitPrice: null,
              lineTotal: orphanTotal,
              splitMode: null,
              allocations: [],
              origin: 'MANUAL',
              deletedAt: null,
              deletedBy: null,
              version: 1,
            },
          ],
          charges: [
            {
              id: uid('c1000000', 300),
              description: 'Serviço',
              kind: 'FEE',
              scope: 'RECEIPT',
              amount: fee,
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
            },
          ],
          participants: people,
          claims: [],
          receiptConfirmedAt: NOW,
          closedAt: null,
          createdAt: NOW,
        };
        return { doc, outsider, touched };
      });
    fc.assert(
      fc.property(genScenario, ({ doc, outsider, touched }) => {
        const before = derive(doc).charges[doc.charges[0]!.id]!.portions[outsider.id] ?? 0;
        const mutated: BillDocument = {
          ...doc,
          items: doc.items.map((i) =>
            i.id === doc.items[0]!.id
              ? {
                  ...i,
                  splitMode: 'EQUAL' as const,
                  allocations: touched.map((p) => ({ participantId: p.id })),
                  version: i.version + 1,
                }
              : i,
          ),
        };
        // o item "Sem dono" permanece ⇒ ainda há valor sem dono
        expect(derive(mutated).unallocated.bySource.items).toBeGreaterThan(0);
        const after = derive(mutated).charges[doc.charges[0]!.id]!.portions[outsider.id] ?? 0;
        expect(after).toBe(before);
      }),
      { numRuns: 120 },
    );
  });
});
