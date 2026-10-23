import type { BillDocument } from '@cj/contracts';
import { migrateDocument, derive } from '@cj/core';

export interface Queryable {
  query<R extends import('pg').QueryResultRow = import('pg').QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<import('pg').QueryResult<R>>;
}

export interface BillRow {
  id: string;
  status: string;
  revision: string | number;
  schema_version: number;
  document: unknown;
  created_by: string;
  join_token_version: number;
  image_path: string | null;
  created_at: Date;
  updated_at: Date;
  receipt_confirmed_at: Date | null;
  closed_at: Date | null;
}

export type PresenceState = 'online' | 'offline' | 'recent';

export interface BillSnapshotOut {
  revision: number;
  document: BillDocument;
  derived: unknown;
  hasImage: boolean;
  presence: Record<string, PresenceState>;
}

export async function loadPresence(
  q: Queryable,
  billId: string,
): Promise<Record<string, PresenceState>> {
  const rows = await q.query<{ participant_id: string; last_seen_at: Date }>(
    'SELECT participant_id, last_seen_at FROM app.presence WHERE bill_id = $1',
    [billId],
  );
  const now = Date.now();
  const out: Record<string, PresenceState> = {};
  for (const r of rows.rows) {
    const age = now - r.last_seen_at.getTime();
    out[r.participant_id] = age < 45_000 ? 'online' : age < 300_000 ? 'recent' : 'offline';
  }
  return out;
}

export function buildSnapshot(
  row: Pick<BillRow, 'revision' | 'document' | 'image_path' | 'id'>,
  presence: Record<string, PresenceState>,
): BillSnapshotOut {
  const document = migrateDocument(row.document);
  return {
    revision: Number(row.revision),
    document,
    derived: derive(document),
    hasImage: row.image_path !== null,
    presence,
  };
}

export async function snapshotOf(q: Queryable, billId: string): Promise<BillSnapshotOut | null> {
  const r = await q.query<BillRow>('SELECT * FROM app.bills WHERE id = $1', [billId]);
  if (!r.rows[0]) return null;
  return buildSnapshot(r.rows[0], await loadPresence(q, billId));
}
