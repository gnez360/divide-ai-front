import type { Request, RequestHandler, Response } from 'express';
import { problemMessages } from '@cj/contracts';
import type { Config } from '../config.js';
import { HttpError, sendProblem } from './problem.js';
import { hmacSha256 } from '../util/crypto.js';
import type { Db } from '../db.js';

export function securityHeaders(): RequestHandler {
  return (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  };
}

/** Toda mutação exige Origin igual à origem do app (§6.1); GET não altera estado. */
export function originCheck(config: Config): RequestHandler {
  return (req, _res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    const origin = req.headers.origin;
    if (origin && config.appOrigins.includes(origin)) return next();
    // requisições same-origin de ferramentas sem Origin (curl no smoke) são aceitas fora de produção
    if (!origin && !config.isProd) return next();
    next(new HttpError(403, 'FORBIDDEN', problemMessages.originNotAllowed));
  };
}

export function ipOf(req: Request): string {
  return (req.socket.remoteAddress ?? 'unknown').replace(/^::ffff:/, '');
}

export function ipHmacOf(config: Config, req: Request): Buffer {
  return hmacSha256(config.auditKey, ipOf(req));
}

/**
 * Rate limit por chave em app.rate_limits (§7.1 passo 4).
 * Retorna o número de requisições na janela atual.
 */
export async function hitRateLimit(
  db: Db,
  key: string,
  limit: number,
  windowSec: number,
): Promise<number> {
  const row = await db.query<{ count: number }>(
    `INSERT INTO app.rate_limits (bucket, count, reset_at)
     VALUES ($1, 1, now() + make_interval(secs => $2))
     ON CONFLICT (bucket) DO UPDATE SET
       count = CASE WHEN app.rate_limits.reset_at < now() THEN 1 ELSE app.rate_limits.count + 1 END,
       reset_at = CASE WHEN app.rate_limits.reset_at < now() THEN now() + make_interval(secs => $2) ELSE app.rate_limits.reset_at END
     RETURNING count`,
    [key, windowSec],
  );
  return row.rows[0]?.count ?? 1;
}

export function rateLimit(
  db: Db,
  name: string,
  limit: number,
  windowSec: number,
  keyFn?: (req: Request, res: Response) => string,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const key = `${name}:${keyFn ? keyFn(req, res) : ipOf(req)}`;
      const count = await hitRateLimit(db, key, limit, windowSec);
      if (count > limit) {
        res.setHeader('Retry-After', String(windowSec));
        sendProblem(res, 429, 'RATE_LIMITED', problemMessages.tooManyRequests);
        return;
      }
      next();
    } catch {
      // banco indisponível não derruba o rate limit para erro de validação — mas não bloqueia
      next();
    }
  };
}
