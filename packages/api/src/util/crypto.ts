import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function sha256(data: string | Buffer): Buffer {
  return createHash('sha256').update(data).digest();
}

export function hmacSha256(key: Buffer | string, data: string | Buffer): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

export function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

export function fromB64url(s: string): Buffer {
  return Buffer.from(s, 'base64url');
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** UUIDv5 (RFC 4122): SHA-1 do namespace + nome. */
const NS_URL = Buffer.from('6ba7b8109dad11d180b400c04fd430c8', 'hex');
const NS_APP = Buffer.from(uuidv5Raw('conta-juntos', NS_URL).replace(/-/g, ''), 'hex');

function uuidv5Raw(name: string, namespace: Buffer): string {
  const hash = createHash('sha1').update(namespace).update(name).digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function uuidv5(name: string): string {
  return uuidv5Raw(name, NS_APP);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

// ── Cookies ──────────────────────────────────────────────────────────────────

export interface CookieOptions {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
  path?: string;
}

export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=${value}`];
  parts.push(`Path=${opts.path ?? '/'}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  if (opts.httpOnly !== false) parts.push('HttpOnly');
  if (opts.secure !== false) parts.push('Secure');
  parts.push(`SameSite=${opts.sameSite ?? 'Lax'}`);
  return parts.join('; ');
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function sessionCookieName(billId: string): string {
  return `__Host-cj_${billId.replace(/-/g, '')}`;
}

export function claimCookieName(claimId: string): string {
  return `__Host-cjc_${claimId.replace(/-/g, '')}`;
}
