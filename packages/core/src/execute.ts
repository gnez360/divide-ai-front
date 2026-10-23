import type {
  BillDocument,
  Charge,
  Command,
  EntryCommand,
  Item,
  Participant,
  Allocation,
} from '@cj/contracts';
import { domainMessages, errorMessages } from '@cj/contracts';
import { derive, isParticipant, participantsWithAllocation } from './derive.js';
import { percentAmount } from './calc.js';
import {
  DomainFailure,
  InvariantError,
  fail,
  type AuditEntry,
  type Effect,
  type ExecutionContext,
  type Result,
} from './types.js';
import type { Notification } from '@cj/contracts';

const b = (n: number): bigint => BigInt(n);

function clone<T>(v: T): T {
  return structuredClone(v);
}

function requireParticipantDoc(
  _doc: BillDocument,
  ctx: ExecutionContext,
): { id: string; isCreator: boolean } {
  if (ctx.actor.kind !== 'PARTICIPANT') fail('FORBIDDEN', domainMessages.participantOnly);
  return { id: ctx.actor.participantId, isCreator: ctx.actor.isCreator };
}

function requireCreator(doc: BillDocument, ctx: ExecutionContext): string {
  const a = requireParticipantDoc(doc, ctx);
  if (!a.isCreator) fail('FORBIDDEN', domainMessages.creatorOnly);
  return a.id;
}

function requireStatus(doc: BillDocument, allowed: BillDocument['status'][], what: string): void {
  if (!allowed.includes(doc.status)) {
    fail('INVALID_STATE', domainMessages.notPermittedInState(what), { status: doc.status });
  }
}

function requireOpen(doc: BillDocument, what: string): void {
  requireStatus(doc, ['OPEN'], what);
}

function getParticipant(doc: BillDocument, id: string): Participant {
  const p = isParticipant(doc, id);
  if (!p) fail('INVALID_REFERENCE', domainMessages.participantNotFound);
  return p;
}

function getItem(doc: BillDocument, id: string): Item {
  const it = doc.items.find((i) => i.id === id && i.deletedAt === null);
  if (!it) fail('INVALID_REFERENCE', domainMessages.itemNotFound);
  return it;
}

function getCharge(doc: BillDocument, id: string): Charge {
  const c = doc.charges.find((x) => x.id === id);
  if (!c) fail('INVALID_REFERENCE', domainMessages.chargeNotFound);
  return c;
}

/** Zera confirmação de consumo e conta mudança de atribuição. */
function touchConsumption(p: Participant, _now: string): void {
  p.consumptionConfirmed = false;
  p.confirmationSource = null;
  p.confirmedBy = null;
  p.confirmedAt = null;
  p.consumptionVersion += 1;
  if (p.status === 'SHARE_CLOSED') {
    p.status = 'ACTIVE';
    p.closedShareAmount = null;
    p.shareClosedAt = null;
  }
}

function bumpDetails(doc: BillDocument): void {
  doc.details.version += 1;
}

const CLOSED_PARTICIPANT_OK = new Set([
  'UPDATE_MY_PROFILE',
  'ANONYMIZE_ME',
  'DECIDE_CLAIM',
  'CLOSE_BILL',
]);

export function execute(doc: BillDocument, cmd: Command, ctx: ExecutionContext): Result {
  try {
    return run(doc, cmd, ctx);
  } catch (e) {
    if (e instanceof DomainFailure) return { ok: false, error: e.domain };
    if (e instanceof InvariantError) throw e;
    throw e;
  }
}

function run(doc: BillDocument, cmd: Command, ctx: ExecutionContext): Result {
  const next = clone(doc);
  const notifications: Notification[] = [];
  const audit: AuditEntry[] = [];
  const effects: Effect[] = [];
  let response: unknown = undefined;
  let noChange = false;

  const now = ctx.now;
  const actorP = ctx.actor.kind === 'PARTICIPANT' ? ctx.actor : null;

  // Fechada: só exceções de §F6.1 (DELETE_BILL vale em qualquer estado — §7.5)
  if (
    next.status === 'CLOSED' &&
    !CLOSED_PARTICIPANT_OK.has(cmd.type) &&
    cmd.type !== 'DELETE_BILL' &&
    cmd.type !== 'EXPIRE_CLAIM' &&
    cmd.type !== 'APPLY_OCR_RESULT' &&
    cmd.type !== 'FAIL_OCR' &&
    cmd.type !== 'EXPIRE_OCR_ATTEMPT'
  ) {
    if (cmd.type === 'CLOSE_BILL') {
      return { ok: true, noChange: true };
    }
    fail('BILL_ALREADY_CLOSED', domainMessages.billClosed);
  }

  switch (cmd.type) {
    // ── Fluxo OCR (criador) ─────────────────────────────────────────────
    case 'ENTER_MANUALLY': {
      requireCreator(next, ctx);
      requireStatus(next, ['DRAFT', 'OCR_FAILED'], domainMessages.manualEntry);
      next.status = 'RECEIPT_REVIEW';
      break;
    }
    case 'CANCEL_OCR': {
      requireCreator(next, ctx);
      requireStatus(next, ['OCR_PROCESSING'], domainMessages.cancelReading);
      if (next.ocrAttempt?.id !== cmd.attemptId || next.ocrAttempt.status !== 'PROCESSING') {
        noChange = true;
        break;
      }
      next.ocrAttempt.status = 'CANCELLED';
      next.ocrAttempt.finishedAt = now;
      next.status = 'DRAFT';
      break;
    }
    case 'ABANDON_OCR': {
      requireCreator(next, ctx);
      requireStatus(next, ['OCR_PROCESSING'], domainMessages.abandonReading);
      if (next.ocrAttempt?.id !== cmd.attemptId || next.ocrAttempt.status !== 'PROCESSING') {
        noChange = true;
        break;
      }
      next.ocrAttempt.status = 'FAILED';
      next.ocrAttempt.finishedAt = now;
      next.ocrAttempt.errorCode = 'OCR-03';
      next.status = 'OCR_FAILED';
      break;
    }
    case 'RETRY_OCR': {
      requireCreator(next, ctx);
      requireStatus(next, ['OCR_FAILED'], domainMessages.tryAgain);
      const attemptId = ctx.newId();
      next.ocrAttempt = {
        id: attemptId,
        status: 'PROCESSING',
        startedAt: now,
        finishedAt: null,
        errorCode: null,
      };
      next.status = 'OCR_PROCESSING';
      effects.push({ type: 'START_OCR', billId: next.id, attemptId });
      response = { attemptId };
      break;
    }
    case 'TAKE_NEW_PHOTO': {
      requireCreator(next, ctx);
      requireStatus(next, ['OCR_FAILED'], domainMessages.takeAnotherPhoto);
      next.ocrAttempt = null;
      next.status = 'DRAFT';
      effects.push({ type: 'DELETE_IMAGE', billId: next.id });
      break;
    }
    case 'DISCARD_RECEIPT': {
      requireCreator(next, ctx);
      requireStatus(next, ['RECEIPT_REVIEW'], domainMessages.discardReceipt);
      const v = next.details.version;
      next.details = { version: v + 1 };
      next.printedTotal = null;
      next.items = [];
      next.charges = [];
      next.ocrAttempt = null;
      next.status = 'DRAFT';
      effects.push({ type: 'DELETE_IMAGE', billId: next.id });
      break;
    }
    case 'CONFIRM_RECEIPT': {
      requireCreator(next, ctx);
      requireStatus(next, ['RECEIPT_REVIEW'], domainMessages.confirmReceipt);
      const d = derive(next);
      if (d.blockers.some((x) => x.type === 'DIVERGENCIA_COMANDA')) {
        fail('OPEN_BLOCKERS', domainMessages.printedTotalDivergence);
      }
      next.status = 'OPEN';
      next.receiptConfirmedAt = now;
      audit.push({ action: 'RECEIPT_CONFIRMED', target: {}, data: {} });
      break;
    }

    // ── Detalhes e itens ───────────────────────────────────────────────
    case 'UPDATE_BILL_DETAILS': {
      requireParticipantDoc(next, ctx);
      requireStatus(next, ['RECEIPT_REVIEW', 'OPEN'], domainMessages.editDetails);
      guardVersion(ctx, next.details.version, domainMessages.whatDetails);
      if (cmd.restaurantName !== undefined) next.details.restaurantName = cmd.restaurantName;
      if (cmd.table !== undefined) next.details.table = cmd.table;
      if (cmd.receiptNumber !== undefined) next.details.receiptNumber = cmd.receiptNumber;
      bumpDetails(next);
      break;
    }
    case 'SET_PRINTED_TOTAL': {
      requireParticipantDoc(next, ctx);
      requireStatus(next, ['RECEIPT_REVIEW', 'OPEN'], domainMessages.setPrintedTotal);
      guardVersion(ctx, next.details.version, domainMessages.whatDetails);
      const from = next.printedTotal;
      next.printedTotal = cmd.printedTotal;
      bumpDetails(next);
      if (from !== cmd.printedTotal) {
        notifications.push({
          type: 'PRINTED_TOTAL_CHANGED',
          from,
          to: cmd.printedTotal,
          actor: actorP!.participantId,
        });
      }
      audit.push({ action: 'PRINTED_TOTAL_SET', target: {}, data: { to: cmd.printedTotal } });
      break;
    }
    case 'ADD_ITEM': {
      requireParticipantDoc(next, ctx);
      requireStatus(next, ['RECEIPT_REVIEW', 'OPEN'], domainMessages.addItem);
      const unitPrice = cmd.priceMode === 'UNIT_PRICE' ? (cmd.unitPrice ?? null) : null;
      const lineTotal =
        cmd.priceMode === 'UNIT_PRICE' ? (unitPrice ?? 0) * cmd.quantity : (cmd.lineTotal ?? 0);
      if (cmd.priceMode === 'LINE_TOTAL' && cmd.lineTotal === undefined) {
        fail('INVALID_SPLIT', domainMessages.lineTotalRequired);
      }
      const item: Item = {
        id: ctx.newId(),
        name: cmd.name,
        quantity: cmd.quantity,
        priceMode: cmd.priceMode,
        unitPrice,
        lineTotal,
        splitMode: null,
        allocations: [],
        origin: 'MANUAL',
        deletedAt: null,
        deletedBy: null,
        version: 1,
      };
      next.items.push(item);
      response = { itemId: item.id };
      break;
    }
    case 'EDIT_ITEM': {
      requireParticipantDoc(next, ctx);
      requireStatus(next, ['RECEIPT_REVIEW', 'OPEN'], domainMessages.editItem);
      const item = getItem(next, cmd.itemId);
      guardVersion(ctx, item.version, domainMessages.whatItem);
      const affected = new Set(item.allocations.map((a) => a.participantId));
      if (
        cmd.quantity !== undefined &&
        cmd.quantity < item.quantity &&
        item.splitMode === 'BY_UNITS'
      ) {
        const allocatedUnits = item.allocations.reduce((s, a) => s + (a.units ?? 0), 0);
        if (allocatedUnits > cmd.quantity) {
          fail('REDUCTION_BLOCKED', domainMessages.reductionBlocked(allocatedUnits));
        }
      }
      const prevMode = item.priceMode;
      if (cmd.name !== undefined) item.name = cmd.name;
      if (cmd.quantity !== undefined) item.quantity = cmd.quantity;
      if (cmd.priceMode !== undefined) item.priceMode = cmd.priceMode;
      if (cmd.unitPrice !== undefined) item.unitPrice = cmd.unitPrice;
      if (cmd.lineTotal !== undefined) item.lineTotal = cmd.lineTotal;
      if (item.priceMode === 'UNIT_PRICE' && item.unitPrice !== null) {
        item.lineTotal = item.unitPrice * item.quantity;
      }
      if (
        prevMode !== item.priceMode &&
        item.priceMode === 'LINE_TOTAL' &&
        cmd.lineTotal === undefined &&
        prevMode === 'UNIT_PRICE'
      ) {
        // mantém o lineTotal derivado anterior; editável depois
      }
      item.version += 1;
      for (const pid of affected) touchConsumption(getParticipant(next, pid), now);
      break;
    }
    case 'DELETE_ITEM': {
      requireParticipantDoc(next, ctx);
      requireStatus(next, ['RECEIPT_REVIEW', 'OPEN'], domainMessages.deleteItem);
      const item = getItem(next, cmd.itemId);
      guardVersion(ctx, item.version, domainMessages.whatItem);
      item.deletedAt = now;
      item.deletedBy = actorP?.participantId ?? null;
      item.version += 1;
      for (const a of item.allocations)
        touchConsumption(getParticipant(next, a.participantId), now);
      notifications.push({
        type: 'ITEM_DELETED',
        itemId: item.id,
        actor: actorP?.participantId ?? 'system',
      });
      break;
    }
    case 'RESTORE_ITEM': {
      requireParticipantDoc(next, ctx);
      requireStatus(next, ['OPEN'], domainMessages.restoreItem);
      const item = next.items.find((i) => i.id === cmd.itemId);
      if (!item) fail('INVALID_REFERENCE', domainMessages.itemNotFound);
      item.deletedAt = null;
      item.deletedBy = null;
      item.version += 1;
      break;
    }
    case 'MERGE_ITEMS': {
      requireParticipantDoc(next, ctx);
      requireStatus(next, ['RECEIPT_REVIEW', 'OPEN'], domainMessages.mergeItems);
      const [a, bb] = cmd.itemIds.map((id) => getItem(next, id));
      if (!a || !bb) fail('INVALID_REFERENCE', domainMessages.itemNotFound);
      if (a.allocations.length > 0 || bb.allocations.length > 0) {
        fail('INVALID_STATE', domainMessages.mergeOnlyUndivided);
      }
      a.quantity += bb.quantity;
      if (a.priceMode === 'UNIT_PRICE' && a.unitPrice !== null)
        a.lineTotal = a.unitPrice * a.quantity;
      else a.lineTotal += bb.lineTotal;
      a.version += 1;
      bb.deletedAt = now;
      bb.deletedBy = actorP?.participantId ?? null;
      bb.version += 1;
      break;
    }

    // ── Divisão ────────────────────────────────────────────────────────
    case 'SET_SPLIT': {
      requireParticipantDoc(next, ctx);
      requireOpen(next, domainMessages.splitItem);
      const item = getItem(next, cmd.itemId);
      guardVersion(ctx, item.version, domainMessages.whatItem);
      const previous = new Set(item.allocations.map((a) => a.participantId));
      for (const a of cmd.allocations) getParticipant(next, a.participantId); // referência válida

      if (cmd.allocations.length === 0 && !cmd.partial) {
        fail('INVALID_SPLIT', domainMessages.selectAtLeastOnePerson);
      }
      const sumUnits = cmd.allocations.reduce((s, a) => s + (a.units ?? 0), 0);
      const sumFixed = cmd.allocations.reduce((s, a) => s + (a.fixedAmount ?? 0), 0);
      const sumBp = cmd.allocations.reduce((s, a) => s + (a.percentBp ?? 0), 0);
      if (cmd.mode === 'BY_UNITS' && sumUnits > item.quantity) {
        fail('INVALID_SPLIT', domainMessages.unitsFor(sumUnits, item.quantity));
      }
      if (!cmd.partial) {
        if (cmd.mode === 'BY_UNITS' && sumUnits !== item.quantity) {
          fail('INVALID_SPLIT', domainMessages.distributeAllUnits(sumUnits, item.quantity));
        }
        if (cmd.mode === 'CUSTOM_AMOUNT' && sumFixed !== item.lineTotal) {
          fail('INVALID_SPLIT', domainMessages.amountsDoNotMatchTotal);
        }
        if (cmd.mode === 'CUSTOM_PERCENT' && sumBp !== 10000) {
          fail('INVALID_SPLIT', domainMessages.percentSumMustBe100);
        }
      }

      item.splitMode = cmd.mode;
      item.allocations = cmd.allocations as Allocation[];
      item.version += 1;

      const nowAllocated = new Set(cmd.allocations.map((a) => a.participantId));
      const all = new Set([...previous, ...nowAllocated]);
      for (const pid of all) touchConsumption(getParticipant(next, pid), now);
      break;
    }

    // ── Cobranças ──────────────────────────────────────────────────────
    case 'ADD_CHARGE': {
      requireParticipantDoc(next, ctx);
      requireStatus(next, ['RECEIPT_REVIEW', 'OPEN'], domainMessages.addCharge);
      const itemsTotal = next.items
        .filter((i) => i.deletedAt === null)
        .reduce((s, i) => s + i.lineTotal, 0);
      let amount = cmd.amount;
      let amountSource: Charge['amountSource'] = cmd.amountSource ?? 'MANUAL';
      let reviewReason: Charge['reviewReason'] = null;
      if (cmd.percentBp != null && cmd.percentBp > 0) {
        const fromPercent = Number(percentAmount(b(itemsTotal), b(cmd.percentBp)));
        if (amount > 0) {
          if (Math.abs(fromPercent - amount) > 5) {
            if (!cmd.keepAnyway) fail('PERCENT_MISMATCH', domainMessages.valueDoesNotMatchPercent);
            reviewReason = 'PERCENT_MISMATCH';
          } else {
            amountSource = 'PRINTED';
          }
        } else {
          amount = fromPercent;
          amountSource = 'FROM_PERCENT';
        }
      }
      const charge: Charge = {
        id: ctx.newId(),
        description: cmd.description,
        kind: cmd.kind,
        scope: 'TABLE',
        amount,
        percentBp: cmd.percentBp ?? null,
        amountSource,
        origin: 'MANUAL',
        distribution: cmd.distribution ?? 'PROPORTIONAL',
        splitAmong: [],
        waiver: 'NONE',
        waivedFor: [],
        confirmed: true,
        confirmedBy: actorP?.participantId ?? null,
        reviewReason,
        version: 1,
      };
      next.charges.push(charge);
      assertTotalsNonNegative(next);
      response = { chargeId: charge.id };
      break;
    }
    case 'EDIT_CHARGE': {
      requireParticipantDoc(next, ctx);
      requireStatus(next, ['RECEIPT_REVIEW', 'OPEN'], domainMessages.editCharge);
      const charge = getCharge(next, cmd.chargeId);
      guardVersion(ctx, charge.version, domainMessages.whatCharge);
      const itemsTotal = next.items
        .filter((i) => i.deletedAt === null)
        .reduce((s, i) => s + i.lineTotal, 0);
      if (cmd.description !== undefined) charge.description = cmd.description;
      if (cmd.percentBp !== undefined) {
        charge.percentBp = cmd.percentBp;
        if (cmd.percentBp != null && cmd.percentBp > 0 && cmd.amount === undefined) {
          charge.amount = Number(percentAmount(b(itemsTotal), b(cmd.percentBp)));
          charge.amountSource = 'FROM_PERCENT';
        }
      }
      if (cmd.amount !== undefined) {
        if (charge.percentBp != null && charge.percentBp > 0) {
          const fromPercent = Number(percentAmount(b(itemsTotal), b(charge.percentBp)));
          if (Math.abs(fromPercent - cmd.amount) > 5 && !cmd.keepAnyway) {
            fail('PERCENT_MISMATCH', domainMessages.valueDoesNotMatchPercent);
          }
          if (Math.abs(fromPercent - cmd.amount) > 5) charge.reviewReason = 'PERCENT_MISMATCH';
        }
        charge.amount = cmd.amount;
        charge.amountSource = 'MANUAL';
      }
      charge.confirmed = charge.origin === 'OCR' ? false : true; // manual é explícita; OCR volta para revisão
      charge.version += 1;
      assertTotalsNonNegative(next);
      break;
    }
    case 'REMOVE_CHARGE': {
      requireParticipantDoc(next, ctx);
      requireStatus(next, ['RECEIPT_REVIEW', 'OPEN'], domainMessages.removeCharge);
      const charge = getCharge(next, cmd.chargeId);
      guardVersion(ctx, charge.version, domainMessages.whatCharge);
      next.charges = next.charges.filter((c) => c.id !== charge.id);
      break;
    }
    case 'CONFIRM_CHARGE': {
      requireParticipantDoc(next, ctx);
      requireStatus(next, ['RECEIPT_REVIEW', 'OPEN'], domainMessages.confirmCharge);
      const charge = getCharge(next, cmd.chargeId);
      guardVersion(ctx, charge.version, domainMessages.whatCharge);
      charge.confirmed = true;
      charge.confirmedBy = actorP?.participantId ?? null;
      charge.reviewReason = null;
      charge.version += 1;
      break;
    }
    case 'SET_WAIVER': {
      requireParticipantDoc(next, ctx);
      requireOpen(next, domainMessages.waivePayment);
      const charge = getCharge(next, cmd.chargeId);
      for (const id of cmd.waivedFor) getParticipant(next, id);
      charge.waiver = cmd.waiver;
      charge.waivedFor = cmd.waiver === 'NONE' ? [] : cmd.waivedFor;
      charge.version += 1;
      break;
    }
    case 'CREATE_DISCREPANCY_ADJUSTMENT': {
      requireParticipantDoc(next, ctx);
      requireStatus(next, ['RECEIPT_REVIEW', 'OPEN'], domainMessages.adjustReceipt);
      const d = derive(next);
      const diff = d.totals.difference;
      if (diff === 0) {
        noChange = true;
        break;
      }
      if (ctx.expected?.difference !== undefined && ctx.expected.difference !== diff) {
        fail('AMOUNT_CHANGED', domainMessages.divergenceChangedOnScreen, {
          current: diff,
        });
      }
      const charge: Charge = {
        id: ctx.newId(),
        description: domainMessages.discrepancyAdjustment,
        kind: diff > 0 ? 'FEE' : 'DISCOUNT',
        scope: 'RECEIPT', // ajuste de divergência é cobrança de escopo COMANDA (§7.5.2)
        amount: Math.abs(diff),
        percentBp: null,
        amountSource: 'MANUAL',
        origin: 'DISCREPANCY_ADJUSTMENT',
        distribution: 'PROPORTIONAL',
        splitAmong: [],
        waiver: 'NONE',
        waivedFor: [],
        confirmed: true,
        confirmedBy: actorP?.participantId ?? null,
        reviewReason: null,
        version: 1,
      };
      next.charges.push(charge);
      notifications.push({
        type: 'DISCREPANCY_ADJUSTMENT_CREATED',
        amount: Math.abs(diff),
        actor: actorP?.participantId ?? 'system',
      });
      audit.push({
        action: 'DISCREPANCY_ADJUSTMENT_CREATED',
        target: { chargeId: charge.id },
        data: { amount: Math.abs(diff) },
      });
      break;
    }

    // ── Participantes e convite ────────────────────────────────────────
    case 'PRE_REGISTER_SEAT': {
      requireParticipantDoc(next, ctx);
      requireOpen(next, domainMessages.preRegisterParticipant);
      if (next.participants.length >= next.seatLimit) fail('TABLE_FULL', domainMessages.tableFull);
      const p: Participant = {
        id: ctx.newId(),
        displayName: cmd.displayName,
        avatar: cmd.avatar,
        status: 'INVITED',
        consumptionConfirmed: false,
        confirmationSource: null,
        confirmedBy: null,
        confirmedAt: null,
        consumptionVersion: 0,
        closedShareAmount: null,
        shareClosedAt: null,
        preRegisteredBy: actorP?.participantId ?? null,
        joinedAt: null,
        joinOrder: next.participants.length + 1,
        anonymized: false,
        version: 1,
      };
      next.participants.push(p);
      response = { participantId: p.id };
      break;
    }
    case 'RENAME_SEAT': {
      requireParticipantDoc(next, ctx);
      requireOpen(next, domainMessages.renameSeat);
      const target = getParticipant(next, cmd.participantId);
      if (target.status !== 'INVITED')
        fail('INVALID_STATE', domainMessages.renameOnlyUnjoinedSeats);
      target.displayName = cmd.displayName;
      target.version += 1;
      break;
    }
    case 'UPDATE_MY_PROFILE': {
      const a = requireParticipantDoc(next, ctx);
      const me = getParticipant(next, a.id);
      guardVersion(ctx, me.version, domainMessages.whatProfile);
      me.displayName = cmd.displayName;
      me.avatar = cmd.avatar;
      me.version += 1;
      break;
    }
    case 'REMOVE_PARTICIPANT': {
      const a = requireParticipantDoc(next, ctx);
      if (!a.isCreator) fail('FORBIDDEN', domainMessages.creatorOnlyRemovesSeats);
      requireOpen(next, domainMessages.removeParticipant);
      const target = getParticipant(next, cmd.participantId);
      if (target.status !== 'INVITED')
        fail('REMOVAL_NOT_ALLOWED', domainMessages.removalOnlyUnjoined);
      if (participantsWithAllocation(next, target.id)) {
        fail('REMOVAL_NOT_ALLOWED', domainMessages.seatHasItems);
      }
      next.participants = next.participants.filter((p) => p.id !== target.id);
      notifications.push({ type: 'PARTICIPANT_REMOVED', participantId: target.id, actor: a.id });
      break;
    }
    case 'DECIDE_CLAIM': {
      requireParticipantDoc(next, ctx);
      const claim = next.claims.find((c) => c.id === cmd.claimId);
      if (!claim) fail('INVALID_REFERENCE', domainMessages.claimNotFound);
      if (claim.status !== 'PENDING') fail('INVALID_STATE', domainMessages.claimAlreadyAnswered);
      claim.status = cmd.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      claim.decidedAt = now;
      claim.decidedBy = actorP?.participantId ?? null;
      break;
    }
    case 'ROTATE_INVITE_LINK': {
      requireCreator(next, ctx);
      requireOpen(next, domainMessages.rotateLink);
      notifications.push({ type: 'INVITE_LINK_ROTATED' });
      response = { rotateInviteToken: true };
      break;
    }

    // ── Confirmação de consumo e fechamento ────────────────────────────
    case 'CONFIRM_MY_CONSUMPTION': {
      const a = requireParticipantDoc(next, ctx);
      requireOpen(next, domainMessages.confirmConsumption);
      const me = getParticipant(next, a.id);
      guardConsumptionVersion(me, ctx);
      me.consumptionConfirmed = true;
      me.confirmationSource = 'SELF';
      me.confirmedBy = a.id;
      me.confirmedAt = now;
      me.version += 1;
      break;
    }
    case 'CONFIRM_NO_CONSUMPTION': {
      const a = requireParticipantDoc(next, ctx);
      requireOpen(next, domainMessages.confirmZero);
      const me = getParticipant(next, a.id);
      guardConsumptionVersion(me, ctx);
      const d = derive(next);
      if ((d.shares[me.id]?.consumption ?? 0) !== 0) {
        fail('INVALID_STATE', domainMessages.itemsAssignedToYou);
      }
      me.consumptionConfirmed = true;
      me.confirmationSource = 'SELF';
      me.confirmedBy = a.id;
      me.confirmedAt = now;
      me.version += 1;
      break;
    }
    case 'CLOSE_MY_SHARE': {
      const a = requireParticipantDoc(next, ctx);
      requireOpen(next, domainMessages.closeMyShare);
      const me = getParticipant(next, a.id);
      guardConsumptionVersion(me, ctx);
      const d = derive(next);
      const amount = d.shares[me.id]?.amount ?? 0;
      if (ctx.expected?.shareAmount !== undefined && ctx.expected.shareAmount !== amount) {
        fail('AMOUNT_CHANGED', domainMessages.shareAmountChangedOnScreen, {
          current: amount,
        });
      }
      me.status = 'SHARE_CLOSED';
      me.closedShareAmount = amount;
      me.shareClosedAt = now;
      me.consumptionConfirmed = true;
      me.confirmationSource = 'SELF';
      me.confirmedBy = a.id;
      me.confirmedAt = now;
      me.version += 1;
      break;
    }
    case 'REOPEN_MY_SHARE': {
      const a = requireParticipantDoc(next, ctx);
      requireOpen(next, domainMessages.reopenMyShare);
      const me = getParticipant(next, a.id);
      if (me.status !== 'SHARE_CLOSED') noChange = true;
      else {
        me.status = 'ACTIVE';
        me.closedShareAmount = null;
        me.shareClosedAt = null;
        me.version += 1;
      }
      break;
    }
    case 'CONFIRM_ON_BEHALF':
    case 'CONFIRM_ZERO_ON_BEHALF': {
      const a = requireParticipantDoc(next, ctx);
      requireOpen(next, domainMessages.confirmOnBehalf);
      const target = getParticipant(next, cmd.participantId);
      if (target.id === a.id) fail('INVALID_STATE', domainMessages.useOwnCommand);
      guardConsumptionVersion(target, ctx);
      if (cmd.type === 'CONFIRM_ZERO_ON_BEHALF') {
        const d = derive(next);
        if ((d.shares[target.id]?.consumption ?? 0) !== 0) {
          fail('INVALID_STATE', domainMessages.itemsAssignedToPerson);
        }
      }
      target.consumptionConfirmed = true;
      target.confirmationSource = 'ON_BEHALF';
      target.confirmedBy = a.id;
      target.confirmedAt = now;
      target.version += 1;
      break;
    }
    case 'REMOVE_ITEMS_AND_CONFIRM_ZERO': {
      const a = requireParticipantDoc(next, ctx);
      requireOpen(next, domainMessages.unlinkConsumptions);
      const target = getParticipant(next, cmd.participantId);
      guardConsumptionVersion(target, ctx);
      for (const item of next.items) {
        if (item.deletedAt !== null || item.allocations.length === 0) continue;
        const had = item.allocations.some((x) => x.participantId === target.id);
        if (!had) continue;
        item.allocations = item.allocations.filter((x) => x.participantId !== target.id);
        item.version += 1;
        // EQUAL com resto → permanece com os demais; BY_UNITS → volta ao pool; CUSTOM → faltante
      }
      touchConsumption(target, now); // zera…
      target.consumptionConfirmed = true; // …e confirma zero em nome dela
      target.confirmationSource = 'ON_BEHALF';
      target.confirmedBy = a.id;
      target.confirmedAt = now;
      break;
    }
    case 'CLOSE_BILL': {
      requireParticipantDoc(next, ctx);
      requireOpen(next, domainMessages.closeBill);
      const d = derive(next);
      if (d.blockers.length > 0) {
        fail('OPEN_BLOCKERS', domainMessages.openBlockers, {
          blockers: d.blockers.map((x) => x.id),
        });
      }
      next.status = 'CLOSED';
      next.closedAt = now;
      for (const p of next.participants) p.version += 1;
      notifications.push({ type: 'BILL_CLOSED' });
      audit.push({ action: 'BILL_CLOSED', target: {}, data: {} });
      break;
    }
    case 'ANONYMIZE_ME': {
      const a = requireParticipantDoc(next, ctx);
      const me = getParticipant(next, a.id);
      me.displayName = `Participante ${me.joinOrder}`;
      me.avatar = { initial: '·', color: 'slate' };
      me.anonymized = true;
      me.version += 1;
      audit.push({ action: 'PARTICIPANT_ANONYMIZED', target: { participantId: me.id }, data: {} });
      break;
    }
    case 'DELETE_BILL': {
      requireCreator(next, ctx);
      audit.push({ action: 'BILL_DELETED', target: {}, data: {} });
      effects.push({ type: 'REVOKE_SESSIONS', billId: next.id, participantId: 'ALL' });
      effects.push({ type: 'NOTIFY_BILL_DELETED', billId: next.id });
      effects.push({ type: 'DELETE_IMAGE', billId: next.id });
      response = { deleteBill: true };
      break;
    }

    default: {
      const t = (cmd as { type: string }).type;
      if (
        [
          'START_OCR',
          'APPLY_OCR_RESULT',
          'FAIL_OCR',
          'EXPIRE_OCR_ATTEMPT',
          'EXPIRE_CLAIM',
        ].includes(t)
      ) {
        fail('INVALID_STATE', domainMessages.systemCommandFromClient);
      }
      fail('INVALID_STATE', domainMessages.unsupportedCommand(t));
    }
  }

  if (noChange) return { ok: true, noChange: true, response };

  // Validações globais pós-mutação
  if (cmd.type !== 'DELETE_BILL') assertTotalsNonNegative(next);
  const prevDerived = derive(doc);
  const derived = derive(next);
  assertNoNegativeShares(derived);

  // Reaberturas (§F5.10) — REOPEN_MY_SHARE é reabertura explícita, não precisa de aceite
  const reopened: string[] = [];
  const acceptedReopens = new Set(ctx.acceptedReopens ?? []);
  if (cmd.type !== 'REOPEN_MY_SHARE') {
    for (const p of doc.participants) {
      if (p.status !== 'SHARE_CLOSED') continue;
      const after = next.participants.find((x) => x.id === p.id);
      if (!after) continue;
      const before = prevDerived.shares[p.id]?.amount ?? 0;
      const nowAmt = derived.shares[p.id]?.amount ?? 0;
      const reopenedNow = after.status !== 'SHARE_CLOSED';
      if (
        reopenedNow ||
        after.consumptionVersion !== p.consumptionVersion ||
        nowAmt !== before ||
        after.closedShareAmount !== nowAmt
      ) {
        reopened.push(p.id);
        if (!acceptedReopens.has(p.id)) {
          fail('REOPENS_NOT_ACCEPTED', domainMessages.reopensNotReviewed, {
            participants: reopened,
          });
        }
      }
    }
  }
  // Partes fechadas cujo valor mudou voltam a ATIVO
  for (const p of next.participants) {
    if (p.status !== 'SHARE_CLOSED') continue;
    const amt = derived.shares[p.id]?.amount ?? 0;
    if (p.closedShareAmount !== null && p.closedShareAmount !== amt) {
      p.status = 'ACTIVE';
      p.closedShareAmount = null;
      p.shareClosedAt = null;
      if (!reopened.includes(p.id)) reopened.push(p.id);
    }
  }

  return {
    ok: true,
    doc: next,
    derived,
    reopened,
    notifications,
    audit,
    effects,
    response,
  };
}

function guardConsumptionVersion(p: Participant, ctx: ExecutionContext): void {
  const expected = ctx.expected?.consumptionVersion;
  if (expected !== undefined && expected !== p.consumptionVersion) {
    fail('CONSUMPTION_CHANGED', domainMessages.consumptionChanged, {
      current: p.consumptionVersion,
    });
  }
}

function guardVersion(ctx: ExecutionContext, entityVersion: number, what = 'registro'): void {
  if (ctx.expected?.version !== undefined && ctx.expected.version !== entityVersion) {
    fail('VERSION_CONFLICT', domainMessages.entityChangedByOther(what), { current: entityVersion });
  }
}

function assertNoNegativeShares(d: ReturnType<typeof derive>): void {
  for (const [pid, s] of Object.entries(d.shares)) {
    if (s.amount < 0) {
      fail('NEGATIVE_SHARE', domainMessages.negativeShare, {
        participantId: pid,
        amount: s.amount,
      });
    }
  }
}

function assertTotalsNonNegative(doc: BillDocument): void {
  const itemsTotal = doc.items
    .filter((i) => i.deletedAt === null)
    .reduce((s, i) => s + i.lineTotal, 0);
  let fees = 0;
  let discounts = 0;
  for (const c of doc.charges) {
    if (c.kind === 'FEE') fees += c.amount;
    else discounts += c.amount;
  }
  if (itemsTotal + fees - discounts < 0) {
    fail('DISCOUNT_EXCEEDS_RECEIPT', domainMessages.discountExceedsReceipt);
  }
}

// ── Comandos de entrada (VISITOR) ──────────────────────────────────────────
export function executeEntry(doc: BillDocument, cmd: EntryCommand, ctx: ExecutionContext): Result {
  try {
    return runEntry(clone(doc), cmd, ctx);
  } catch (e) {
    if (e instanceof DomainFailure) return { ok: false, error: e.domain };
    throw e;
  }
}

function runEntry(doc: BillDocument, cmd: EntryCommand, ctx: ExecutionContext): Result {
  const notifications: Notification[] = [];
  const audit: AuditEntry[] = [];
  const effects: Effect[] = [];
  const now = ctx.now;

  if (doc.status !== 'OPEN' && !(doc.status === 'CLOSED' && cmd.type === 'REQUEST_CLAIM')) {
    fail('INVALID_STATE', domainMessages.invalidLink, { status: doc.status });
  }

  switch (cmd.type) {
    case 'JOIN_AS_NEW': {
      if (doc.status !== 'OPEN') fail('INVALID_STATE', domainMessages.billUnavailable);
      if (doc.participants.length >= doc.seatLimit) fail('TABLE_FULL', errorMessages.TABLE_FULL);
      const p: Participant = {
        id: ctx.newId(),
        displayName: cmd.displayName,
        avatar: cmd.avatar,
        status: 'ACTIVE',
        consumptionConfirmed: false,
        confirmationSource: null,
        confirmedBy: null,
        confirmedAt: null,
        consumptionVersion: 0,
        closedShareAmount: null,
        shareClosedAt: null,
        preRegisteredBy: null,
        joinedAt: now,
        joinOrder: doc.participants.length + 1,
        anonymized: false,
        version: 1,
      };
      doc.participants.push(p);
      return {
        ok: true,
        doc,
        derived: derive(doc),
        reopened: [],
        notifications,
        audit,
        effects,
        response: { participantId: p.id },
      };
    }
    case 'TAKE_RESERVED_SEAT': {
      if (doc.status !== 'OPEN') fail('INVALID_STATE', domainMessages.billUnavailable);
      const target = getParticipant(doc, cmd.participantId);
      if (target.status !== 'INVITED') fail('SEAT_TAKEN', domainMessages.seatTaken);
      target.status = 'ACTIVE';
      target.joinedAt = now;
      target.version += 1;
      return {
        ok: true,
        doc,
        derived: derive(doc),
        reopened: [],
        notifications,
        audit,
        effects,
        response: { participantId: target.id },
      };
    }
    case 'REQUEST_CLAIM': {
      const target = getParticipant(doc, cmd.participantId);
      if (target.status !== 'ACTIVE' && target.status !== 'SHARE_CLOSED') {
        fail('INVALID_STATE', domainMessages.claimNotClaimable);
      }
      const claimId = ctx.newId();
      doc.claims.push({
        id: claimId,
        targetParticipantId: target.id,
        status: 'PENDING',
        requestedAt: now,
        decidedAt: null,
        decidedBy: null,
      });
      return {
        ok: true,
        doc,
        derived: derive(doc),
        reopened: [],
        notifications: [{ type: 'CLAIM_PENDING', claimId, targetParticipantId: target.id }],
        audit,
        effects,
        response: { claimId },
      };
    }
  }
}

// ── Comandos de sistema ────────────────────────────────────────────────────
export function executeSystem(doc: BillDocument, cmd: Command, ctx: ExecutionContext): Result {
  try {
    return runSystem(clone(doc), cmd, ctx);
  } catch (e) {
    if (e instanceof DomainFailure) return { ok: false, error: e.domain };
    throw e;
  }
}

function runSystem(doc: BillDocument, cmd: Command, ctx: ExecutionContext): Result {
  const now = ctx.now;
  const audit: AuditEntry[] = [];
  const effects: Effect[] = [];

  switch (cmd.type) {
    case 'START_OCR': {
      doc.ocrAttempt = {
        id: cmd.attemptId,
        status: 'PROCESSING',
        startedAt: now,
        finishedAt: null,
        errorCode: null,
      };
      doc.status = 'OCR_PROCESSING';
      break;
    }
    case 'APPLY_OCR_RESULT': {
      if (doc.ocrAttempt?.id !== cmd.attemptId || doc.ocrAttempt.status !== 'PROCESSING') {
        return { ok: true, noChange: true };
      }
      doc.ocrAttempt.status = 'COMPLETED';
      doc.ocrAttempt.finishedAt = now;
      doc.details = {
        restaurantName: cmd.restaurantName,
        table: cmd.table,
        receiptNumber: doc.details.receiptNumber ?? null,
        version: doc.details.version + 1,
      };
      doc.printedTotal = cmd.printedTotal;
      doc.items = cmd.items
        .map((it, idx) => ({
          id: ctx.newId(),
          name: it.name,
          quantity: it.quantity,
          priceMode: it.priceMode,
          unitPrice: it.unitPrice,
          lineTotal: it.lineTotal,
          splitMode: null,
          allocations: [],
          origin: 'OCR' as const,
          deletedAt: null,
          deletedBy: null,
          version: 1,
          _order: idx,
        }))
        .map(({ _order, ...rest }) => rest);
      doc.charges = cmd.charges.map((c) => ({
        id: ctx.newId(),
        description: c.description,
        kind: c.kind,
        scope: 'RECEIPT' as const, // taxas impressas na comanda (§7.4)
        amount: c.amount,
        percentBp: c.percentBp,
        amountSource: (c.percentBp != null && c.percentBp > 0 && c.amount === 0
          ? 'FROM_PERCENT'
          : 'PRINTED') as 'PRINTED',
        origin: 'OCR' as const,
        distribution: 'PROPORTIONAL' as const,
        splitAmong: [],
        waiver: 'NONE' as const,
        waivedFor: [],
        confirmed: false,
        confirmedBy: null,
        reviewReason: c.reviewReason,
        version: 1,
      }));
      doc.status = 'RECEIPT_REVIEW';
      break;
    }
    case 'FAIL_OCR': {
      if (doc.ocrAttempt?.id !== cmd.attemptId || doc.ocrAttempt.status !== 'PROCESSING') {
        return { ok: true, noChange: true };
      }
      doc.ocrAttempt.status = 'FAILED';
      doc.ocrAttempt.finishedAt = now;
      doc.ocrAttempt.errorCode = cmd.errorCode;
      doc.status = 'OCR_FAILED';
      break;
    }
    case 'EXPIRE_OCR_ATTEMPT': {
      if (doc.ocrAttempt?.id !== cmd.attemptId || doc.ocrAttempt.status !== 'PROCESSING') {
        return { ok: true, noChange: true };
      }
      doc.ocrAttempt.status = 'EXPIRED';
      doc.ocrAttempt.finishedAt = now;
      doc.ocrAttempt.errorCode = 'OCR-03';
      doc.status = 'OCR_FAILED';
      break;
    }
    case 'EXPIRE_CLAIM': {
      const claim = doc.claims.find((c) => c.id === cmd.claimId);
      if (!claim || claim.status !== 'PENDING') return { ok: true, noChange: true };
      claim.status = 'EXPIRED';
      claim.decidedAt = now;
      break;
    }
    default:
      fail('INVALID_STATE', domainMessages.systemCommandInvalid);
  }

  const derived = derive(doc);
  return { ok: true, doc, derived, reopened: [], notifications: [], audit, effects };
}
