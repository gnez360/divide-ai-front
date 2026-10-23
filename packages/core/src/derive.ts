import type { BillDocument, Charge, Item, Participant } from '@cj/contracts';
import { domainMessages } from '@cj/contracts';
import { largestRemainder, percentAmount, sumBig } from './calc.js';
import { InvariantError, type Blocker, type Derived } from './types.js';

const RECONCILE_TOLERANCE = 5n; // centavos
const b = (n: number): bigint => BigInt(n);
const n = (v: bigint): number => Number(v);

function activeItems(doc: BillDocument): Item[] {
  return doc.items.filter((i) => i.deletedAt === null);
}

function itemShares(item: Item): {
  shares: Map<string, bigint>;
  unassigned: bigint;
  status: 'UNSPLIT' | 'PARTIAL' | 'SPLIT';
} {
  const empty = {
    shares: new Map<string, bigint>(),
    unassigned: b(item.lineTotal),
    status: 'UNSPLIT' as const,
  };
  if (item.splitMode === null || item.allocations.length === 0) {
    if (item.splitMode !== null && item.allocations.length === 0) {
      return { shares: new Map(), unassigned: b(item.lineTotal), status: 'PARTIAL' };
    }
    return empty;
  }
  const total = b(item.lineTotal);
  const byId = new Map(item.allocations.map((a) => [a.participantId, a] as const));
  let shares = new Map<string, bigint>();
  let status: 'PARTIAL' | 'SPLIT' = 'SPLIT';

  switch (item.splitMode) {
    case 'EQUAL': {
      const ids = [...byId.keys()];
      shares = largestRemainder(
        total,
        ids.map((id) => [id, 1n] as const),
        b(ids.length),
        `item:${item.id}`,
      );
      break;
    }
    case 'BY_UNITS': {
      const ids = [...byId.keys()].filter((id) => (byId.get(id)?.units ?? 0) > 0);
      const weightEntries = ids.map((id) => [id, b(byId.get(id)?.units ?? 0)] as const);
      const sumUnits = sumBig(weightEntries.map(([, w]) => w));
      if (item.priceMode === 'UNIT_PRICE' && item.unitPrice !== null) {
        for (const [id, w] of weightEntries) shares.set(id, w * b(item.unitPrice));
      } else {
        // LINE_TOTAL indivisível: Maior Resto entre as unidades do item (denominador = quantidade)
        shares = largestRemainder(total, weightEntries, b(item.quantity), `item:${item.id}`);
      }
      if (sumUnits < b(item.quantity)) status = 'PARTIAL';
      break;
    }
    case 'CUSTOM_AMOUNT': {
      for (const a of item.allocations) {
        if (a.fixedAmount !== undefined) shares.set(a.participantId, b(a.fixedAmount));
      }
      const sum = sumBig(shares.values());
      if (sum !== total) status = 'PARTIAL';
      break;
    }
    case 'CUSTOM_PERCENT': {
      const ids = [...byId.keys()].filter((id) => (byId.get(id)?.percentBp ?? 0) > 0);
      shares = largestRemainder(
        total,
        ids.map((id) => [id, b(byId.get(id)?.percentBp ?? 0)] as const),
        10000n,
        `item:${item.id}`,
      );
      const sumBp = ids.reduce((s, id) => s + BigInt(byId.get(id)?.percentBp ?? 0), 0n);
      if (sumBp !== 10000n) status = 'PARTIAL';
      break;
    }
  }
  const assigned = sumBig(shares.values());
  if (assigned > total) throw new InvariantError(`item ${item.id}: assigned > total`);
  const unassigned = total - assigned;
  if (unassigned > 0n && status === 'SPLIT') status = 'PARTIAL';
  return { shares, unassigned, status };
}

function chargeBase(charge: Charge, itemsTotal: bigint): bigint | null {
  if (charge.amountSource === 'FROM_PERCENT' && charge.percentBp !== null) {
    return itemsTotal; // base = subtotal antes do desconto (spec/07 §2.2)
  }
  return null;
}

function chargeAmount(charge: Charge, base: bigint | null): bigint {
  if (charge.amountSource === 'FROM_PERCENT' && charge.percentBp !== null && base !== null) {
    return percentAmount(base, b(charge.percentBp));
  }
  return b(charge.amount);
}

export function derive(doc: BillDocument): Derived {
  const items = activeItems(doc);
  const itemsTotalBig = items.reduce((s, i) => s + b(i.lineTotal), 0n);

  // ── Itens ──
  const itemsDerived: Derived['items'] = {};
  const consumption = new Map<string, bigint>();
  let itemsUnassigned = 0n;

  for (const item of doc.items) {
    if (item.deletedAt !== null) {
      itemsDerived[item.id] = { status: 'DELETED', shares: {}, unassigned: 0 };
      continue;
    }
    const { shares, unassigned, status } = itemShares(item);
    const shareNums: Record<string, number> = {};
    for (const [pid, amt] of shares) {
      shareNums[pid] = n(amt);
      consumption.set(pid, (consumption.get(pid) ?? 0n) + amt);
    }
    itemsDerived[item.id] = { status, shares: shareNums, unassigned: n(unassigned) };
    itemsUnassigned += unassigned;
  }

  // ── Cobranças ──
  const chargesDerived: Derived['charges'] = {};
  let feesReceipt = 0n;
  let discountsReceipt = 0n;
  let feesTable = 0n;
  let discountsTable = 0n;
  let feesUnassigned = 0n;
  let discountsUnassigned = 0n;
  let waivedTotal = 0n;

  const allParticipants = doc.participants;
  const shareMap = new Map<string, bigint>(consumption);

  for (const charge of doc.charges) {
    const base = chargeBase(charge, itemsTotalBig);
    const amount = chargeAmount(charge, base);
    const eligible =
      charge.distribution === 'EQUAL_PER_PERSON'
        ? charge.splitAmong.length > 0
          ? charge.splitAmong // lista sempre explícita (§7.7.2)
          : charge.kind === 'DISCOUNT'
            ? // desconto igual sem lista rateia entre todos: "pessoa sem itens pode ficar negativa" (§7.10)
              allParticipants.map((p) => p.id)
            : [] // taxa igual sem quem divide → fica no saldo + pendência (§7.7.2)
        : charge.splitAmong.length > 0
          ? charge.splitAmong
          : allParticipants.map((p) => p.id);
    const waivedSet = new Set(charge.waiver === 'NONE' ? [] : charge.waivedFor);
    const payers = eligible.filter((id) => !waivedSet.has(id));

    let portions = new Map<string, bigint>();
    const waivedMap = new Map<string, bigint>();

    if (charge.distribution === 'EQUAL_PER_PERSON') {
      // Maior Resto entre quem paga (§7.7.2); dispensa de igual não muda a base contábil
      if (payers.length > 0) {
        portions = largestRemainder(
          amount,
          payers.map((id) => [id, 1n] as const),
          b(payers.length),
          `charge:${charge.id}`,
        );
      }
      for (const id of waivedSet) waivedMap.set(id, 0n);
    } else {
      // PROPORCIONAL ao consumo: denominador fixo = total de itens (§7.7.1)
      const weights = eligible.map((id) => [id, shareMap.get(id) ?? 0n] as const);
      const sumWeights = sumBig(weights.map(([, w]) => w));
      if (sumWeights > 0n && itemsTotalBig > 0n) {
        const allPortions = largestRemainder(amount, weights, itemsTotalBig, `charge:${charge.id}`);
        for (const id of eligible) {
          const share = allPortions.get(id) ?? 0n;
          if (waivedSet.has(id)) waivedMap.set(id, share);
          else portions.set(id, share);
        }
      } else {
        // Σ consumo = 0 ou totalItens = 0 → fica sem dono (pendência), não inventa
        for (const id of waivedSet) waivedMap.set(id, 0n);
      }
    }

    const assigned = sumBig(portions.values());
    if (assigned > amount) throw new InvariantError(`charge ${charge.id}: assigned > amount`);
    const waivedSum = sumBig(waivedMap.values());
    // parcela dispensada não é saldo (§7.7.3) nem parte (§7.8); só sai do totalAPagar
    const unassigned = amount - assigned - waivedSum;
    if (charge.kind === 'FEE') {
      feesUnassigned += unassigned;
      waivedTotal += waivedSum;
    } else {
      discountsUnassigned += unassigned;
    }

    const portionNums: Record<string, number> = {};
    for (const [pid, amt] of portions) portionNums[pid] = n(amt);
    const waivedNums: Record<string, number> = {};
    for (const [pid, amt] of waivedMap) waivedNums[pid] = n(amt);

    chargesDerived[charge.id] = {
      portions: portionNums,
      waived: waivedNums,
      unassigned: n(unassigned),
      base: base === null ? null : n(base),
    };

    if (charge.kind === 'FEE') {
      if (charge.scope === 'TABLE') feesTable += amount;
      else feesReceipt += amount;
    } else if (charge.scope === 'TABLE') {
      discountsTable += amount;
    } else {
      discountsReceipt += amount;
    }
  }

  // ── Totais e conciliação (§7.4) ──
  const receiptTotal = itemsTotalBig + feesReceipt - discountsReceipt; // totalComanda
  const totalMesa = feesTable - discountsTable;
  const printed = doc.printedTotal;
  const difference = printed === null ? 0n : b(printed) - receiptTotal;
  const reconciliationAdjustment =
    printed !== null &&
    difference !== 0n &&
    difference >= -RECONCILE_TOLERANCE &&
    difference <= RECONCILE_TOLERANCE
      ? difference
      : 0n;
  const reconciledTotal = receiptTotal + reconciliationAdjustment; // totalConferido

  if (reconciledTotal < 0n) throw new InvariantError('reconciledTotal < 0');

  // ── Ajuste de conciliação nas partes (proporcional ao consumo) ──
  const adjustmentByPerson = new Map<string, bigint>();
  let adjustmentUnassigned = 0n;
  if (reconciliationAdjustment !== 0n) {
    const withConsumption = [...consumption.entries()].filter(([, v]) => v > 0n);
    if (withConsumption.length === 0) {
      adjustmentUnassigned = reconciliationAdjustment;
    } else {
      const sumC = sumBig(withConsumption.map(([, v]) => v));
      const mag = adjustmentByPerson; // signed via largestRemainder com total negativo
      const dist = largestRemainder(
        reconciliationAdjustment,
        withConsumption.map(([id, v]) => [id, v] as const),
        sumC,
        `bill:${doc.id}`,
      );
      for (const [id, amt] of dist) mag.set(id, (mag.get(id) ?? 0n) + amt);
    }
  }

  // ── Partes ──
  const shares: Derived['shares'] = {};
  let totalAssigned = 0n;

  for (const p of doc.participants) {
    const cons = consumption.get(p.id) ?? 0n;
    const lines: Derived['shares'][string]['lines'] = [];
    for (const item of items) {
      const amt = itemsDerived[item.id]?.shares[p.id];
      if (amt) {
        lines.push({ kind: 'ITEM', refId: item.id, description: item.name, amount: amt });
      }
    }
    let feesShare = 0n;
    let discountsShare = 0n;
    for (const charge of doc.charges) {
      const portion = b(chargesDerived[charge.id]?.portions[p.id] ?? 0);
      if (portion === 0n) continue;
      const signed = charge.kind === 'FEE' ? portion : -portion;
      lines.push({
        kind: charge.kind === 'FEE' ? 'CHARGE' : 'DISCOUNT',
        refId: charge.id,
        description: charge.description,
        amount: n(signed),
      });
      if (charge.kind === 'FEE') feesShare += portion;
      else discountsShare += portion;
    }
    const adj = adjustmentByPerson.get(p.id) ?? 0n;
    if (adj !== 0n) {
      lines.push({
        kind: 'ADJUSTMENT',
        refId: 'reconciliation',
        description: domainMessages.reconciliationLine,
        amount: n(adj),
      });
    }
    const amount = cons + feesShare - discountsShare + adj;
    totalAssigned += amount;

    // estado de consumo
    let consumptionStatus: Derived['shares'][string]['consumptionStatus'];
    if (p.status === 'INVITED') consumptionStatus = 'AWAITING_ENTRY';
    else if (p.consumptionConfirmed)
      consumptionStatus = cons === 0n && amount === 0n ? 'CONFIRMED_ZERO' : 'CONFIRMED';
    else consumptionStatus = cons === 0n ? 'NOT_INFORMED' : 'AWAITING_CONFIRMATION';

    shares[p.id] = {
      consumption: n(cons),
      lines,
      adjustment: n(adj),
      amount: n(amount),
      consumptionStatus,
    };
  }

  // §7.8: saldoNaoDistribuido = totalAPagar − Σ parte_p (com sinal; desconto sem dono reduz)
  const amountDue = reconciledTotal - waivedTotal + totalMesa; // totalAPagar (§7.4)
  const unallocatedTotal = amountDue - totalAssigned;
  const unallocatedCharges = feesUnassigned - discountsUnassigned;

  // ── Bloqueios ──
  const blockers: Blocker[] = [];
  const add = (type: Blocker['type'], entityId: string) =>
    blockers.push({ type, entityId, id: `${type}:${entityId}` });

  for (const item of doc.items) {
    if (item.deletedAt !== null) continue;
    const d = itemsDerived[item.id];
    if (!d || d.status === 'SPLIT') continue;
    if (d.status === 'UNSPLIT') add('ITEM_NAO_DIVIDIDO', item.id);
    else if (item.splitMode === 'BY_UNITS') add('UNIDADES_NAO_DISTRIBUIDAS', item.id);
    else add('DIVISAO_INCOMPLETA', item.id);
  }

  for (const p of doc.participants) {
    const s = shares[p.id];
    if (!s) continue;
    if (p.status === 'INVITED') {
      if (s.consumption > 0) add('PARTICIPANTE_AGUARDANDO_ENTRADA', p.id);
      continue;
    }
    if (!p.consumptionConfirmed) {
      if (s.consumption === 0) add('PARTICIPANTE_NAO_INFORMOU', p.id);
      else add('PARTICIPANTE_NAO_CONFIRMOU', p.id);
    }
  }

  for (const charge of doc.charges) {
    if (!charge.confirmed && charge.origin === 'OCR') add('COBRANCA_NAO_CONFIRMADA', charge.id);
    const amount = chargeAmount(charge, chargeBase(charge, itemsTotalBig));
    if (amount > 0n) {
      if (
        charge.kind === 'FEE' &&
        charge.distribution === 'EQUAL_PER_PERSON' &&
        charge.splitAmong.length === 0
      ) {
        add('COBRANCA_SEM_RATEIO', charge.id); // §7.7.2: lista vazia → "defina quem divide"
      }
      if (charge.distribution === 'PROPORTIONAL' && itemsTotalBig === 0n) {
        add('COBRANCA_SEM_RATEIO', charge.id); // §7.7.1: totalItens = 0
      }
      if (
        charge.kind === 'DISCOUNT' &&
        (chargesDerived[charge.id]?.unassigned ?? 0) > 0 &&
        itemsUnassigned === 0n
      ) {
        add('COBRANCA_SEM_RATEIO', charge.id); // desconto com parcela sem dono e sem itens sem dono que a absorvam
      }
    }
  }

  if (printed !== null && (difference > RECONCILE_TOLERANCE || difference < -RECONCILE_TOLERANCE)) {
    add('DIVERGENCIA_COMANDA', doc.id);
  }

  const progress = {
    itemsSplit: items.filter((i) => itemsDerived[i.id]?.status === 'SPLIT').length,
    itemsTotal: items.length,
    peopleConfirmed: doc.participants.filter((p) => p.consumptionConfirmed).length,
    peopleTotal: doc.participants.length,
    sharesClosed: doc.participants.filter((p) => p.status === 'SHARE_CLOSED').length,
  };

  return {
    totals: {
      itemsTotal: n(itemsTotalBig),
      receiptTotal: n(receiptTotal),
      difference: n(difference),
      reconciliationAdjustment: n(reconciliationAdjustment),
      reconciledTotal: n(reconciledTotal),
      waivedTotal: n(waivedTotal),
      totalMesa: n(totalMesa),
      amountDue: n(amountDue),
    },
    items: itemsDerived,
    charges: chargesDerived,
    shares,
    unallocated: {
      // com sinal (§7.8): desconto sem dono reduz o saldo
      total: n(unallocatedTotal),
      bySource: {
        items: n(itemsUnassigned),
        charges: n(unallocatedCharges),
        adjustment: n(adjustmentUnassigned),
      },
    },
    blockers,
    progress,
  };
}

export function participantsWithAllocation(doc: BillDocument, participantId: string): boolean {
  return doc.items.some(
    (i) => i.deletedAt === null && i.allocations.some((a) => a.participantId === participantId),
  );
}

export function isParticipant(doc: BillDocument, participantId: string): Participant | undefined {
  return doc.participants.find((p) => p.id === participantId);
}
