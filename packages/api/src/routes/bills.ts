import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { parseCommand, uuid, avatarSchema, problemMessages, type Command } from '@cj/contracts';
import type { AppDeps } from '../deps.js';
import { authorizeBill, actorOf } from '../app/session.js';
import {
  createBill,
  resolveJoin,
  joinBill,
  claimStatus,
  completeClaim,
  notFoundBody,
} from '../app/entry.js';
import { runSessionCommand, runDeleteBill, isBusy, type CommandEnvelope } from '../app/pipeline.js';
import {
  mintUploadUrl,
  startOcrRoute,
  imageContentType,
  handleSignedPut,
  objectExists,
} from '../app/image.js';
import { mintJoinToken } from '../app/join-token.js';
import { HttpError, sendProblem, zodDetails } from '../http/problem.js';
import { ipHmacOf, ipOf, rateLimit } from '../http/security.js';
import { expiredSessionCookie } from '../app/session.js';
import { serializeCookie, claimCookieName } from '../util/crypto.js';

const avatar = avatarSchema;

const createBody = z
  .object({
    operationId: uuid,
    displayName: z.string().min(1).max(40),
    avatar,
    restaurantName: z.string().max(120).nullish(),
    table: z.string().max(40).nullish(),
    seatLimit: z.number().int().min(1).max(20).optional(),
  })
  .strict();

const commandBody = z
  .object({
    operationId: uuid,
    command: z.unknown(),
    expected: z
      .object({
        version: z.number().int().optional(),
        consumptionVersion: z.number().int().optional(),
        shareAmount: z.number().int().optional(),
        difference: z.number().int().optional(),
        revision: z.number().int().optional(),
        versions: z.record(z.number().int()).optional(),
      })
      .strict()
      .optional(),
    acceptedReopens: z.array(uuid).optional(),
  })
  .strict();

const joinBody = z
  .object({
    operationId: uuid,
    joinToken: z.string().min(1).max(512),
    command: z.unknown(),
  })
  .strict();

function noStore(res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
}

export function apiRouter(deps: AppDeps): Router {
  const r = Router();
  const { db, config, hub } = deps;

  const wrap =
    (fn: (req: Request, res: Response) => Promise<void>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await fn(req, res);
      } catch (e) {
        next(e);
      }
    };

  // ── criação e leitura ──────────────────────────────────────────────────────

  r.post(
    '/bills',
    rateLimit(db, 'create', 10, 60),
    wrap(async (req, res) => {
      const body = createBody.parse(req.body);
      const out = await createBill(deps, {
        operationId: body.operationId,
        displayName: body.displayName,
        avatar: body.avatar,
        restaurantName: body.restaurantName ?? null,
        table: body.table ?? null,
        ...(body.seatLimit !== undefined ? { seatLimit: body.seatLimit } : {}),
      });
      noStore(res);
      res.setHeader('Set-Cookie', out.cookies);
      res.status(out.status).json(out.body);
    }),
  );

  r.get(
    '/bills/:billId',
    authorizeBill(db),
    wrap(async (req, res) => {
      const actor = actorOf(res);
      const { snapshotOf } = await import('../app/snapshot.js');
      const snapshot = await snapshotOf(db, actor.billId);
      if (!snapshot) {
        sendProblem(res, 404, 'NOT_FOUND', problemMessages.notFound);
        return;
      }
      noStore(res);
      res.json({
        me: {
          participantId: actor.participantId,
          isCreator: snapshot.document.createdBy === actor.participantId,
        },
        snapshot,
      });
    }),
  );

  // ── comandos (§7.1) ────────────────────────────────────────────────────────

  r.post(
    '/bills/:billId/commands',
    authorizeBill(db),
    rateLimit(db, 'cmd', 120, 60, (req, res) => String(res.locals.actor?.sessionId ?? ipOf(req))),
    wrap(async (req, res) => {
      const actor = actorOf(res);
      const raw = commandBody.parse(req.body);
      let command: Command;
      try {
        command = parseCommand(raw.command);
      } catch (e) {
        sendProblem(
          res,
          400,
          'VALIDATION',
          problemMessages.invalidBody,
          e instanceof z.ZodError ? zodDetails(e) : undefined,
        );
        return;
      }
      const envelope: CommandEnvelope = {
        operationId: raw.operationId,
        command,
        ...(raw.expected ? { expected: raw.expected } : {}),
        ...(raw.acceptedReopens ? { acceptedReopens: raw.acceptedReopens } : {}),
      };
      const ipHmac = ipHmacOf(config, req);

      let out;
      try {
        out =
          command.type === 'DELETE_BILL'
            ? await runDeleteBill(deps, actor.billId, actor.participantId, envelope, ipHmac)
            : await runSessionCommand(deps, actor.billId, actor.participantId, envelope, ipHmac);
      } catch (e) {
        if (isBusy(e)) {
          sendProblem(res, 503, 'BUSY', problemMessages.busy);
          return;
        }
        throw e;
      }

      noStore(res);
      if (command.type === 'DELETE_BILL' && out.status === 200) {
        res.setHeader('Set-Cookie', expiredSessionCookie(actor.billId));
        hub.sendDeleted(actor.billId);
      }
      res.status(out.status).json(out.body);
    }),
  );

  // ── imagem (§10) ───────────────────────────────────────────────────────────

  r.post(
    '/bills/:billId/image/upload-url',
    authorizeBill(db),
    rateLimit(db, 'uploadurl', 30, 60),
    wrap(async (req, res) => {
      const actor = actorOf(res);
      const body = z
        .object({
          operationId: uuid,
          contentType: z.string().min(1),
          objectKey: z.string().optional(),
        })
        .strict()
        .parse(req.body);
      const bill = await db.query<{
        status: string;
        created_by: string;
        image_path: string | null;
      }>('SELECT status, created_by, image_path FROM app.bills WHERE id = $1', [actor.billId]);
      const row = bill.rows[0];
      if (!row) throw new HttpError(404, 'NOT_FOUND', problemMessages.notFound);
      if (row.created_by !== actor.participantId)
        throw new HttpError(403, 'FORBIDDEN', problemMessages.onlyCreatorUploads);
      if (row.status !== 'DRAFT')
        throw new HttpError(422, 'INVALID_STATE', problemMessages.billNotDraft);
      const ext = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/heic': 'heic',
        'image/heif': 'heif',
      }[body.contentType];
      if (!ext) {
        sendProblem(res, 415, 'UNSUPPORTED_MEDIA_TYPE', problemMessages.unsupportedMediaType);
        return;
      }
      const objectKey = `bills/${actor.billId}/${crypto.randomUUID()}.${ext}`;
      const uploadUrl = mintUploadUrl(config, actor.billId, body.contentType, objectKey);
      noStore(res);
      res.json({
        uploadUrl,
        objectKey,
        contentType: body.contentType,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
    }),
  );

  // PUT com URL assinada — sem sessão (a assinatura autoriza)
  r.put(
    '/upload/:token',
    wrap(async (req, res) => {
      const chunks: Buffer[] = [];
      let total = 0;
      for await (const chunk of req as AsyncIterable<Buffer>) {
        total += chunk.length;
        if (total > 11 * 1024 * 1024)
          throw new HttpError(413, 'PAYLOAD_TOO_LARGE', problemMessages.imageTooLarge);
        chunks.push(chunk);
      }
      const out = await handleSignedPut(
        config,
        deps.storage,
        String(req.params.token),
        Buffer.concat(chunks),
      );
      noStore(res);
      res.status(out.status).json(out.body);
    }),
  );

  r.post(
    '/bills/:billId/image',
    authorizeBill(db),
    rateLimit(db, 'image', 20, 60),
    wrap(async (req, res) => {
      const actor = actorOf(res);
      const body = z
        .object({ operationId: uuid, objectKey: z.string().optional() })
        .strict()
        .parse(req.body);
      const bill = await db.query<{ created_by: string }>(
        'SELECT created_by FROM app.bills WHERE id = $1',
        [actor.billId],
      );
      const out = await startOcrRoute(
        deps,
        actor.billId,
        actor.participantId,
        bill.rows[0]?.created_by === actor.participantId,
        body.operationId,
        body.objectKey,
        ipHmacOf(config, req),
      );
      noStore(res);
      res.status(out.status).json(out.body);
    }),
  );

  r.get(
    '/bills/:billId/image',
    authorizeBill(db),
    wrap(async (req, res) => {
      const actor = actorOf(res);
      const row = await db.query<{ image_path: string | null }>(
        'SELECT image_path FROM app.bills WHERE id = $1',
        [actor.billId],
      );
      const key = row.rows[0]?.image_path;
      if (!key || !(await objectExists(deps.storage, key))) {
        sendProblem(res, 404, 'NOT_FOUND', problemMessages.notFoundBill);
        return;
      }
      const buf = await deps.storage.get(key);
      res.setHeader('Content-Type', imageContentType(buf));
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Content-Disposition', 'inline');
      res.end(buf);
    }),
  );

  // ── convite / sessão / edição ──────────────────────────────────────────────

  r.get(
    '/bills/:billId/invite',
    authorizeBill(db),
    wrap(async (req, res) => {
      const actor = actorOf(res);
      const row = await db.query<{ status: string; join_token_version: number }>(
        'SELECT status, join_token_version FROM app.bills WHERE id = $1',
        [actor.billId],
      );
      const bill = row.rows[0];
      if (!bill || bill.status !== 'OPEN') {
        sendProblem(res, 404, 'NOT_FOUND', problemMessages.notFound);
        return;
      }
      const token = mintJoinToken(config, actor.billId, bill.join_token_version);
      const origin = config.appOrigins[0] ?? 'http://localhost:5173';
      noStore(res);
      res.json({ url: `${origin}/entrar#t=${token}`, token });
    }),
  );

  r.post(
    '/bills/:billId/session/end',
    authorizeBill(db),
    wrap(async (req, res) => {
      const actor = actorOf(res);
      await db.query(
        'UPDATE app.sessions SET revoked_at = now(), revocation_reason = $2 WHERE id = $1',
        [actor.sessionId, 'SIGN_OUT'],
      );
      res.setHeader('Set-Cookie', expiredSessionCookie(actor.billId));
      noStore(res);
      res.status(204).end();
    }),
  );

  r.post(
    '/bills/:billId/editing',
    authorizeBill(db),
    wrap(async (req, res) => {
      const actor = actorOf(res);
      const body = z.object({ itemId: uuid.nullable() }).strict().parse(req.body);
      hub.setEditing(actor.billId, actor.participantId, body.itemId);
      noStore(res);
      res.status(204).end();
    }),
  );

  // ── SSE (§8) ───────────────────────────────────────────────────────────────

  r.get('/bills/:billId/events', authorizeBill(db), (req, res) => {
    const actor = actorOf(res);
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const stream = {
      id: crypto.randomUUID(),
      res,
      billId: actor.billId,
      sessionId: actor.sessionId,
      participantId: actor.participantId,
      lastPing: Date.now(),
    };
    hub.register(stream);
    req.on('close', () => {
      hub.end(stream);
    });
  });

  // ── entrada de participantes ───────────────────────────────────────────────

  r.post(
    '/join/resolve',
    rateLimit(db, 'resolve', 60, 60),
    wrap(async (req, res) => {
      const body = z
        .object({ joinToken: z.string().min(1).max(512) })
        .strict()
        .parse(req.body);
      try {
        const preview = await resolveJoin(deps, body.joinToken, req);
        noStore(res);
        res.json(preview);
      } catch (e) {
        if (e instanceof HttpError && e.status === 404) {
          res.status(404);
          res.setHeader('Content-Type', 'application/problem+json; charset=utf-8');
          noStore(res);
          res.json(notFoundBody());
          return;
        }
        throw e;
      }
    }),
  );

  r.post(
    '/join',
    rateLimit(db, 'join', 30, 60),
    wrap(async (req, res) => {
      const body = joinBody.parse(req.body);
      const { parseEntryCommand } = await import('@cj/contracts');
      let command;
      try {
        command = parseEntryCommand(body.command);
      } catch (e) {
        sendProblem(
          res,
          400,
          'VALIDATION',
          problemMessages.invalidBody,
          e instanceof z.ZodError ? zodDetails(e) : undefined,
        );
        return;
      }
      const out = await joinBill(deps, {
        operationId: body.operationId,
        joinToken: body.joinToken,
        command,
      });
      noStore(res);
      if (out.cookies.length) res.setHeader('Set-Cookie', out.cookies);
      res.status(out.status).json(out.body);
    }),
  );

  r.get(
    '/claims/:id',
    rateLimit(db, 'claimpoll', 60, 60),
    wrap(async (req, res) => {
      const claimId = String(req.params.id);
      const secret = claimCookie(req);
      if (!secret) {
        res.status(404).json(notFoundBody());
        return;
      }
      const out = await claimStatus(deps, claimId, secret);
      noStore(res);
      res.status(out.status).json(out.body);
    }),
  );

  r.post(
    '/claims/:id/complete',
    wrap(async (req, res) => {
      const claimId = String(req.params.id);
      const secret = claimCookie(req);
      if (!secret) {
        res.status(404).json(notFoundBody());
        return;
      }
      const out = await completeClaim(deps, claimId, secret);
      noStore(res);
      if (out.cookies.length) {
        const cookies = [...out.cookies, claimCookieClear(claimId)];
        res.setHeader('Set-Cookie', cookies);
      }
      res.status(out.status).json(out.body);
    }),
  );

  return r;
}

function claimCookie(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name.startsWith('__Host-cjc_')) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

function claimCookieClear(claimId: string): string {
  return serializeCookie(claimCookieName(claimId), '', { maxAge: 0 });
}
