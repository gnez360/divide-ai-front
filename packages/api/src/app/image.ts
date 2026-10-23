import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import type { ExtractedReceipt } from '@cj/ocr';
import { createExtractor } from '@cj/ocr';
import { problemMessages } from '@cj/contracts';
import {
  uuidv5,
  b64url,
  fromB64url,
  hmacSha256,
  timingSafeEqualStr,
  serializeCookie,
  sessionCookieName,
  randomToken,
  sha256,
} from '../util/crypto.js';
import type { Config } from '../config.js';
import type { Db } from '../db.js';
import { HttpError } from '../http/problem.js';
import type { StorageAdapter } from '../storage/types.js';
import { runSystemCommand, type CommandEnvelope, type PipelineDeps } from './pipeline.js';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const UPLOAD_TTL_MS = 5 * 60 * 1000;

interface UploadClaim {
  billId: string;
  contentType: string;
  objectKey: string;
  exp: number;
}

export function mintUploadUrl(
  config: Config,
  billId: string,
  contentType: string,
  objectKey: string,
): string {
  if (!ALLOWED_TYPES.has(contentType))
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', problemMessages.unsupportedMediaType);
  const claim: UploadClaim = { billId, contentType, objectKey, exp: Date.now() + UPLOAD_TTL_MS };
  const payload = b64url(Buffer.from(JSON.stringify(claim)));
  const mac = hmacSha256(config.auditKey, `upload:${payload}`).toString('base64url');
  return `/api/upload/${payload}.${mac}`;
}

export function parseUploadToken(config: Config, token: string): UploadClaim {
  const dot = token.lastIndexOf('.');
  if (dot === -1) throw new HttpError(404, 'NOT_FOUND', problemMessages.invalidUrl);
  const payload = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = hmacSha256(config.auditKey, `upload:${payload}`).toString('base64url');
  if (!timingSafeEqualStr(mac, expected))
    throw new HttpError(404, 'NOT_FOUND', problemMessages.invalidUrl);
  let claim: UploadClaim;
  try {
    claim = JSON.parse(fromB64url(payload).toString('utf8')) as UploadClaim;
  } catch {
    throw new HttpError(404, 'NOT_FOUND', problemMessages.invalidUrl);
  }
  if (claim.exp < Date.now()) throw new HttpError(404, 'NOT_FOUND', problemMessages.urlExpired);
  if (!ALLOWED_TYPES.has(claim.contentType))
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', problemMessages.unsupportedMediaType);
  if (!/^bills\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z]+$/.test(claim.objectKey)) {
    throw new HttpError(400, 'VALIDATION', problemMessages.invalidObjectKey);
  }
  return claim;
}

/** Detecção de tipo pela assinatura do arquivo (§10.2). */
export function sniffType(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'image/jpeg';
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = bytes.subarray(8, 12).toString('ascii');
    if (['heic', 'heix', 'hevc', 'heim', 'heis', 'hevx'].includes(brand)) return 'image/heic';
    if (['mif1', 'msf1'].includes(brand)) return 'image/heif';
  }
  return null;
}

export async function handleSignedPut(
  config: Config,
  storage: StorageAdapter,
  token: string,
  body: Buffer,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const claim = parseUploadToken(config, token);
  if (body.length > MAX_UPLOAD_BYTES)
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', problemMessages.imageTooLarge);
  const sniffed = sniffType(body);
  if (!sniffed)
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', problemMessages.unsupportedMediaType);
  if (sniffed !== claim.contentType)
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', problemMessages.typeMismatch);
  const target = claim.objectKey;
  await storage.put(target, body, claim.contentType);
  return { status: 200, body: { ok: true, objectKey: claim.objectKey } };
}

export async function objectExists(storage: StorageAdapter, objectKey: string): Promise<boolean> {
  return (await storage.head(objectKey)) !== null;
}

/** POST /image: valida objeto (§10.2), START_OCR (§9.5), 202, OCR em after(). */
export async function startOcrRoute(
  deps: PipelineDeps,
  billId: string,
  participantId: string,
  isCreator: boolean,
  operationId: string,
  objectKey: string | undefined,
  ipHmac: Buffer | null,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { db, storage } = deps;
  if (!isCreator) throw new HttpError(403, 'FORBIDDEN', problemMessages.onlyCreatorUploads);

  const row = await db.query<{ status: string; image_path: string | null }>(
    'SELECT status, image_path FROM app.bills WHERE id = $1',
    [billId],
  );
  const bill = row.rows[0];
  if (!bill) throw new HttpError(404, 'NOT_FOUND', problemMessages.notFound);
  if (bill.status !== 'DRAFT')
    throw new HttpError(422, 'INVALID_STATE', problemMessages.billNotDraft);

  const key = objectKey ?? (await latestObjectForBill(db, billId));
  if (!key || !(await objectExists(storage, key)))
    throw new HttpError(404, 'NOT_FOUND', problemMessages.objectNotUploaded);
  const bytes = await storage.get(key);
  if (bytes.length > MAX_UPLOAD_BYTES) {
    await storage.remove(key);
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', problemMessages.imageTooLarge);
  }
  const sniffed = sniffType(bytes);
  if (!sniffed || !ALLOWED_TYPES.has(sniffed)) {
    await storage.remove(key);
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', problemMessages.unsupportedMediaType);
  }

  const attemptId = randomUUID();
  const envelope: CommandEnvelope = {
    operationId,
    command: { type: 'START_OCR', attemptId },
  };
  // grava o objeto como imagem da conta na mesma transação do START_OCR
  const result = await withImageAttach(deps, billId, key, envelope);
  if (result.status === 202) void runOcrBackground(deps, billId, attemptId, key, ipHmac);
  return result;
}

async function withImageAttach(
  deps: PipelineDeps,
  billId: string,
  objectKey: string,
  envelope: CommandEnvelope,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { withCommandTx } = await import('../db.js');
  const out = await withCommandTx(deps.db, async (c) => {
    // o START_OCR precisa do lock da conta; gravar image_path junto
    const { executeSystem, migrateDocument } = await import('@cj/core');
    const { randomUUID: rid } = await import('node:crypto');
    const lock = await c.query<{ document: unknown; revision: string | number; status: string }>(
      'SELECT document, revision, status FROM app.bills WHERE id = $1 FOR UPDATE',
      [billId],
    );
    const row = lock.rows[0];
    if (!row) return { kind: 'notfound' } as const;

    const op = await c.query<{ http_status: number; result: Record<string, unknown> }>(
      'SELECT http_status, result FROM app.operations WHERE bill_id = $1 AND operation_id = $2',
      [billId, envelope.operationId],
    );
    if (op.rows[0]) {
      const snap = await snapOf(c, billId);
      return {
        kind: 'stored',
        status: op.rows[0].http_status,
        body: { ...op.rows[0].result, snapshot: snap },
      } as const;
    }

    const doc = migrateDocument(row.document);
    const r = executeSystem(doc, envelope.command, {
      actor: { kind: 'SYSTEM' },
      now: new Date().toISOString(),
      newId: () => rid(),
    });
    if (!r.ok) {
      const stored = { code: r.error.code, message: r.error.message };
      await c.query(
        'INSERT INTO app.operations (bill_id, operation_id, type, http_status, result) VALUES ($1,$2,$3,$4,$5)',
        [billId, envelope.operationId, 'START_OCR', r.error.http, stored],
      );
      return {
        kind: 'error',
        status: r.error.http,
        body: { code: r.error.code, message: r.error.message },
      } as const;
    }
    if (r.noChange) {
      const snap = await snapOf(c, billId);
      return {
        kind: 'ok',
        status: 200,
        body: { revision: snap?.revision ?? 0, snapshot: snap, noChange: true },
      } as const;
    }

    const nextRevision = Number(row.revision) + 1;
    // uma imagem por conta: remove a anterior
    const prev = await c.query<{ image_path: string | null }>(
      'SELECT image_path FROM app.bills WHERE id = $1',
      [billId],
    );
    const previousKey = prev.rows[0]?.image_path ?? null;
    await c.query(
      `UPDATE app.bills SET document = $2, revision = $3, status = $4, image_path = $5, updated_at = now() WHERE id = $1`,
      [billId, r.doc, nextRevision, r.doc.status, objectKey],
    );
    const snap = await snapOf(c, billId);
    const eventId = rid();
    const { presence: _p, ...snapNo } = snap!;
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
          type: 'START_OCR',
          actorParticipantId: null,
          notifications: [],
          snapshot: snapNo,
        },
      ],
    );
    await c.query(
      'INSERT INTO app.operations (bill_id, operation_id, type, http_status, result) VALUES ($1,$2,$3,$4,$5)',
      [
        billId,
        envelope.operationId,
        'START_OCR',
        202,
        {
          revision: nextRevision,
          attemptId: envelope.command.type === 'START_OCR' ? envelope.command.attemptId : null,
        },
      ],
    );
    const { notify } = await import('../db.js');
    await notify(c, 'bill_events', `${billId}:${nextRevision}`);
    return {
      kind: 'ok',
      status: 202,
      body: {
        revision: nextRevision,
        snapshot: snap,
        attemptId: envelope.command.type === 'START_OCR' ? envelope.command.attemptId : null,
      },
      previousKey,
    } as const;
  });

  if (out.kind === 'notfound') throw new HttpError(404, 'NOT_FOUND', problemMessages.notFound);
  if (out.kind === 'error')
    throw new HttpError(out.status, out.body.code as string, String(out.body.message ?? 'erro'));
  if (out.kind === 'stored') return { status: out.status, body: out.body };
  if ('previousKey' in out && out.previousKey && out.previousKey !== objectKey) {
    void deps.storage.remove(out.previousKey).catch(() => {});
  }
  return { status: out.status, body: out.body };
}

async function snapOf(c: { query: Db['query'] }, billId: string) {
  const { snapshotOf } = await import('./snapshot.js');
  return snapshotOf(c, billId);
}

async function latestObjectForBill(db: Db, billId: string): Promise<string | null> {
  const row = await db.query<{ image_path: string | null }>(
    'SELECT image_path FROM app.bills WHERE id = $1',
    [billId],
  );
  return row.rows[0]?.image_path ?? null;
}

// ── after(): OCR em background (§9.5) ────────────────────────────────────────

export function runOcrBackground(
  deps: PipelineDeps,
  billId: string,
  attemptId: string,
  objectKey: string,
  _ipHmac: Buffer | null,
): void {
  const job = new Promise<void>((resolve) => {
    setImmediate(() => {
      void runOcrJob(deps, billId, attemptId, objectKey).then(resolve, resolve);
    });
  });
  if (process.env.VERCEL) {
    // serverless: a resposta já saiu; waitUntil segura a instância até o fim do OCR (§16.3)
    void import('@vercel/functions').then(({ waitUntil }) => waitUntil(job)).catch(() => {});
  }
}

async function runOcrJob(
  deps: PipelineDeps,
  billId: string,
  attemptId: string,
  objectKey: string,
): Promise<void> {
  const controller = new AbortController();
  const budget = setTimeout(() => controller.abort(), 18_000);
  setTimeout(() => {
    void runSystemCommand(deps, billId, {
      operationId: uuidv5(`EXPIRE_OCR_ATTEMPT:${attemptId}`),
      command: { type: 'EXPIRE_OCR_ATTEMPT', attemptId },
    }).catch(() => {});
  }, 25_000);
  try {
    const bytes = await deps.storage.get(objectKey);
    const extractor = createExtractor(process.env.OCR_PROVIDER ?? 'fake');
    const started = Date.now();
    const result = await extractor.extract(new Uint8Array(bytes), { signal: controller.signal });
    if (!result.ok) {
      await runSystemCommand(deps, billId, {
        operationId: uuidv5(`FAIL_OCR:${attemptId}`),
        command: { type: 'FAIL_OCR', attemptId, errorCode: result.code },
      });
      return;
    }
    const payload = receiptToApplyPayload(attemptId, result.receipt);
    await runSystemCommand(deps, billId, {
      operationId: uuidv5(`APPLY_OCR_RESULT:${attemptId}`),
      command: { type: 'APPLY_OCR_RESULT', ...payload },
    });
    console.log(`[ocr] bill=${billId} providerMs=${Date.now() - started}`);
  } catch (e) {
    console.error('[ocr] falha', (e as Error).name);
    await runSystemCommand(deps, billId, {
      operationId: uuidv5(`FAIL_OCR:${attemptId}`),
      command: { type: 'FAIL_OCR', attemptId, errorCode: 'OCR-02' },
    }).catch(() => {});
  } finally {
    clearTimeout(budget);
  }
}

/** Conversão ExtractedReceipt → APPLY_OCR_RESULT (§9.1). */
export function receiptToApplyPayload(
  attemptId: string,
  receipt: ExtractedReceipt,
): {
  attemptId: string;
  restaurantName: string | null;
  table: string | null;
  printedTotal: number | null;
  items: {
    name: string;
    quantity: number;
    priceMode: 'UNIT_PRICE' | 'LINE_TOTAL';
    unitPrice: number | null;
    lineTotal: number;
  }[];
  charges: {
    description: string;
    kind: 'FEE' | 'DISCOUNT';
    amount: number;
    percentBp: number | null;
    reviewReason: 'OCR_AMOUNT_ONLY' | 'OCR_PERCENT_ONLY' | 'PERCENT_MISMATCH' | null;
  }[];
} {
  const items = receipt.items.map((it) => {
    const unitConsistent =
      it.unitPrice !== undefined && it.quantity * it.unitPrice === it.lineTotal;
    return {
      name: it.name,
      quantity: it.quantity,
      priceMode: (unitConsistent ? 'UNIT_PRICE' : 'LINE_TOTAL') as 'UNIT_PRICE' | 'LINE_TOTAL',
      unitPrice: unitConsistent ? (it.unitPrice as number) : null,
      lineTotal: it.lineTotal,
    };
  });
  const subtotal = receipt.subtotalRead ?? receipt.items.reduce((s, i) => s + i.lineTotal, 0);
  const charges = receipt.charges.map((ch) => {
    const expected =
      ch.percentBp !== undefined ? Math.round((subtotal * ch.percentBp) / 10_000) : undefined;
    const hasAmount = ch.amount !== undefined;
    const hasPercent = ch.percentBp !== undefined;
    const compatible =
      hasAmount && hasPercent && Math.abs((ch.amount as number) - (expected as number)) <= 5;
    const reviewReason = compatible
      ? null
      : hasAmount && hasPercent
        ? ('PERCENT_MISMATCH' as const)
        : hasAmount
          ? ('OCR_AMOUNT_ONLY' as const)
          : ('OCR_PERCENT_ONLY' as const);
    return {
      description: ch.description,
      kind: ch.kind,
      amount: hasAmount ? (ch.amount as number) : (expected ?? 0),
      percentBp: hasPercent ? (ch.percentBp as number) : null,
      reviewReason,
    };
  });
  return {
    attemptId,
    restaurantName: receipt.restaurantName ?? null,
    table: receipt.table ?? null,
    printedTotal: receipt.printedTotal ?? null,
    items,
    charges,
  };
}

export function imageContentType(bytes: Buffer): string {
  return sniffType(bytes) ?? 'application/octet-stream';
}

export function sessionCookieFor(billId: string, value: string): string {
  return serializeCookie(sessionCookieName(billId), value, { maxAge: 30 * 24 * 3600 });
}

export { randomToken, sha256 };
export type { Request };
