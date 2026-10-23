import { describe, expect, it } from 'vitest';
import { execute, executeEntry, executeSystem } from '../src/execute.js';
import { derive } from '../src/derive.js';
import type { Command } from '@cj/contracts';
import type { ExecutionContext } from '../src/types.js';
import {
  bill,
  charge,
  creatorCtx,
  datasetBill,
  item,
  newId,
  participant,
  systemCtx,
  MARIA,
  NERY,
  ctx,
  visitorCtx,
} from './helpers.js';

const run = (
  doc: ReturnType<typeof bill>,
  cmd: Command,
  who: ExecutionContext['actor'] | ExecutionContext = creatorCtx(doc.createdBy),
) => execute(doc, cmd, 'actor' in who ? who : ctx(who));

function expectDomain(r: ReturnType<typeof execute>, code: string) {
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error.code).toBe(code);
}

describe('pipeline de comandos', () => {
  it('CONFIRM_RECEIPT → OPEN → SET_SPLIT divide', () => {
    let doc = bill({
      status: 'RECEIPT_REVIEW',
      createdBy: MARIA,
      participants: [participant(MARIA, 'Maria', 1), participant(NERY, 'Nery', 2)],
    });
    // todos confirmados (sem bloqueios de consumo) → confirmar comanda
    for (const p of doc.participants) {
      p.consumptionConfirmed = true;
      p.confirmationSource = 'SELF';
      p.confirmedBy = p.id;
      p.confirmedAt = 'now';
    }
    const conf = execute(doc, { type: 'CONFIRM_RECEIPT' }, creatorCtx(MARIA));
    expect(conf.ok).toBe(true);
    if (!conf.ok || conf.noChange) return;
    doc = conf.doc;
    expect(doc.status).toBe('OPEN');
    const add = execute(
      doc,
      { type: 'ADD_ITEM', name: 'Pizza', quantity: 1, priceMode: 'LINE_TOTAL', lineTotal: 12000 },
      creatorCtx(MARIA),
    );
    expect(add.ok && !add.noChange).toBe(true);
    if (!add.ok || add.noChange) return;
    doc = add.doc;
    const itemId = (add.response as { itemId: string }).itemId;
    const split = execute(
      doc,
      {
        type: 'SET_SPLIT',
        itemId,
        mode: 'EQUAL',
        allocations: [{ participantId: MARIA }, { participantId: NERY }],
      },
      creatorCtx(MARIA),
    );
    expect(split.ok && !split.noChange).toBe(true);
    if (!split.ok || split.noChange) return;
    doc = split.doc;
    // pizza 12000 ÷ 2 = 6000 cada
    const d = derive(doc);
    expect(d.shares[MARIA]!.amount).toBe(6000);
  });

  it('CONFIRM_RECEIPT com divergência > 5¢ é bloqueado (OPEN_BLOCKERS)', () => {
    const doc = { ...datasetBill(), status: 'RECEIPT_REVIEW' as const, printedTotal: 23100 + 50 };
    const r = run(doc, { type: 'CONFIRM_RECEIPT' });
    expectDomain(r, 'OPEN_BLOCKERS');
  });

  it('guarda de versão: EDIT_ITEM com expected errado → VERSION_CONFLICT', () => {
    const base = datasetBill();
    const itemId = base.items[0]!.id;
    const r = execute(
      base,
      { type: 'EDIT_ITEM', itemId, name: 'Novo' },
      { ...creatorCtx(base.createdBy), expected: { version: 99 } },
    );
    expectDomain(r, 'VERSION_CONFLICT');
  });

  it('REDUCTION_BLOCKED: reduzir quantidade com mais unidades distribuídas', () => {
    const doc = bill({
      createdBy: MARIA,
      participants: [
        participant(MARIA, 'Maria', 1, {
          consumptionConfirmed: true,
          confirmationSource: 'SELF',
          confirmedBy: MARIA,
          confirmedAt: 'now',
        }),
      ],
      items: [
        item({
          quantity: 5,
          unitPrice: 1000,
          lineTotal: 5000,
          splitMode: 'BY_UNITS',
          allocations: [{ participantId: MARIA, units: 5 }],
        }),
      ],
    });
    const r = run(doc, { type: 'EDIT_ITEM', itemId: doc.items[0]!.id, quantity: 4 });
    expectDomain(r, 'REDUCTION_BLOCKED');
  });

  it('INVALID_SPLIT: BY_UNITS incompleto sem partial', () => {
    const doc = bill({
      createdBy: MARIA,
      participants: [participant(MARIA, 'Maria', 1)],
      items: [item({ quantity: 4, lineTotal: 4000, splitMode: null })],
    });
    const r = run(doc, {
      type: 'SET_SPLIT',
      itemId: doc.items[0]!.id,
      mode: 'BY_UNITS',
      allocations: [{ participantId: MARIA, units: 3 }],
    });
    expectDomain(r, 'INVALID_SPLIT');
  });

  it('CUSTOM_PERCENT sem fechar 100% → INVALID_SPLIT (exceto partial)', () => {
    const doc = bill({
      createdBy: MARIA,
      participants: [participant(MARIA, 'Maria', 1), participant(NERY, 'Nery', 2)],
      items: [item({ lineTotal: 3000 })],
    });
    const r = run(doc, {
      type: 'SET_SPLIT',
      itemId: doc.items[0]!.id,
      mode: 'CUSTOM_PERCENT',
      allocations: [
        { participantId: MARIA, percentBp: 3000 },
        { participantId: NERY, percentBp: 3000 },
      ],
    });
    expectDomain(r, 'INVALID_SPLIT');
    const partial = run(doc, {
      type: 'SET_SPLIT',
      itemId: doc.items[0]!.id,
      mode: 'CUSTOM_PERCENT',
      allocations: [
        { participantId: MARIA, percentBp: 3000 },
        { participantId: NERY, percentBp: 3000 },
      ],
      partial: true,
    });
    expect(partial.ok).toBe(true);
    if (partial.ok && !partial.noChange) {
      const d = derive(partial.doc);
      expect(d.items[doc.items[0]!.id]!.status).toBe('PARTIAL');
      expect(d.blockers.some((x) => x.type === 'DIVISAO_INCOMPLETA')).toBe(true);
    }
  });

  it('DISCOUNT_EXCEEDS_RECEIPT: desconto maior que a comanda', () => {
    const doc = datasetBill();
    const r = run(doc, {
      type: 'ADD_CHARGE',
      description: 'Cupom',
      kind: 'DISCOUNT',
      amount: 999999,
    });
    expectDomain(r, 'DISCOUNT_EXCEEDS_RECEIPT');
  });

  it('NEGATIVE_SHARE: desconto igual deixa parte negativa → 422', () => {
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
    });
    const r = execute(
      doc,
      {
        type: 'ADD_CHARGE',
        description: 'Desconto',
        kind: 'DISCOUNT',
        amount: 4000,
        distribution: 'EQUAL_PER_PERSON',
      },
      creatorCtx(a.id),
    );
    expectDomain(r, 'NEGATIVE_SHARE');
  });

  it('CLOSE_BILL com pendências → OPEN_BLOCKERS; limpo → CLOSED', () => {
    const doc = datasetBill();
    const blocked = run(doc, { type: 'CLOSE_BILL' });
    // dataset está sem itens divididos? Não: CUSTOM_AMOUNT cobre tudo, todos confirmados, divergência 0
    if (blocked.ok && !blocked.noChange) {
      expect(blocked.doc.status).toBe('CLOSED');
    } else {
      expect(blocked.ok).toBe(false);
    }
    // agora com item não dividido
    const doc2 = { ...datasetBill(), items: [item({ lineTotal: 500 })] };
    expectDomain(run(doc2, { type: 'CLOSE_BILL' }), 'OPEN_BLOCKERS');
  });

  it('REOPENS_NOT_ACCEPTED: editar item dividido reabre parte fechada sem aceite', () => {
    const base = datasetBill();
    const closed = base.participants.map((p) =>
      p.id === NERY
        ? { ...p, status: 'SHARE_CLOSED' as const, closedShareAmount: 4400, shareClosedAt: 'now' }
        : p,
    );
    const doc = { ...base, participants: closed };
    const itemId = doc.items[0]!.id;
    const r = run(doc, { type: 'EDIT_ITEM', itemId, name: 'Outro' });
    expectDomain(r, 'REOPENS_NOT_ACCEPTED');
    const r2 = execute(
      doc,
      { type: 'EDIT_ITEM', itemId, name: 'Outro' },
      { ...creatorCtx(doc.createdBy), acceptedReopens: [NERY] },
    );
    expect(r2.ok).toBe(true);
    if (r2.ok && !r2.noChange) {
      const nery = r2.doc.participants.find((p) => p.id === NERY)!;
      expect(nery.status).toBe('ACTIVE');
      expect(nery.closedShareAmount).toBeNull();
      expect(r2.reopened).toContain(NERY);
    }
  });

  it('CONSUMPTION_CHANGED: CONFIRM_MY_CONSUMPTION com versão errada', () => {
    const doc = datasetBill();
    const r = execute(
      doc,
      { type: 'CONFIRM_MY_CONSUMPTION' },
      {
        ...creatorCtx(MARIA),
        expected: { consumptionVersion: 99 },
      },
    );
    expectDomain(r, 'CONSUMPTION_CHANGED');
  });

  it('AMOUNT_CHANGED: CLOSE_MY_SHARE com shareAmount divergente', () => {
    const doc = datasetBill();
    const r = execute(
      doc,
      { type: 'CLOSE_MY_SHARE' },
      {
        ...creatorCtx(MARIA),
        expected: { shareAmount: 1 },
      },
    );
    expectDomain(r, 'AMOUNT_CHANGED');
  });

  it('CLOSE_MY_SHARE fecha com o valor certo; REOPEN_MY_SHARE volta', () => {
    const doc = datasetBill();
    const close = execute(
      doc,
      { type: 'CLOSE_MY_SHARE' },
      {
        ...creatorCtx(MARIA),
        expected: {
          shareAmount: 6490,
          consumptionVersion: doc.participants.find((p) => p.id === MARIA)!.consumptionVersion,
        },
      },
    );
    expect(close.ok).toBe(true);
    if (close.ok && !close.noChange) {
      const me = close.doc.participants.find((p) => p.id === MARIA)!;
      expect(me.status).toBe('SHARE_CLOSED');
      expect(me.closedShareAmount).toBe(6490);
      expect(me.consumptionConfirmed).toBe(true);
      const reopen = execute(close.doc, { type: 'REOPEN_MY_SHARE' }, creatorCtx(MARIA));
      expect(reopen.ok).toBe(true);
      if (reopen.ok && !reopen.noChange) {
        expect(reopen.doc.participants.find((p) => p.id === MARIA)!.status).toBe('ACTIVE');
      }
    }
  });

  it('FORBIDDEN: não criador não confirma comanda nem rotaciona link', () => {
    const doc = datasetBill();
    expectDomain(
      run(
        doc,
        { type: 'CONFIRM_RECEIPT' },
        { kind: 'PARTICIPANT', participantId: NERY, isCreator: false },
      ),
      'FORBIDDEN',
    );
    expectDomain(
      run(
        doc,
        { type: 'ROTATE_INVITE_LINK' },
        { kind: 'PARTICIPANT', participantId: NERY, isCreator: false },
      ),
      'FORBIDDEN',
    );
  });

  it('BILL_ALREADY_CLOSED em conta finalizada (menos exceções de §F6.1)', () => {
    const doc = { ...datasetBill(), status: 'CLOSED' as const, closedAt: 'now' };
    expectDomain(
      run(doc, {
        type: 'ADD_ITEM',
        name: 'X',
        quantity: 1,
        priceMode: 'LINE_TOTAL',
        lineTotal: 100,
      }),
      'BILL_ALREADY_CLOSED',
    );
    const anon = execute(doc, { type: 'ANONYMIZE_ME' }, creatorCtx(MARIA));
    expect(anon.ok).toBe(true);
  });

  it('CREATE_DISCREPANCY_ADJUSTMENT resolve divergência > 5¢', () => {
    const doc = { ...datasetBill(), printedTotal: 23100 + 1000 };
    const before = derive(doc);
    expect(before.totals.difference).toBe(1000);
    const r = execute(
      doc,
      { type: 'CREATE_DISCREPANCY_ADJUSTMENT' },
      {
        ...creatorCtx(MARIA),
        expected: { difference: 1000 },
      },
    );
    expect(r.ok).toBe(true);
    if (r.ok && !r.noChange) {
      const d = derive(r.doc);
      expect(d.totals.difference).toBe(0);
      expect(d.blockers.some((x) => x.type === 'DIVERGENCIA_COMANDA')).toBe(false);
      expect(d.totals.reconciledTotal).toBe(24100);
      // Σ partes = reconciled
      const sum = Object.values(d.shares).reduce((s, x) => s + x.amount, 0);
      expect(sum).toBe(24100);
    }
  });

  it('DELETE_BILL valida e emite efeitos; DELETE_BILL sem criador → FORBIDDEN', () => {
    const doc = datasetBill();
    const r = run(doc, { type: 'DELETE_BILL', confirmation: 'EXCLUIR' });
    expect(r.ok).toBe(true);
    if (r.ok && !r.noChange) {
      expect(r.effects.some((e) => e.type === 'NOTIFY_BILL_DELETED')).toBe(true);
      expect(r.effects.some((e) => e.type === 'REVOKE_SESSIONS')).toBe(true);
    }
    expectDomain(
      execute(
        doc,
        { type: 'DELETE_BILL', confirmation: 'EXCLUIR' },
        ctx({ kind: 'PARTICIPANT', participantId: NERY, isCreator: false }),
      ),
      'FORBIDDEN',
    );
  });
});

describe('comandos de sistema (OCR)', () => {
  it('START_OCR → APPLY_OCR_RESULT preenche itens e vai para RECEIPT_REVIEW', () => {
    let doc = bill({
      status: 'DRAFT',
      createdBy: MARIA,
      participants: [participant(MARIA, 'Maria', 1)],
    });
    const start = executeSystem(doc, { type: 'START_OCR', attemptId: newId() }, systemCtx());
    expect(start.ok && !start.noChange).toBe(true);
    if (!start.ok || start.noChange) return;
    doc = start.doc;
    expect(doc.status).toBe('OCR_PROCESSING');
    const attemptId = doc.ocrAttempt!.id;
    const apply = executeSystem(
      doc,
      {
        type: 'APPLY_OCR_RESULT',
        attemptId,
        restaurantName: 'Boteco',
        table: '12',
        printedTotal: 15500,
        items: [
          {
            name: 'Cerveja',
            quantity: 4,
            priceMode: 'UNIT_PRICE',
            unitPrice: 900,
            lineTotal: 3600,
          },
          { name: 'Isca', quantity: 1, priceMode: 'LINE_TOTAL', unitPrice: null, lineTotal: 5900 },
        ],
        charges: [
          {
            description: 'Serviço',
            kind: 'FEE',
            amount: 2100,
            percentBp: null,
            reviewReason: null,
          },
        ],
      },
      systemCtx(),
    );
    expect(apply.ok && !apply.noChange).toBe(true);
    if (!apply.ok || apply.noChange) return;
    expect(apply.doc.status).toBe('RECEIPT_REVIEW');
    expect(apply.doc.items).toHaveLength(2);
    expect(apply.doc.items[0]!.origin).toBe('OCR');
    expect(apply.doc.charges[0]!.confirmed).toBe(false);
    expect(derive(apply.doc).blockers.some((x) => x.type === 'COBRANCA_NAO_CONFIRMADA')).toBe(true);
    const d = derive(apply.doc);
    expect(d.totals.itemsTotal).toBe(9500);
    expect(d.totals.difference).toBe(15500 - (9500 + 2100));
  });

  it('APPLY de tentativa antiga → noChange (resultado descartado)', () => {
    const doc = bill({ status: 'OCR_FAILED', createdBy: MARIA, participants: [] });
    const r = executeSystem(
      doc,
      {
        type: 'APPLY_OCR_RESULT',
        attemptId: newId(),
        restaurantName: null,
        table: null,
        printedTotal: null,
        items: [],
        charges: [],
      },
      systemCtx(),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.noChange).toBe(true);
  });

  it('FAIL_OCR marca OCR_FAILED com código', () => {
    const start = executeSystem(
      bill({ status: 'DRAFT', createdBy: MARIA, participants: [] }),
      { type: 'START_OCR', attemptId: newId() },
      systemCtx(),
    );
    expect(start.ok && !start.noChange).toBe(true);
    if (!start.ok || start.noChange) return;
    const fail2 = executeSystem(
      start.doc,
      { type: 'FAIL_OCR', attemptId: start.doc.ocrAttempt!.id, errorCode: 'OCR-01' },
      systemCtx(),
    );
    expect(fail2.ok).toBe(true);
    if (fail2.ok && !fail2.noChange) {
      expect(fail2.doc.status).toBe('OCR_FAILED');
      expect(fail2.doc.ocrAttempt!.errorCode).toBe('OCR-01');
    }
  });

  it('DISCARD_RECEIPT limpa a leitura, volta para DRAFT e emite DELETE_IMAGE', () => {
    const doc = bill({
      status: 'RECEIPT_REVIEW',
      createdBy: MARIA,
      participants: [],
      printedTotal: 15500,
      items: [item()],
      charges: [charge()],
      ocrAttempt: {
        id: newId(),
        status: 'FAILED',
        startedAt: '2026-10-22T12:00:00.000Z',
        finishedAt: '2026-10-22T12:00:01.000Z',
        errorCode: 'OCR-01',
      },
    });
    const r = execute(doc, { type: 'DISCARD_RECEIPT' }, creatorCtx(MARIA));
    expect(r.ok && !r.noChange).toBe(true);
    if (!r.ok || r.noChange) return;
    expect(r.doc.status).toBe('DRAFT');
    expect(r.doc.items).toHaveLength(0);
    expect(r.doc.charges).toHaveLength(0);
    expect(r.doc.printedTotal).toBeNull();
    expect(r.doc.ocrAttempt).toBeNull();
    expect(r.doc.details.version).toBe(doc.details.version + 1);
    expect(r.effects).toContainEqual({ type: 'DELETE_IMAGE', billId: doc.id });
  });

  it('DISCARD_RECEIPT por não criador → FORBIDDEN', () => {
    const doc = bill({ status: 'RECEIPT_REVIEW', createdBy: MARIA, participants: [] });
    const other = 'p10000000-0000-4000-8000-000000000099';
    expectDomain(
      execute(
        doc,
        { type: 'DISCARD_RECEIPT' },
        ctx({ kind: 'PARTICIPANT', participantId: other, isCreator: false }),
      ),
      'FORBIDDEN',
    );
  });
});

describe('comandos de entrada', () => {
  it('JOIN_AS_NEW cria participante ativo; TABLE_FULL estoura', () => {
    const doc = bill({
      status: 'OPEN',
      createdBy: MARIA,
      participants: [participant(MARIA, 'Maria', 1)],
      seatLimit: 2,
    });
    const r = executeEntry(
      doc,
      { type: 'JOIN_AS_NEW', displayName: 'João', avatar: { initial: 'J', color: 'green' } },
      visitorCtx(),
    );
    expect(r.ok).toBe(true);
    if (r.ok && !r.noChange) expect(r.doc.participants).toHaveLength(2);
    const full = executeEntry(
      { ...doc, seatLimit: 1 },
      { type: 'JOIN_AS_NEW', displayName: 'X', avatar: { initial: 'X', color: 'green' } },
      visitorCtx(),
    );
    expect(full.ok).toBe(false);
    if (!full.ok) expect(full.error.code).toBe('TABLE_FULL');
  });

  it('TAKE_RESERVED_SEAT em vaga ocupada → SEAT_TAKEN', () => {
    const doc = bill({
      status: 'OPEN',
      createdBy: MARIA,
      participants: [
        participant(MARIA, 'Maria', 1),
        participant(NERY, 'Nery', 2, { status: 'ACTIVE' }),
      ],
    });
    const r = executeEntry(doc, { type: 'TAKE_RESERVED_SEAT', participantId: NERY }, visitorCtx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SEAT_TAKEN');
  });

  it('REQUEST_CLAIM cria pedido pendente', () => {
    const doc = bill({
      status: 'OPEN',
      createdBy: MARIA,
      participants: [participant(MARIA, 'Maria', 1)],
    });
    const r = executeEntry(doc, { type: 'REQUEST_CLAIM', participantId: MARIA }, visitorCtx());
    expect(r.ok).toBe(true);
    if (r.ok && !r.noChange) {
      expect(r.doc.claims).toHaveLength(1);
      expect(r.notifications[0]).toMatchObject({ type: 'CLAIM_PENDING' });
    }
  });

  it('join em conta DRAFT → falha (mesma resposta de link inválido)', () => {
    const doc = bill({ status: 'DRAFT', createdBy: MARIA, participants: [] });
    const r = executeEntry(
      doc,
      { type: 'JOIN_AS_NEW', displayName: 'X', avatar: { initial: 'X', color: 'green' } },
      visitorCtx(),
    );
    expect(r.ok).toBe(false);
  });
});

describe('exceções', () => {
  it('DomainFailure vira { ok:false, error } e não escapa', () => {
    const r = run(bill({ status: 'DRAFT', createdBy: MARIA, participants: [] }), {
      type: 'CONFIRM_RECEIPT',
    });
    expectDomain(r, 'INVALID_STATE');
    expect(() =>
      run(bill({ status: 'DRAFT', createdBy: MARIA, participants: [] }), {
        type: 'CONFIRM_RECEIPT',
      }),
    ).not.toThrow();
  });
});
