import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import type { BillDocument, EntryCommand, JoinPreview, Avatar } from '@cj/contracts';
import { problemMessages } from '@cj/contracts';
import { executeEntry, migrateDocument, derive } from '@cj/core';
import type { Config } from '../config.js';
import { notify, withCommandTx, type Db } from '../db.js';
import { HttpError, problemBody } from '../http/problem.js';
import { randomToken, sha256, serializeCookie, claimCookieName } from '../util/crypto.js';
import { billIdFromToken, verifyJoinToken } from './join-token.js';
import { buildSnapshot, loadPresence, type BillRow } from './snapshot.js';
import { resolveSession } from './session.js';

export interface EntryDeps {
  db: Db;
  config: Config;
}

const SAME_BODY_404 = problemBody(404, 'NOT_FOUND', problemMessages.invalidLink);

export function notFoundBody(): Record<string, unknown> {
  return SAME_BODY_404;
}

// ── POST /api/bills (§7.4) ───────────────────────────────────────────────────

export interface CreateBillInput {
  operationId: string;
  displayName: string;
  avatar: Avatar;
  restaurantName?: string | null;
  table?: string | null;
  seatLimit?: number;
}

export async function createBill(
  deps: EntryDeps,
  input: CreateBillInput,
): Promise<{ status: number; body: Record<string, unknown>; cookies: string[] }> {
  const { db } = deps;
  return withCommandTx(db, async (c) => {
    // concorrência na criação: advisory lock por operationId (§7.4)
    const lockKey = lockKeyFor(input.operationId);
    await c.query('SELECT pg_advisory_xact_lock($1::bigint)', [String(lockKey)]);

    const stored = await c.query<{
      http_status: number;
      result: Record<string, unknown>;
      bill_id: string | null;
      participant_id: string | null;
    }>(
      'SELECT http_status, result, bill_id, participant_id FROM app.entry_operations WHERE operation_id = $1',
      [input.operationId],
    );
    if (stored.rows[0]) {
      const s = stored.rows[0];
      const cookie = await sessionForExisting(
        deps,
        c,
        s.bill_id,
        (s.result as { participantId?: string }).participantId ?? s.participant_id ?? null,
        s.participant_id ?? null,
      );
      const snapshot = s.bill_id ? await snapshotTx(c, s.bill_id) : null;
      return {
        status: s.http_status,
        body: { ...(s.result as object), ...(snapshot ? { snapshot } : {}) },
        cookies: cookie ? [cookie] : [],
      };
    }

    const billId = randomUUID();
    const participantId = randomUUID();
    const now = new Date().toISOString();
    const doc: BillDocument = {
      schemaVersion: 1,
      id: billId,
      status: 'DRAFT',
      createdBy: participantId,
      details: {
        ...(input.restaurantName ? { restaurantName: input.restaurantName } : {}),
        ...(input.table ? { table: input.table } : {}),
        version: 1,
      },
      printedTotal: null,
      seatLimit: input.seatLimit ?? 6,
      ocrAttempt: null,
      items: [],
      charges: [],
      participants: [
        {
          id: participantId,
          displayName: input.displayName,
          avatar: input.avatar,
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
          joinOrder: 1,
          anonymized: false,
          version: 1,
        },
      ],
      claims: [],
      receiptConfirmedAt: null,
      closedAt: null,
      createdAt: now,
    };

    await c.query(
      `INSERT INTO app.bills (id, status, revision, schema_version, document, created_by)
       VALUES ($1, 'DRAFT', 0, 1, $2, $3)`,
      [billId, doc, participantId],
    );
    const session = await createSessionTx(c, billId, participantId);
    const result = { billId, participantId, me: { participantId, isCreator: true } };
    await c.query(
      'INSERT INTO app.entry_operations (operation_id, type, bill_id, participant_id, http_status, result) VALUES ($1, $2, $3, $4, $5, $6)',
      [input.operationId, 'CREATE_BILL', billId, participantId, 201, result],
    );
    const snapshot = await snapshotTx(c, billId);
    return { status: 201, body: { ...result, snapshot }, cookies: [session.cookie] };
  });
}

// ── POST /api/join/resolve ───────────────────────────────────────────────────

export async function resolveJoin(
  deps: EntryDeps,
  joinToken: string,
  req: Request,
): Promise<JoinPreview> {
  const { db, config } = deps;
  const billId = billIdFromToken(joinToken);
  if (!billId) throw new HttpError(404, 'NOT_FOUND', problemMessages.invalidLink);
  const r = await db.query<BillRow>('SELECT * FROM app.bills WHERE id = $1', [billId]);
  const row = r.rows[0];
  if (!row) throw new HttpError(404, 'NOT_FOUND', problemMessages.invalidLink);
  if (!verifyJoinToken(config, joinToken, billId, row.join_token_version)) {
    throw new HttpError(404, 'NOT_FOUND', problemMessages.invalidLink);
  }
  const status = row.status as BillDocument['status'];
  if (status !== 'OPEN' && status !== 'CLOSED')
    throw new HttpError(404, 'NOT_FOUND', problemMessages.invalidLink);

  const doc = migrateDocument(row.document);
  const hasSession = (await resolveSession(db, billId, req)) !== null;
  const derived = derive(doc);
  const preview: JoinPreview = {
    billId,
    status: doc.status,
    ...(doc.details.restaurantName ? { restaurantName: doc.details.restaurantName } : {}),
    ...(doc.details.table ? { table: doc.details.table } : {}),
    seats: { taken: doc.participants.filter((p) => !p.anonymized).length, limit: doc.seatLimit },
    participants: doc.participants.map((p) => ({
      id: p.id,
      displayName: p.anonymized ? 'Pessoa' : p.displayName,
      avatar: p.avatar,
      status: p.status,
      ...(p.preRegisteredBy ? { preRegisteredBy: p.preRegisteredBy } : {}),
    })),
    hasSession,
    ...(doc.status === 'CLOSED'
      ? { summary: { totals: derived.totals, shares: derived.shares, closedAt: doc.closedAt } }
      : {}),
  };
  return preview;
}

// ── POST /api/join (§7.4) ────────────────────────────────────────────────────

export interface JoinInput {
  operationId: string;
  joinToken: string;
  command: EntryCommand;
}

export async function joinBill(
  deps: EntryDeps,
  input: JoinInput,
): Promise<{ status: number; body: Record<string, unknown>; cookies: string[] }> {
  const { db, config } = deps;
  const billId = billIdFromToken(input.joinToken);
  if (!billId) return { status: 404, body: SAME_BODY_404, cookies: [] };

  return withCommandTx(db, async (c) => {
    const lockKey = lockKeyFor(input.operationId);
    await c.query('SELECT pg_advisory_xact_lock($1::bigint)', [String(lockKey)]);

    const stored = await c.query<{
      http_status: number;
      result: Record<string, unknown>;
      participant_id: string | null;
    }>(
      'SELECT http_status, result, participant_id FROM app.entry_operations WHERE operation_id = $1',
      [input.operationId],
    );
    if (stored.rows[0]) {
      const s = stored.rows[0];
      if (s.participant_id && s.http_status === 201) {
        const session = await createSessionTx(c, billId, s.participant_id);
        const snapshot = await snapshotTx(c, billId);
        return {
          status: 201,
          body: {
            ...(s.result as object),
            me: { participantId: s.participant_id, isCreator: false },
            snapshot,
          },
          cookies: [session.cookie],
        };
      }
      return { status: s.http_status, body: s.result, cookies: [] };
    }

    const lock = await c.query<BillRow>('SELECT * FROM app.bills WHERE id = $1 FOR UPDATE', [
      billId,
    ]);
    const row = lock.rows[0];
    if (!row || !verifyJoinToken(config, input.joinToken, billId, row.join_token_version)) {
      return { status: 404, body: SAME_BODY_404, cookies: [] };
    }

    const status = row.status as BillDocument['status'];
    const needStatus = input.command.type === 'REQUEST_CLAIM' ? ['OPEN', 'CLOSED'] : ['OPEN'];
    if (!needStatus.includes(status)) return { status: 404, body: SAME_BODY_404, cookies: [] };

    const doc = migrateDocument(row.document);
    const r = executeEntry(doc, input.command, {
      actor: { kind: 'VISITOR' },
      now: new Date().toISOString(),
      newId: () => randomUUID(),
    });

    if (!r.ok) {
      // mesmas respostas de link inválido (404) fora de estado válido; conflitos reais seguem o domínio
      if (r.error.code === 'INVALID_STATE')
        return { status: 404, body: SAME_BODY_404, cookies: [] };
      const body = {
        ...problemBody(r.error.http, r.error.code, r.error.message),
        ...(r.error.details ? { details: r.error.details } : {}),
      };
      await c.query(
        'INSERT INTO app.entry_operations (operation_id, type, bill_id, participant_id, http_status, result) VALUES ($1, $2, $3, $4, $5, $6)',
        [input.operationId, input.command.type, billId, null, r.error.http, body],
      );
      return { status: r.error.http, body, cookies: [] };
    }

    if (r.noChange) {
      const snapshot = await snapshotTx(c, billId);
      return { status: 200, body: { snapshot }, cookies: [] };
    }

    const next = r.doc;
    const nextRevision = Number(row.revision) + 1;
    await c.query(
      `UPDATE app.bills SET document = $2, revision = $3, status = $4, updated_at = now() WHERE id = $1`,
      [billId, next, nextRevision, next.status],
    );

    const participantId =
      input.command.type === 'TAKE_RESERVED_SEAT'
        ? input.command.participantId
        : input.command.type === 'JOIN_AS_NEW'
          ? (next.participants.find((p) => !doc.participants.some((o) => o.id === p.id))?.id ??
            null)
          : null;

    // evento (§8)
    const presence = await loadPresence(c, billId);
    const snap = buildSnapshot({ ...row, document: next, revision: nextRevision }, presence);
    const { presence: _p, ...snapNoPresence } = snap;
    const eventId = randomUUID();
    await c.query(
      'INSERT INTO app.events (bill_id, revision, event_id, payload) VALUES ($1,$2,$3,$4)',
      [
        billId,
        nextRevision,
        eventId,
        {
          eventId,
          revision: nextRevision,
          at: new Date().toISOString(),
          type: input.command.type,
          actorParticipantId: participantId,
          notifications: r.notifications,
          snapshot: snapNoPresence,
        },
      ],
    );
    for (const a of r.audit) {
      await c.query(
        'INSERT INTO app.audit_log (bill_id, action, actor_participant_id, target, data) VALUES ($1,$2,$3,$4)',
        [billId, a.action, participantId, a.target],
      );
    }
    await notify(c, 'bill_events', `${billId}:${nextRevision}`);

    const cmd = input.command;
    if (cmd.type === 'REQUEST_CLAIM') {
      const created = next.claims.find(
        (cl) => cl.status === 'PENDING' && cl.targetParticipantId === cmd.participantId,
      );
      if (!created) throw new HttpError(500, 'INTERNAL', problemMessages.notCreated);
      const secret = randomToken(32);
      await c.query(
        "INSERT INTO app.claim_secrets (claim_id, bill_id, secret_hash, expires_at) VALUES ($1,$2,$3, now() + interval '10 minutes')",
        [created.id, billId, sha256(secret)],
      );
      const result = { claimId: created.id };
      await c.query(
        'INSERT INTO app.entry_operations (operation_id, type, bill_id, participant_id, http_status, result) VALUES ($1,$2,$3,$4,$5,$6)',
        [input.operationId, 'REQUEST_CLAIM', billId, cmd.participantId, 202, result],
      );
      return {
        status: 202,
        body: { ...result, revision: nextRevision, snapshot: snap },
        cookies: [serializeCookie(claimCookieName(created.id), secret, { maxAge: 600 })],
      };
    }

    if (!participantId)
      throw new HttpError(500, 'INTERNAL', problemMessages.participantUnidentified);
    const session = await createSessionTx(c, billId, participantId);
    const result = {
      me: { participantId, isCreator: false },
      participantId,
    };
    await c.query(
      'INSERT INTO app.entry_operations (operation_id, type, bill_id, participant_id, http_status, result) VALUES ($1,$2,$3,$4,$5,$6)',
      [input.operationId, input.command.type, billId, participantId, 201, result],
    );
    return {
      status: 201,
      body: { ...result, revision: nextRevision, snapshot: snap },
      cookies: [session.cookie],
    };
  });
}

// ── claims (§11.3) ───────────────────────────────────────────────────────────

export async function claimStatus(
  deps: EntryDeps,
  claimId: string,
  secretValue: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { db } = deps;
  const r = await db.query<{
    bill_id: string;
    secret_hash: Buffer;
    expires_at: Date;
    consumed_at: Date | null;
  }>(
    'SELECT bill_id, secret_hash, expires_at, consumed_at FROM app.claim_secrets WHERE claim_id = $1',
    [claimId],
  );
  const row = r.rows[0];
  if (!row || sha256(secretValue).toString('hex') !== row.secret_hash.toString('hex')) {
    return { status: 404, body: SAME_BODY_404 };
  }
  const bill = await db.query<BillRow>('SELECT * FROM app.bills WHERE id = $1', [row.bill_id]);
  const doc = bill.rows[0] ? migrateDocument(bill.rows[0].document) : null;
  const claim = doc?.claims.find((cl) => cl.id === claimId);
  if (!claim) return { status: 404, body: SAME_BODY_404 };
  const expired = row.expires_at.getTime() < Date.now() || claim.status === 'EXPIRED';
  return {
    status: 200,
    body: { status: expired && claim.status === 'PENDING' ? 'EXPIRED' : claim.status },
  };
}

export async function completeClaim(
  deps: EntryDeps,
  claimId: string,
  secretValue: string,
): Promise<{ status: number; body: Record<string, unknown>; cookies: string[] }> {
  const { db } = deps;
  const r = await db.query<{
    bill_id: string;
    secret_hash: Buffer;
    expires_at: Date;
    consumed_at: Date | null;
  }>(
    'SELECT bill_id, secret_hash, expires_at, consumed_at FROM app.claim_secrets WHERE claim_id = $1 FOR UPDATE',
    [claimId],
  );
  const row = r.rows[0];
  if (!row || sha256(secretValue).toString('hex') !== row.secret_hash.toString('hex')) {
    return { status: 404, body: SAME_BODY_404, cookies: [] };
  }
  return withCommandTx(db, async (c) => {
    const lock = await c.query<BillRow>('SELECT * FROM app.bills WHERE id = $1 FOR UPDATE', [
      row.bill_id,
    ]);
    const billRow = lock.rows[0];
    if (!billRow) return { status: 404, body: SAME_BODY_404, cookies: [] };
    const doc = migrateDocument(billRow.document);
    const claim = doc.claims.find((cl) => cl.id === claimId);
    if (!claim || claim.status !== 'APPROVED') {
      return {
        status: 409,
        body: problemBody(409, 'INVALID_STATE', problemMessages.claimNotApproved(claim?.status)),
        cookies: [],
      };
    }
    const secret = await c.query<{ expires_at: Date; consumed_at: Date | null }>(
      'SELECT expires_at, consumed_at FROM app.claim_secrets WHERE claim_id = $1',
      [claimId],
    );
    if (
      !secret.rows[0] ||
      secret.rows[0].consumed_at ||
      secret.rows[0].expires_at.getTime() < Date.now()
    ) {
      return {
        status: 409,
        body: problemBody(409, 'INVALID_STATE', problemMessages.operationExpired),
        cookies: [],
      };
    }
    const session = await createSessionTx(c, row.bill_id, claim.targetParticipantId);
    await c.query('UPDATE app.claim_secrets SET consumed_at = now() WHERE claim_id = $1', [
      claimId,
    ]);
    const snapshot = await snapshotTx(c, row.bill_id);
    return {
      status: 201,
      body: {
        me: {
          participantId: claim.targetParticipantId,
          isCreator: doc.createdBy === claim.targetParticipantId,
        },
        snapshot,
      },
      cookies: [session.cookie],
    };
  });
}

// ── helpers ──────────────────────────────────────────────────────────────────

function lockKeyFor(operationId: string): bigint {
  return BigInt.asIntN(64, sha256(operationId).readBigInt64BE(0));
}

async function createSessionTx(
  c: { query: Db['query'] },
  billId: string,
  participantId: string,
): Promise<{ cookie: string }> {
  const value = randomToken(32);
  const sessionId = randomUUID();
  await c.query(
    `INSERT INTO app.sessions (id, token_hash, bill_id, participant_id, expires_at)
     VALUES ($1, $2, $3, $4, now() + interval '30 days')`,
    [sessionId, sha256(value), billId, participantId],
  );
  return {
    cookie: serializeCookie(`__Host-cj_${billId.replace(/-/g, '')}`, value, {
      maxAge: 30 * 24 * 3600,
    }),
  };
}

async function sessionForExisting(
  deps: EntryDeps,
  c: { query: Db['query'] },
  billId: string | null,
  participantId: string | null,
  fallback: string | null,
): Promise<string | null> {
  const pid = participantId ?? fallback;
  if (!billId || !pid) return null;
  return (await createSessionTx(c, billId, pid)).cookie;
}

async function snapshotTx(c: { query: Db['query'] }, billId: string): Promise<unknown> {
  const r = await c.query<BillRow>('SELECT * FROM app.bills WHERE id = $1', [billId]);
  if (!r.rows[0]) return null;
  const presence = await loadPresence(c, billId);
  return buildSnapshot(r.rows[0], presence);
}
