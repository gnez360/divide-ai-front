import type { NextFunction, Request, Response } from 'express';
import { errorMessages, problemMessages, statusTitle } from '@cj/contracts';
import { z } from 'zod';

function defaultMessage(code: string): string {
  return (errorMessages as Record<string, string>)[code] ?? problemMessages.internal;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message ?? defaultMessage(code));
    this.name = 'HttpError';
  }
}

export function problemBody(
  status: number,
  code: string,
  message?: string,
): Record<string, unknown> {
  return {
    type: `about:blank#${code}`,
    title: statusTitle(status),
    status,
    code,
    message: message ?? defaultMessage(code),
  };
}

export function sendProblem(
  res: Response,
  status: number,
  code: string,
  message?: string,
  extra?: Record<string, unknown>,
): void {
  res.status(status);
  res.setHeader('Content-Type', 'application/problem+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ...problemBody(status, code, message),
    ...(extra ?? {}),
  });
}

export function zodDetails(err: z.ZodError): Record<string, unknown> {
  return {
    issues: err.issues.slice(0, 20).map((i) => ({ path: i.path.join('.'), message: i.message })),
  };
}

export function errorMiddleware(isProd: boolean) {
  return (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (res.headersSent) return;
    if (err instanceof HttpError) {
      sendProblem(res, err.status, err.code, err.message, err.details);
      return;
    }
    if (err instanceof z.ZodError) {
      sendProblem(res, 400, 'VALIDATION', problemMessages.invalidBody, zodDetails(err));
      return;
    }
    const e = err as unknown as { type?: string; status?: number; code?: string };
    if (e?.type === 'entity.too.large') {
      sendProblem(res, 413, 'PAYLOAD_TOO_LARGE', problemMessages.payloadTooLarge);
      return;
    }
    if (e?.type === 'entity.parse.failed') {
      sendProblem(res, 400, 'VALIDATION', problemMessages.invalidJson);
      return;
    }
    const errObj = err as { name?: string; message?: string; stack?: string };
    console.error(
      '[api] internal error',
      errObj?.name,
      isProd ? '(stack omitted)' : (errObj?.stack ?? errObj?.message),
    );
    sendProblem(res, 500, 'INTERNAL', problemMessages.internal);
  };
}
