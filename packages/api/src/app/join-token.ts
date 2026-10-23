import type { Config } from '../config.js';
import { b64url, fromB64url, hmacSha256, timingSafeEqualStr } from '../util/crypto.js';

/**
 * joinToken (§11.1): base64url(billId 16 bytes) "." kid "." base64url(mac[0..16])
 * MAC = HMAC-SHA256(K[kid], "join:" + billId + ":" + join_token_version)
 */
export function mintJoinToken(config: Config, billId: string, version: number): string {
  const kid = config.currentKid;
  const key = config.joinKeys.get(kid)!;
  const billBytes = fromB64url(Buffer.from(billId.replace(/-/g, ''), 'hex').toString('base64url'));
  const mac = hmacSha256(key, `join:${billId}:${version}`).subarray(0, 16);
  return `${b64url(billBytes)}.${kid}.${b64url(mac)}`;
}

export function verifyJoinToken(
  config: Config,
  token: string,
  billId: string,
  version: number,
): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [b, kid, mac] = parts as [string, string, string];
  if (b64url(fromB64url(b)) !== b || !kid) return false;
  const key = config.joinKeys.get(kid);
  if (!key) return false;
  const expected = b64url(hmacSha256(key, `join:${billId}:${version}`).subarray(0, 16));
  return timingSafeEqualStr(mac, expected);
}

export function billIdFromToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const bytes = fromB64url(parts[0]!);
    if (bytes.length !== 16) return null;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  } catch {
    return null;
  }
}
