import { Router, type Request, type Response, type NextFunction } from 'express';
import { problemMessages } from '@cj/contracts';
import { migrateDocument } from '@cj/core';
import { uuidv5 } from '../util/crypto.js';
import type { AppDeps } from '../deps.js';
import { sendProblem } from '../http/problem.js';
import { runSystemCommand, type CommandEnvelope } from '../app/pipeline.js';

const JOBS = new Set([
  'ocr-sweep',
  'expire-claims',
  'purge-images',
  'sweep-orphan-images',
  'purge-sessions',
  'purge-operations',
  'purge-events',
  'purge-presence',
  'purge-audit-log',
  'product-metrics',
]);

export function cronRouter(deps: AppDeps): Router {
  const r = Router();

  r.post('/cron/:job', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = String(req.params.job);
      const auth = req.headers.authorization ?? '';
      const valid = auth === `Bearer ${deps.config.cronSecret}`;
      if (!valid || !JOBS.has(job)) {
        sendProblem(res, 404, 'NOT_FOUND', problemMessages.notFound);
        return;
      }
      const out = await runJob(deps, job);
      res.json(out);
    } catch (e) {
      next(e);
    }
  });

  return r;
}

async function runJob(deps: AppDeps, job: string): Promise<Record<string, unknown>> {
  const { db } = deps;
  switch (job) {
    case 'ocr-sweep': {
      const rows = await db.query<{ id: string; document: unknown }>(
        `SELECT id, document FROM app.bills
         WHERE status = 'OCR_PROCESSING'
           AND (document->'ocrAttempt'->>'status') = 'PROCESSING'
           AND ((document->'ocrAttempt'->>'startedAt')::timestamptz < now() - interval '2 minutes')`,
      );
      let expired = 0;
      for (const row of rows.rows) {
        const doc = migrateDocument(row.document);
        const attemptId = doc.ocrAttempt?.id;
        if (!attemptId) continue;
        const envelope: CommandEnvelope = {
          operationId: uuidv5(`EXPIRE_OCR_ATTEMPT:${attemptId}`),
          command: { type: 'EXPIRE_OCR_ATTEMPT', attemptId },
        };
        const out = await runSystemCommand(deps, row.id, envelope);
        if (out.status === 200 && !(out.body as { noChange?: boolean }).noChange) expired++;
      }
      return { job, expired };
    }

    case 'expire-claims': {
      const rows = await db.query<{ id: string; document: unknown }>(
        `SELECT id, document FROM app.bills WHERE document->'claims' @> '[{"status":"PENDING"}]'::jsonb`,
      );
      let expired = 0;
      for (const row of rows.rows) {
        const doc = migrateDocument(row.document);
        for (const claim of doc.claims.filter((c) => c.status === 'PENDING')) {
          const ageMs = Date.now() - new Date(claim.requestedAt).getTime();
          if (ageMs < 10 * 60 * 1000) continue;
          const envelope: CommandEnvelope = {
            operationId: uuidv5(`EXPIRE_CLAIM:${claim.id}`),
            command: { type: 'EXPIRE_CLAIM', claimId: claim.id },
          };
          const out = await runSystemCommand(deps, row.id, envelope);
          if (out.status === 200 && !(out.body as { noChange?: boolean }).noChange) expired++;
        }
      }
      return { job, expired };
    }

    case 'purge-images': {
      const rows = await db.query<{ id: string; image_path: string }>(
        `SELECT id, image_path FROM app.bills
         WHERE image_path IS NOT NULL AND closed_at < now() - interval '48 hours'`,
      );
      let purged = 0;
      for (const row of rows.rows) {
        await deps.storage.remove(row.image_path);
        await db.query('UPDATE app.bills SET image_path = NULL WHERE id = $1', [row.id]);
        purged++;
      }
      return { job, purged };
    }

    case 'sweep-orphan-images': {
      let removed = 0;
      const objects = await deps.storage.list('bills');
      for (const obj of objects) {
        const billId = obj.key.split('/')[1] ?? '';
        const bill = await db.query<{ image_path: string | null }>(
          'SELECT image_path FROM app.bills WHERE id = $1',
          [billId],
        );
        const referenced = bill.rows[0]?.image_path ?? null;
        const orphan =
          Date.now() - obj.lastModified.getTime() > 3_600_000 && obj.key !== referenced;
        if (orphan) {
          await deps.storage.remove(obj.key).catch(() => {});
          removed++;
        }
      }
      return { job, removed };
    }

    case 'purge-sessions': {
      const marked = await db.query(
        `UPDATE app.sessions SET revoked_at = now(), revocation_reason = 'EXPIRATION'
         WHERE revoked_at IS NULL AND expires_at < now()`,
      );
      const deleted = await db.query(
        `DELETE FROM app.sessions WHERE (revoked_at IS NOT NULL AND revoked_at < now() - interval '7 days')
          OR (expires_at < now() - interval '7 days')`,
      );
      return { job, marked: marked.rowCount ?? 0, deleted: deleted.rowCount ?? 0 };
    }

    case 'purge-operations': {
      const a = await db.query(
        `DELETE FROM app.operations WHERE ctid IN (SELECT ctid FROM app.operations WHERE created_at < now() - interval '24 hours' LIMIT 5000)`,
      );
      const b = await db.query(
        `DELETE FROM app.entry_operations WHERE ctid IN (SELECT ctid FROM app.entry_operations WHERE created_at < now() - interval '24 hours' LIMIT 5000)`,
      );
      return { job, deleted: (a.rowCount ?? 0) + (b.rowCount ?? 0) };
    }

    case 'purge-events': {
      const a = await db.query(
        `DELETE FROM app.events WHERE ctid IN (SELECT ctid FROM app.events WHERE created_at < now() - interval '5 minutes' LIMIT 5000)`,
      );
      return { job, deleted: a.rowCount ?? 0 };
    }

    case 'purge-presence': {
      const a = await db.query(
        `DELETE FROM app.presence WHERE last_seen_at < now() - interval '10 minutes'`,
      );
      return { job, deleted: a.rowCount ?? 0 };
    }

    case 'purge-audit-log': {
      const a = await db.query(
        `DELETE FROM app.audit_log WHERE created_at < now() - interval '90 days'`,
      );
      return { job, deleted: a.rowCount ?? 0 };
    }

    case 'product-metrics': {
      const bills = await db.query<{ status: string; n: string }>(
        `SELECT status, count(*)::text AS n FROM app.bills GROUP BY status`,
      );
      const sessions = await db.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM app.sessions WHERE revoked_at IS NULL AND expires_at > now()`,
      );
      return {
        job,
        bills: Object.fromEntries(bills.rows.map((r) => [r.status, Number(r.n)])),
        activeSessions: Number(sessions.rows[0]?.n ?? 0),
        streams: deps.hub.streamCount(),
      };
    }

    default:
      return { job, ok: false };
  }
}
