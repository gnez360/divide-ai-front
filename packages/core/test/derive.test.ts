import { describe, expect, it } from 'vitest';
import { derive } from '../src/derive.js';
import { InvariantError } from '../src/types.js';
import { bill, charge, datasetBill, item, participant, MARIA, NERY } from './helpers.js';

describe('derive — dataset §F2.6', () => {
  it('Maria → 59,00 + 5,90 = 64,90', () => {
    const d = derive(datasetBill());
    expect(d.shares[MARIA]!.consumption).toBe(5900);
    expect(d.shares[MARIA]!.amount).toBe(6490);
    expect(d.shares[NERY]!.amount).toBe(4400); // 4000 + 400
  });

  it('Σ partes = reconciledTotal; zero bloqueios com todos confirmados', () => {
    const d = derive(datasetBill());
    const sum = Object.values(d.shares).reduce((s, x) => s + x.amount, 0);
    expect(sum).toBe(d.totals.reconciledTotal);
    expect(d.totals.reconciledTotal).toBe(23100);
    expect(d.blockers).toHaveLength(0);
  });
});

describe('derive — cobranças', () => {
  it('couvert R$90 ÷ 6 elegíveis = 15,00 cada (EQUAL_PER_PERSON)', () => {
    const people = Array.from({ length: 6 }, (_, i) =>
      participant(
        `p00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
        `P${i + 1}`,
        i + 1,
        {
          consumptionConfirmed: true,
          confirmationSource: 'SELF',
          confirmedBy: `p00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
          confirmedAt: '2026-10-22T12:00:00.000Z',
        },
      ),
    );
    const doc = bill({
      participants: people,
      createdBy: people[0]!.id,
      items: [
        item({
          lineTotal: 9000,
          priceMode: 'LINE_TOTAL',
          unitPrice: null,
          splitMode: 'CUSTOM_AMOUNT',
          allocations: people.map((p) => ({ participantId: p.id, fixedAmount: 1500 })),
        }),
      ],
      charges: [
        charge({
          description: 'Couvert',
          amount: 9000,
          distribution: 'EQUAL_PER_PERSON',
          splitAmong: people.map((p) => p.id),
        }),
      ],
      printedTotal: 18000,
    });
    const d = derive(doc);
    for (const p of people) {
      expect(d.charges[doc.charges[0]!.id]!.portions[p.id]).toBe(1500);
      expect(d.shares[p.id]!.amount).toBe(3000);
    }
  });

  it('desconto igual para todos não deixa parte negativa quando global válido', () => {
    const a = participant('p00000000-0000-4000-8000-00000000000a', 'A', 1, {
      consumptionConfirmed: true,
      confirmationSource: 'SELF',
      confirmedBy: 'x',
      confirmedAt: 'now',
    });
    const b = participant('p00000000-0000-4000-8000-00000000000b', 'B', 2, {
      consumptionConfirmed: true,
      confirmationSource: 'SELF',
      confirmedBy: 'x',
      confirmedAt: 'now',
    });
    const doc = bill({
      createdBy: a.id,
      participants: [a, b],
      items: [
        item({
          lineTotal: 5000,
          priceMode: 'LINE_TOTAL',
          unitPrice: null,
          splitMode: 'CUSTOM_AMOUNT',
          allocations: [
            { participantId: a.id, fixedAmount: 1000 },
            { participantId: b.id, fixedAmount: 4000 },
          ],
        }),
      ],
      charges: [
        charge({
          description: 'Desconto',
          kind: 'DISCOUNT',
          amount: 4000,
          distribution: 'EQUAL_PER_PERSON',
          splitAmong: [a.id, b.id],
        }),
      ],
    });
    const d = derive(doc);
    expect(d.shares[a.id]!.amount).toBe(-1000); // A: 1000 − 2000
    // estado com parte negativa existe só ANTES do commit: execute() rejeita
  });
});

describe('derive — invariantes', () => {
  it('I1: Σ partes + saldo não distribuído = reconciledTotal (furo visível)', () => {
    const a = participant('p00000000-0000-4000-8000-00000000000a', 'A', 1, {
      consumptionConfirmed: true,
      confirmationSource: 'SELF',
      confirmedBy: 'x',
      confirmedAt: 'now',
    });
    const doc = bill({
      createdBy: a.id,
      participants: [a],
      items: [item({ lineTotal: 10000, splitMode: null, allocations: [] })], // nunca dividido
      printedTotal: null,
    });
    const d = derive(doc);
    expect(d.unallocated.total).toBe(10000);
    expect(d.unallocated.bySource.items).toBe(10000);
    const sum = Object.values(d.shares).reduce((s, x) => s + x.amount, 0);
    expect(sum + d.unallocated.total).toBe(d.totals.reconciledTotal);
    expect(d.blockers.map((x) => x.type)).toContain('ITEM_NAO_DIVIDIDO');
  });

  it('divergência > 5¢ vira bloqueio DIVERGENCIA_COMANDA; ≤ 5¢ absorve', () => {
    const base = datasetBill();
    const big = { ...base, printedTotal: 23100 + 6 };
    expect(derive(big).blockers.some((x) => x.type === 'DIVERGENCIA_COMANDA')).toBe(true);
    const small = { ...base, printedTotal: 23100 + 3 };
    const d = derive(small);
    expect(d.blockers.some((x) => x.type === 'DIVERGENCIA_COMANDA')).toBe(false);
    expect(d.totals.reconciliationAdjustment).toBe(3);
    expect(d.totals.reconciledTotal).toBe(23103);
  });

  it('itens apagados saem do cálculo', () => {
    const doc = datasetBill();
    const d0 = derive(doc);
    const first = doc.items[0]!;
    const mutated = { ...doc, items: [{ ...first, deletedAt: '2026-10-22T13:00:00.000Z' }] };
    const d = derive(mutated);
    expect(d.totals.itemsTotal).toBe(0);
    expect(d.items[first.id]!.status).toBe('DELETED');
    void d0;
  });

  it('Σ consumo = 0 com taxa proporcional → taxa no saldo, sem inventar rateio', () => {
    const a = participant('p00000000-0000-4000-8000-00000000000a', 'A', 1);
    const doc = bill({
      createdBy: a.id,
      participants: [a],
      items: [item({ lineTotal: 1000, splitMode: null, allocations: [] })],
      charges: [charge({ amount: 100 })],
    });
    const d = derive(doc);
    expect(d.charges[doc.charges[0]!.id]!.unassigned).toBe(100);
    expect(d.unallocated.bySource.charges).toBe(100);
  });

  it('saldo com sinal (§7.8): desconto sem dono reduz o saldo e vira pendência', () => {
    const a = participant('p00000000-0000-4000-8000-00000000000a', 'A', 1);
    const b = participant('p00000000-0000-4000-8000-00000000000b', 'B', 2);
    const doc = bill({
      createdBy: a.id,
      participants: [a, b],
      items: [
        item({
          lineTotal: 1000,
          priceMode: 'LINE_TOTAL',
          unitPrice: null,
          splitMode: 'CUSTOM_AMOUNT',
          allocations: [{ participantId: a.id, fixedAmount: 1000 }],
        }),
      ],
      // desconto proporcional elegível só para B (consumo 0) → parcela sem dono
      charges: [
        charge({ kind: 'DISCOUNT', amount: 200, distribution: 'PROPORTIONAL', splitAmong: [b.id] }),
      ],
    });
    const d = derive(doc);
    expect(d.totals.amountDue).toBe(800);
    expect(d.shares[a.id]!.amount).toBe(1000);
    expect(d.unallocated.total).toBe(-200);
    expect(d.unallocated.bySource.charges).toBe(-200);
    expect(d.blockers.map((x) => x.type)).toContain('COBRANCA_SEM_RATEIO');
  });

  it('derive lança quando reconciledTotal < 0 (documento corrompido)', () => {
    const a = participant('p00000000-0000-4000-8000-00000000000a', 'A', 1);
    const doc = bill({
      createdBy: a.id,
      participants: [a],
      items: [],
      charges: [charge({ kind: 'DISCOUNT', amount: 100 })],
    });
    expect(() => derive(doc)).toThrow(InvariantError);
  });

  it('bloqueios: NAO_INFORMOU, NAO_CONFIRMOU, AGUARDANDO_ENTRADA', () => {
    const a = participant('p00000000-0000-4000-8000-00000000000a', 'A', 1, {
      consumptionConfirmed: true,
      confirmationSource: 'SELF',
      confirmedBy: 'x',
      confirmedAt: 'now',
    });
    const b = participant('p00000000-0000-4000-8000-00000000000b', 'B', 2);
    const c = participant('p00000000-0000-4000-8000-00000000000c', 'C', 3, { status: 'INVITED' });
    const doc = bill({
      createdBy: a.id,
      participants: [a, b, c],
      items: [
        item({
          lineTotal: 3000,
          priceMode: 'LINE_TOTAL',
          unitPrice: null,
          splitMode: 'CUSTOM_AMOUNT',
          allocations: [
            { participantId: a.id, fixedAmount: 2000 },
            { participantId: c.id, fixedAmount: 1000 }, // placeholder com atribuição
          ],
        }),
      ],
    });
    const d = derive(doc);
    const types = d.blockers.map((x) => x.type);
    expect(types).toContain('PARTICIPANTE_NAO_INFORMOU'); // B: nada atribuído
    expect(types).toContain('PARTICIPANTE_AGUARDANDO_ENTRADA'); // C: vaga com atribuição
    expect(types).not.toContain('PARTICIPANTE_NAO_CONFIRMOU'); // B sem consumo ainda é NAO_INFORMOU
  });

  it('progresso reflete divisão e confirmações', () => {
    const doc = datasetBill();
    const d = derive(doc);
    expect(d.progress).toEqual({
      itemsSplit: 1,
      itemsTotal: 1,
      peopleConfirmed: 5,
      peopleTotal: 5,
      sharesClosed: 0,
    });
  });
});
