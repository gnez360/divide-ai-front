/**
 * Vetores canônicos (§4.5, §17.2): cada JSON de test/vectors/ é um documento
 * (e opcionalmente comandos) com o resultado esperado dos aceites numéricos.
 * O runner é agnóstico de ambiente (sem APIs de Node além da leitura dos JSONs),
 * p/ permitir a mesma suíte no navegador (Chromium/WebKit) quando houver CI.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { billDocumentSchema, type Command } from '@cj/contracts';
import { derive, execute } from '../src/index.js';

type Vector = {
  id: string;
  title: string;
  source: string;
  document: unknown;
  commands?: Command[];
  actor?: string;
  expect: {
    error?: string;
    totals?: Record<string, number>;
    shares?: Record<string, Record<string, number>>;
    charges?: Record<
      string,
      {
        portions?: Record<string, number>;
        waived?: Record<string, number>;
        unassigned?: number;
        base?: number | null;
      }
    >;
    items?: Record<
      string,
      { status?: string; unassigned?: number; shares?: Record<string, number> }
    >;
    unallocated?: { total?: number; bySource?: Record<string, number> };
    blockers?: string[];
  };
};

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'vectors');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort();

function match(actual: unknown, expected: unknown, at: string): void {
  if (expected === null || typeof expected !== 'object') {
    expect(actual, at).toBe(expected);
    return;
  }
  if (Array.isArray(expected)) {
    expect(actual, at).toEqual(expected);
    return;
  }
  expect(actual, at).toEqual(expect.any(Object));
  for (const [k, v] of Object.entries(expected as Record<string, unknown>)) {
    match((actual as Record<string, unknown>)[k], v, `${at}.${k}`);
  }
}

let seq = 0;
const nextId = () => `e1000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

describe('vetores canônicos (§4.5)', () => {
  it('suíte completa presente', () => {
    expect(files.length).toBeGreaterThanOrEqual(25);
  });

  for (const file of files) {
    const v = JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as Vector;
    it(`${v.id} — ${v.title}`, () => {
      seq = 0;
      let doc = billDocumentSchema.parse(v.document);
      let derived = derive(doc);

      // determinismo (§11.J): mesma entrada → mesmo resultado, inclusive desempates
      expect(JSON.stringify(derive(doc))).toBe(JSON.stringify(derived));

      if (v.commands?.length) {
        for (const cmd of v.commands) {
          const r = execute(doc, cmd, {
            actor: {
              kind: 'PARTICIPANT',
              participantId: v.actor ?? doc.createdBy,
              isCreator: true,
            },
            now: '2026-10-23T12:00:00.000Z',
            newId: nextId,
          });
          if (!r.ok) {
            expect(v.expect.error, 'código de erro inesperado').toBe(r.error.code);
            return;
          }
          if (!r.noChange) {
            doc = r.doc;
            derived = r.derived;
          }
        }
        if (v.expect.error) {
          throw new Error(`esperava erro ${v.expect.error}, mas todos os comandos passaram`);
        }
        expect(JSON.stringify(derive(doc))).toBe(JSON.stringify(derived));
      }

      const e = v.expect;
      if (e.totals) match(derived.totals, e.totals, `${v.id}.totals`);
      if (e.shares) match(derived.shares, e.shares, `${v.id}.shares`);
      if (e.charges) match(derived.charges, e.charges, `${v.id}.charges`);
      if (e.items) match(derived.items, e.items, `${v.id}.items`);
      if (e.unallocated) match(derived.unallocated, e.unallocated, `${v.id}.unallocated`);
      if (e.blockers) {
        const types = derived.blockers.map((b) => b.type);
        for (const t of e.blockers) expect(types, `${v.id}.blockers`).toContain(t);
      }
      if (e.error === undefined && !v.commands?.length && v.expect.error) {
        throw new Error('expect.error exige commands');
      }
    });
  }
});
