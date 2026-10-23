import type { Request, RequestHandler, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { problemMessages } from '@cj/contracts';
import type { Db } from '../db.js';
import { HttpError, sendProblem } from '../http/problem.js';
import {
  parseCookies,
  randomToken,
  serializeCookie,
  sessionCookieName,
  sha256,
} from '../util/crypto.js';

const SESSION_TTL_SEC = 30 * 24 * 3600;

export interface SessionRow {
  id: string;
  bill_id: string;
  participant_id: string;
  expires_at: Date;
  revoked_at: Date | null;
}

export interface CreatedSession {
  sessionId: string;
  cookie: string;
}

export async function createSession(
  db: Db,
  billId: string,
  participantId: string,
): Promise<CreatedSession> {
  const value = randomToken(32);
  const sessionId = randomUUID();
  await db.query(
    `INSERT INTO app.sessions (id, token_hash, bill_id, participant_id, expires_at)
     VALUES ($1, $2, $3, $4, now() + interval '30 days')`,
    [sessionId, sha256(value), billId, participantId],
  );
  return {
    sessionId,
    cookie: serializeCookie(sessionCookieName(billId), value, { maxAge: SESSION_TTL_SEC }),
  };
}

export function expiredSessionCookie(billId: string): string {
  return serializeCookie(sessionCookieName(billId), '', { maxAge: 0 });
}

export interface ResolvedSession {
  session: SessionRow;
  renewedCookie?: string;
}

export async function resolveSession(
  db: Db,
  billId: string,
  req: Request,
): Promise<ResolvedSession | null> {
  const cookies = parseCookies(req.headers.cookie);
  const value = cookies[sessionCookieName(billId)];
  if (!value) return null;
  const r = await db.query<SessionRow>(
    `SELECT id, bill_id, participant_id, expires_at, revoked_at
     FROM app.sessions WHERE token_hash = $1 AND bill_id = $2`,
    [sha256(value), billId],
  );
  const session = r.rows[0];
  if (!session) throw new HttpError(401, 'SESSION_INVALID', problemMessages.sessionInvalid);
  if (session.revoked_at)
    throw new HttpError(401, 'ACCESS_TRANSFERRED', problemMessages.sessionEnded);
  if (session.expires_at.getTime() < Date.now())
    throw new HttpError(401, 'SESSION_INVALID', problemMessages.sessionExpired);

  // renovação: last_used_at com throttle de 5 min; expires_at renovado ~1x/dia
  await db.query(
    `UPDATE app.sessions SET
       last_used_at = CASE WHEN last_used_at < now() - interval '5 minutes' THEN now() ELSE last_used_at END,
       expires_at = CASE WHEN expires_at < now() + interval '29 days' THEN now() + interval '30 days' ELSE expires_at END
     WHERE id = $1`,
    [session.id],
  );
  return { session };
}

export interface Actor {
  sessionId: string;
  participantId: string;
  billId: string;
}

declare module 'express-serve-static-core' {
  interface Locals {
    actor?: Actor;
  }
}

/**
 * §11.4: sem cookie para essa conta → 404 (mesmo corpo de conta inexistente);
 * cookie presente mas sessão inválida → 401.
 */
export function authorizeBill(db: Db): RequestHandler {
  return async (req, res, next) => {
    try {
      const billId = String(req.params.billId ?? '');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(billId)) {
        sendProblem(res, 404, 'NOT_FOUND', problemMessages.notFound);
        return;
      }
      const cookies = parseCookies(req.headers.cookie);
      if (!cookies[sessionCookieName(billId)]) {
        sendProblem(res, 404, 'NOT_FOUND', problemMessages.notFound);
        return;
      }
      const resolved = await resolveSession(db, billId, req);
      if (!resolved) {
        sendProblem(res, 404, 'NOT_FOUND', problemMessages.notFound);
        return;
      }
      res.locals.actor = {
        sessionId: resolved.session.id,
        participantId: resolved.session.participant_id,
        billId,
      };
      next();
    } catch (e) {
      next(e);
    }
  };
}

export function actorOf(res: Response): Actor {
  const a = res.locals.actor;
  if (!a) throw new HttpError(401, 'SESSION_INVALID', problemMessages.sessionMissing);
  return a;
}
