import { randomUUID } from 'node:crypto';
import type { Command, BillSnapshot } from '@cj/contracts';
import { problemMessages } from '@cj/contracts';
import {
  migrateDocument,
  execute,
  executeSystem,
  InvariantError,
  type ExecutionContext,
} from '@cj/core';
import type { Config } from '../config.js';
import { BusyError, notify, withCommandTx, withTx, type Db } from '../db.js';
import { HttpError, problemBody } from '../http/problem.js';
import type { StorageAdapter } from '../storage/types.js';
import { buildSnapshot, loadPresence, type BillRow } from './snapshot.js';

export interface CommandEnvelope {
  operationId: string;
  command: Command;
  expected?: ExecutionContext['expected'];
  acceptedReopens?: string[];
}

export type PipelineActor = { kind: 'PARTICIPANT'; participantId: string } | { kind: 'SYSTEM' };

export interface PipelineDeps {
  db: Db;
  config: Config;
  storage: StorageAdapter;
}

export interface PipelineResult {
  status: number;
  body: Record<string, unknown>;
}

async function snapshotIn(client: { query: Db['query'] }, row: BillRow): Promise<BillSnapshot> {
  const presence = await loadPresence(client, row.id);
  return buildSnapshot(row, presence) as unknown as BillSnapshot;
}

async function runPipeline(
  deps: PipelineDeps,
  billId: string,
  actor: PipelineActor,
  envelope: CommandEnvelope,
  ipHmac: Buffer | null,
): Promise<PipelineResult> {
  const { db } = deps;
  const out = await withCommandTx(db, async (c) => {
    const lock = await c.query<BillRow>('SELECT * FROM app.bills WHERE id = $1 FOR UPDATE', [
      billId,
    ]);
    const row = lock.rows[0];
    if (!row) return { kind: 'notfound' } as const;

    // idempotência depois do lock (§7.1 passo 8)
    const op = await c.query<{ http_status: number; result: Record<string, unknown> }>(
      'SELECT http_status, result FROM app.operations WHERE bill_id = $1 AND operation_id = $2',
      [billId, envelope.operationId],
    );
    if (op.rows[0]) {
      const snapshot = await snapshotIn(c, row);
      return {
        kind: 'stored',
        status: op.rows[0].http_status,
        body: { ...op.rows[0].result, revision: snapshot.revision, snapshot },
      } as const;
    }

    const doc = migrateDocument(row.document);
    const isCreator = actor.kind === 'PARTICIPANT' && doc.createdBy === actor.participantId;
    const ctx: ExecutionContext = {
      actor:
        actor.kind === 'SYSTEM'
          ? { kind: 'SYSTEM' }
          : { kind: 'PARTICIPANT', participantId: actor.participantId, isCreator },
      now: new Date().toISOString(),
      newId: () => randomUUID(),
      expected: envelope.expected,
      acceptedReopens: envelope.acceptedReopens,
    };

    const r =
      actor.kind === 'SYSTEM'
        ? executeSystem(doc, envelope.command, ctx)
        : execute(doc, envelope.command, ctx);

    if (!r.ok) {
      const snapshot = await snapshotIn(c, row);
      const stored = {
        code: r.error.code,
        message: r.error.message,
        details: r.error.details ?? null,
      };
      await c.query(
        'INSERT INTO app.operations (bill_id, operation_id, type, http_status, result) VALUES ($1,$2,$3,$4,$5)',
        [billId, envelope.operationId, envelope.command.type, r.error.http, stored],
      );
      return {
        kind: 'error',
        status: r.error.http,
        body: {
          ...problemBody(r.error.http, r.error.code, r.error.message),
          ...(r.error.details ? { details: r.error.details } : {}),
          serverState: snapshot,
        },
      } as const;
    }

    if (r.noChange) {
      const snapshot = await snapshotIn(c, row);
      const stored = { noChange: true, result: r.response ?? null };
      await c.query(
        'INSERT INTO app.operations (bill_id, operation_id, type, http_status, result) VALUES ($1,$2,$3,$4,$5)',
        [billId, envelope.operationId, envelope.command.type, 200, stored],
      );
      return {
        kind: 'ok',
        status: 200,
        body: { revision: snapshot.revision, snapshot, result: r.response ?? null },
      } as const;
    }

    const nextRevision = Number(row.revision) + 1;
    const next = r.doc;
    await c.query(
      `UPDATE app.bills SET document = $2, revision = $3, status = $4, updated_at = now(),
         receipt_confirmed_at = $5, closed_at = $6
       WHERE id = $1`,
      [
        billId,
        next,
        nextRevision,
        next.status,
        next.receiptConfirmedAt ? new Date(next.receiptConfirmedAt) : null,
        next.closedAt ? new Date(next.closedAt) : null,
      ],
    );

    // efeitos transacionais (§7.1 passo 12)
    let imageDeleted = false;
    let startOcrEffect: string | null = null;
    for (const effect of r.effects) {
      if (effect.type === 'START_OCR') {
        startOcrEffect = effect.attemptId;
      }
      if (effect.type === 'REVOKE_SESSIONS') {
        const reason =
          envelope.command.type === 'DECIDE_CLAIM'
            ? 'CLAIM'
            : effect.participantId === 'ALL'
              ? 'DELETION'
              : 'REMOVAL';
        if (effect.participantId === 'ALL') {
          await c.query(
            `UPDATE app.sessions SET revoked_at = now(), revocation_reason = $2
             WHERE bill_id = $1 AND revoked_at IS NULL`,
            [billId, reason],
          );
        } else {
          await c.query(
            `UPDATE app.sessions SET revoked_at = now(), revocation_reason = $3
             WHERE bill_id = $1 AND participant_id = $2 AND revoked_at IS NULL`,
            [billId, effect.participantId, reason],
          );
        }
        const revoked = await c.query<{ id: string }>(
          `SELECT id FROM app.sessions WHERE bill_id = $1 AND revoked_at > now() - interval '5 seconds'`,
          [billId],
        );
        for (const s of revoked.rows) await notify(c, 'session_revoked', `${billId}:${s.id}`);
      }
      if (effect.type === 'DELETE_IMAGE') {
        await c.query('UPDATE app.bills SET image_path = NULL WHERE id = $1', [billId]);
        imageDeleted = true;
      }
    }
    if (envelope.command.type === 'ROTATE_INVITE_LINK') {
      await c.query(
        'UPDATE app.bills SET join_token_version = join_token_version + 1 WHERE id = $1',
        [billId],
      );
    }

    const updatedRow: BillRow = {
      ...row,
      document: next,
      revision: nextRevision,
      status: next.status,
      image_path: imageDeleted ? null : row.image_path,
    };
    const snapshotFull = await snapshotIn(c, updatedRow);
    const { presence: _presence, ...snapshotNoPresence } = snapshotFull;

    const eventId = randomUUID();
    const billEvent = {
      eventId,
      revision: nextRevision,
      at: ctx.now,
      type: envelope.command.type,
      actorParticipantId: actor.kind === 'PARTICIPANT' ? actor.participantId : null,
      notifications: r.notifications,
      snapshot: snapshotNoPresence,
    };
    await c.query(
      'INSERT INTO app.events (bill_id, revision, event_id, payload) VALUES ($1,$2,$3,$4)',
      [billId, nextRevision, eventId, billEvent],
    );
    for (const a of r.audit) {
      await c.query(
        'INSERT INTO app.audit_log (bill_id, action, actor_participant_id, target, data, ip_hmac) VALUES ($1,$2,$3,$4,$5,$6)',
        [
          billId,
          a.action,
          actor.kind === 'PARTICIPANT' ? actor.participantId : null,
          a.target,
          a.data,
          ipHmac,
        ],
      );
    }
    const stored = { revision: nextRevision, result: r.response ?? null };
    await c.query(
      'INSERT INTO app.operations (bill_id, operation_id, type, http_status, result) VALUES ($1,$2,$3,$4,$5)',
      [billId, envelope.operationId, envelope.command.type, 200, stored],
    );
    await notify(c, 'bill_events', `${billId}:${nextRevision}`);

    return {
      kind: 'ok',
      status: 200,
      body: { revision: nextRevision, snapshot: snapshotFull, result: r.response ?? null },
      imageDeleted,
      ocr:
        startOcrEffect && !imageDeleted && row.image_path
          ? { attemptId: startOcrEffect, key: row.image_path }
          : null,
    } as const;
  });

  if (out.kind === 'notfound') throw new HttpError(404, 'NOT_FOUND', problemMessages.notFound);
  if (out.kind === 'error') return { status: out.status, body: out.body };
  if (out.kind === 'stored') return { status: out.status, body: out.body };

  // RETRY_OCR: o effect START_OCR dispara o OCR fora do caminho de resposta (§9.5)
  if (out.ocr) {
    const { runOcrBackground } = await import('./image.js');
    runOcrBackground(deps, billId, out.ocr.attemptId, out.ocr.key, ipHmac);
  }

  if (out.imageDeleted) void deleteImageFile(deps, billId).catch(() => {});
  return { status: out.status, body: out.body };
}

export async function runSessionCommand(
  deps: PipelineDeps,
  billId: string,
  participantId: string,
  envelope: CommandEnvelope,
  ipHmac: Buffer | null,
): Promise<PipelineResult> {
  return runPipeline(deps, billId, { kind: 'PARTICIPANT', participantId }, envelope, ipHmac);
}

export async function runSystemCommand(
  deps: PipelineDeps,
  billId: string,
  envelope: CommandEnvelope,
): Promise<PipelineResult> {
  return runPipeline(deps, billId, { kind: 'SYSTEM' }, envelope, null);
}

// ── DELETE_BILL (§7.5): transação própria, a linha deixa de existir ──────────

export async function runDeleteBill(
  deps: PipelineDeps,
  billId: string,
  participantId: string,
  envelope: CommandEnvelope,
  ipHmac: Buffer | null,
): Promise<PipelineResult> {
  const { db } = deps;
  let imagePath: string | null = null;
  let status = 200;
  let body: Record<string, unknown> = { deleteBill: true };

  await withTx(db, async (c) => {
    const lock = await c.query<BillRow>('SELECT * FROM app.bills WHERE id = $1 FOR UPDATE', [
      billId,
    ]);
    const row = lock.rows[0];
    if (!row) {
      status = 404;
      body = problemBody(404, 'NOT_FOUND', problemMessages.notFound);
      return;
    }
    imagePath = row.image_path;
    const doc = migrateDocument(row.document);
    const r = execute(doc, envelope.command, {
      actor: { kind: 'PARTICIPANT', participantId, isCreator: doc.createdBy === participantId },
      now: new Date().toISOString(),
      newId: () => randomUUID(),
    });
    if (!r.ok) {
      status = r.error.http;
      body = {
        ...problemBody(r.error.http, r.error.code, r.error.message),
        ...(r.error.details ? { details: r.error.details } : {}),
      };
      return;
    }

    await c.query('DELETE FROM app.audit_log WHERE bill_id = $1', [billId]);
    await c.query(
      `INSERT INTO app.audit_log (bill_id, action, actor_participant_id, target, data, ip_hmac)
       VALUES ($1, 'BILL_DELETED', $2, '{}'::jsonb, '{}'::jsonb, $3)`,
      [billId, participantId, ipHmac],
    );
    await c.query(
      `UPDATE app.sessions SET revoked_at = now(), revocation_reason = 'DELETION'
       WHERE bill_id = $1 AND revoked_at IS NULL`,
      [billId],
    );
    await notify(c, 'bill_deleted', billId);
    await c.query('DELETE FROM app.bills WHERE id = $1', [billId]);
  });

  if (status === 200 && imagePath) void deleteImageFile(deps, billId).catch(() => {});
  return { status, body };
}

// ── imagem ───────────────────────────────────────────────────────────────────

export async function deleteImageFile(deps: PipelineDeps, billId: string): Promise<void> {
  const { storage } = deps;
  const objects = await storage.list(`bills/${billId}`);
  for (const obj of objects) {
    await storage.remove(obj.key).catch(() => {});
  }
}

export function isBusy(e: unknown): boolean {
  return e instanceof BusyError;
}

export function isInvariant(e: unknown): boolean {
  return e instanceof InvariantError;
}
