import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

/** Empate determinístico por hash(contexto:participante) — neutro por nome. */
export function tieBreakHex(context: string, participantId: string): string {
  return bytesToHex(sha256(utf8ToBytes(`${context}:${participantId}`)));
}

/**
 * Método do Maior Resto (spec §F7 / spec/07 §6).
 * - quotas exatas em resto bigint;
 * - Σ weights < denominator → centavos de resto NÃO distribuídos (valor sem dono);
 * - denominador sempre explícito.
 */
export function largestRemainder(
  total: bigint,
  weights: ReadonlyArray<readonly [string, bigint]>,
  denominator: bigint,
  context: string,
): Map<string, bigint> {
  if (denominator <= 0n) throw new Error('largestRemainder: denominator must be > 0');
  const sumWeights = weights.reduce((s, [, w]) => s + w, 0n);
  if (sumWeights > denominator) throw new Error('largestRemainder: weights > denominator');
  const base = weights.map(([id, w]) => ({
    id,
    base: (total * w) / denominator,
    rem: (total * w) % denominator,
  }));
  const result = new Map(base.map((b) => [b.id, b.base] as const));
  if (sumWeights < denominator || total === 0n) return result;
  let leftover = total - base.reduce((s, b) => s + b.base, 0n);
  const neg = leftover < 0n;
  const order = [...base].sort((a, b) => {
    const ra = neg ? -a.rem : a.rem;
    const rb = neg ? -b.rem : b.rem;
    if (ra !== rb) return ra > rb ? -1 : 1;
    const ha = tieBreakHex(context, a.id);
    const hb = tieBreakHex(context, b.id);
    return ha < hb ? -1 : ha > hb ? 1 : 0;
  });
  const step = neg ? -1n : 1n;
  for (const { id } of order) {
    if (leftover === 0n) break;
    result.set(id, (result.get(id) ?? 0n) + step);
    leftover -= step;
  }
  return result;
}

/** Percentual: (base × bp + 5000) / 10000 — meio para cima. */
export function percentAmount(base: bigint, bp: bigint): bigint {
  return (base * bp + 5000n) / 10000n;
}

export function sumBig(values: Iterable<bigint>): bigint {
  let s = 0n;
  for (const v of values) s += v;
  return s;
}
