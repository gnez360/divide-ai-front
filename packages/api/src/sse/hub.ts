import type { Response } from 'express';
import type { Db } from '../db.js';
import { buildSnapshot, loadPresence, type BillRow, type PresenceState } from '../app/snapshot.js';

interface Stream {
  id: string;
  res: Response;
  billId: string;
  sessionId: string;
  participantId: string;
  lastPing: number;
}

const MAX_STREAMS_PER_SESSION = 3;
const MAX_STREAMS_TOTAL = 10_000;

export class SseHub {
  private byBill = new Map<string, Set<Stream>>();
  private bySession = new Map<string, Set<Stream>>();
  private all = new Set<Stream>();
  private presenceTimers = new Map<string, NodeJS.Timeout>();
  private editing = new Map<string, { itemId: string; expiresAt: number }>();

  constructor(private db: Db) {}

  // ── registro (§8.2/§8.3) ───────────────────────────────────────────────────

  register(stream: Stream): void {
    const existing = this.bySession.get(stream.sessionId);
    if (existing && existing.size >= MAX_STREAMS_PER_SESSION) {
      const oldest = [...existing].sort((a, b) => (a.id > b.id ? 1 : -1))[0];
      if (oldest) this.end(oldest, 'event: retry: 1000\ndata: {}\n\n');
    }
    if (this.all.size >= MAX_STREAMS_TOTAL) {
      stream.res.end();
      return;
    }
    this.all.add(stream);
    addTo(this.byBill, stream.billId, stream);
    addTo(this.bySession, stream.sessionId, stream);

    stream.res.write('retry: 3000\n\n');
    stream.res.write(`: ping\n\n`);

    // hello depois de registrar (§8.2)
    void this.db
      .query<BillRow>('SELECT * FROM app.bills WHERE id = $1', [stream.billId])
      .then((r) => {
        if (!r.rows[0]) {
          this.sendDeleted(stream.billId);
          return;
        }
        stream.res.write(
          `event: hello\ndata: ${JSON.stringify({ revision: Number(r.rows[0].revision) })}\n\n`,
        );
        void this.sendPresence(stream.billId);
        void this.touchPresence(stream.billId, stream.participantId);
      });
  }

  private remove(stream: Stream): void {
    this.all.delete(stream);
    this.byBill.get(stream.billId)?.delete(stream);
    this.bySession.get(stream.sessionId)?.delete(stream);
  }

  end(stream: Stream, chunk?: string): void {
    try {
      if (chunk) stream.res.write(chunk);
      stream.res.end();
    } catch {
      /* já fechado */
    }
    this.remove(stream);
  }

  endAllForSession(sessionId: string, eventChunk?: string): void {
    const set = this.bySession.get(sessionId);
    if (!set) return;
    for (const s of [...set]) this.end(s, eventChunk);
  }

  endAllForBill(billId: string, eventChunk?: string): void {
    const set = this.byBill.get(billId);
    if (!set) return;
    for (const s of [...set]) this.end(s, eventChunk);
  }

  // ── fan-out (§8.4) ─────────────────────────────────────────────────────────

  async onBillEvent(payload: string): Promise<void> {
    const [billId, revision] = payload.split(':');
    if (!billId || !revision) return;
    const streams = this.byBill.get(billId);
    if (!streams?.size) return;
    const r = await this.db.query<{ payload: unknown }>(
      'SELECT payload FROM app.events WHERE bill_id = $1 AND revision = $2',
      [billId, Number(revision)],
    );
    const event = r.rows[0]?.payload;
    if (!event) return;
    const chunk = `event: bill\nid: ${revision}\ndata: ${JSON.stringify(event)}\n\n`;
    for (const s of streams) {
      try {
        s.res.write(chunk);
      } catch {
        this.end(s);
      }
    }
    await this.sendPresence(billId);
  }

  onSessionRevoked(payload: string): void {
    const [billId, sessionId] = payload.split(':');
    if (!billId || !sessionId) return;
    const chunk = `event: session\ndata: ${JSON.stringify({ code: 'ACCESS_TRANSFERRED' })}\n\n`;
    this.endAllForSession(sessionId, chunk);
  }

  sendDeleted(billId: string): void {
    this.endAllForBill(billId, `event: deleted\ndata: {}\n\n`);
  }

  async sendPresence(billId: string): Promise<void> {
    const streams = this.byBill.get(billId);
    if (!streams?.size) return;
    const presence = await loadPresence(this.db, billId);
    const chunk = `event: presence\ndata: ${JSON.stringify({ presence })}\n\n`;
    for (const s of streams) {
      try {
        s.res.write(chunk);
      } catch {
        this.end(s);
      }
    }
  }

  async touchPresence(billId: string, participantId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO app.presence (bill_id, participant_id, instance, connections, last_seen_at)
       VALUES ($1, $2, 'local', 1, now())
       ON CONFLICT (bill_id, participant_id, instance) DO UPDATE SET last_seen_at = now(),
         connections = GREATEST(app.presence.connections, 1)`,
      [billId, participantId],
    );
    if (!this.presenceTimers.has(billId)) {
      const t = setTimeout(() => {
        this.presenceTimers.delete(billId);
        void this.flushPresence(billId);
      }, 1000);
      this.presenceTimers.set(billId, t);
    }
  }

  private async flushPresence(billId: string): Promise<void> {
    const streams = this.byBill.get(billId);
    if (!streams?.size) return;
    for (const s of streams) {
      try {
        await this.db.query(
          `INSERT INTO app.presence (bill_id, participant_id, instance, connections, last_seen_at)
           VALUES ($1, $2, 'local', 1, now())
           ON CONFLICT (bill_id, participant_id, instance) DO UPDATE SET last_seen_at = now()`,
          [billId, s.participantId],
        );
      } catch {
        /* banco momentaneamente indisponível */
      }
    }
    await this.db.query(
      "DELETE FROM app.presence WHERE bill_id = $1 AND last_seen_at < now() - interval '10 minutes'",
      [billId],
    );
    await this.sendPresence(billId);
  }

  heartbeat(): void {
    for (const s of this.all) {
      try {
        s.res.write(`: ping\n\n`);
      } catch {
        this.end(s);
      }
      void this.touchPresence(s.billId, s.participantId);
    }
  }

  // ── presença de edição (§F5.7): efêmera, 30 s, só canal local ──────────────

  setEditing(billId: string, participantId: string, itemId: string | null): void {
    const key = `${billId}:${participantId}`;
    if (itemId === null) this.editing.delete(key);
    else this.editing.set(key, { itemId, expiresAt: Date.now() + 30_000 });
    const active: Record<string, string> = {};
    for (const [k, v] of this.editing) {
      if (v.expiresAt > Date.now() && k.startsWith(`${billId}:`)) {
        active[k.split(':')[1]!] = v.itemId;
      }
    }
    const chunk = `event: editing\ndata: ${JSON.stringify({ editing: active })}\n\n`;
    for (const s of this.byBill.get(billId) ?? []) {
      try {
        s.res.write(chunk);
      } catch {
        this.end(s);
      }
    }
  }

  close(): void {
    for (const s of [...this.all]) this.end(s, 'event: retry: 1000\ndata: {}\n\n');
    for (const t of this.presenceTimers.values()) clearTimeout(t);
    this.presenceTimers.clear();
  }

  streamCount(): number {
    return this.all.size;
  }
}

function addTo(map: Map<string, Set<Stream>>, key: string, stream: Stream): void {
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }
  set.add(stream);
}

export type { Stream, BillRow, PresenceState, buildSnapshot };
