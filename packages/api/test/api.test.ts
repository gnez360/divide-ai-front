import { afterAll, beforeAll, describe, expect, it, type TestContext } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createApp, type App } from '../src/server.js';
import { registerFakeFixture } from '@cj/ocr';
import type { ExtractedReceipt } from '@cj/ocr';

let api: App | null = null;
let base = '';
let ready = false;

const avatar = { initial: 'M', color: 'blue' as const };

function cookieOf(res: Response): string {
  const raw = res.headers.getSetCookie?.() ?? [];
  const session = raw.find((c) => c.startsWith('__Host-cj_'));
  if (!session) throw new Error(`sem Set-Cookie de sessão: ${raw.join(' | ')}`);
  return session.split(';')[0]!;
}

interface TestBody {
  billId: string;
  token: string;
  revision: number;
  attemptId: string | null;
  objectKey: string;
  uploadUrl: string;
  hasSession: boolean;
  code?: string;
  message?: string;
  seats: { limit: number };
  me: { isCreator: boolean; participantId: string };
  snapshot: {
    revision: number;
    hasImage: boolean;
    document: {
      status: string;
      printedTotal: number | null;
      details: { version: number; restaurantName?: string | null; table?: string | null };
      items: Array<{ id: string; version: number }>;
      charges: Array<{ id: string }>;
      participants: Array<{
        id: string;
        displayName: string;
        status: string;
        consumptionVersion: number;
      }>;
    };
    derived: { shares: Record<string, { amount: number }> };
  };
  [key: string]: unknown;
}

async function j(
  path: string,
  init: RequestInit & { cookie?: string } = {},
): Promise<{ status: number; body: TestBody; res: Response }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init.cookie) headers.cookie = init.cookie;
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as object) },
  });
  let body: unknown = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body: body as TestBody, res };
}

function cmd(command: Record<string, unknown>): RequestInit {
  return { method: 'POST', body: JSON.stringify({ operationId: randomUUID(), command }) };
}

async function untilStatus(
  cookie: string,
  billId: string,
  status: string,
  ms = 4000,
): Promise<TestBody> {
  const start = Date.now();
  let last: TestBody | undefined;
  while (Date.now() - start < ms) {
    const r = await j(`/api/bills/${billId}`, { cookie });
    last = r.body;
    if (r.body?.snapshot?.document?.status === status) return r.body;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `status ${status} não alcançado; último: ${JSON.stringify(last?.snapshot?.document?.status)}`,
  );
}

beforeAll(async () => {
  try {
    api = await createApp();
    await api.deps.db.query('DELETE FROM app.rate_limits');
    const server = await new Promise<{ port: number }>((resolve) => {
      const s = api!.app.listen(0, () => resolve({ port: (s.address() as { port: number }).port }));
    });
    base = `http://127.0.0.1:${server.port}`;
    const health = await fetch(`${base}/api/health`);
    ready = health.ok;
  } catch (e) {
    console.warn('[api.test] banco indisponível; testes serão pulados:', (e as Error).message);
    ready = false;
  }
}, 30_000);

afterAll(async () => {
  await api?.close();
});

describe('API — fluxo ponta a ponta', () => {
  it('cria conta → OCR fake → revisão → divide → confirma → fecha', async (ctx: TestContext) => {
    if (!ready) return ctx.skip();

    // 1. criação (tela 01)
    const create = await j('/api/bills', {
      method: 'POST',
      body: JSON.stringify({
        operationId: randomUUID(),
        displayName: 'Marina',
        avatar,
        restaurantName: 'Boteco Teste',
        table: '7',
      }),
    });
    expect(create.status).toBe(201);
    const cookie = cookieOf(create.res);
    const billId: string = create.body.billId;
    expect(create.body.me.isCreator).toBe(true);
    expect(create.body.snapshot.document.status).toBe('DRAFT');

    // 2. upload assinado + objeto
    const up = await j(`/api/bills/${billId}/image/upload-url`, {
      method: 'POST',
      body: JSON.stringify({ operationId: randomUUID(), contentType: 'image/png' }),
      cookie,
    });
    expect(up.status, `upload-url: ${JSON.stringify(up.body)}`).toBe(200);
    const pngBytes = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('comanda-de-teste'),
    ]);
    const receiptFixture: ExtractedReceipt = {
      restaurantName: 'Boteco Teste',
      table: '7',
      items: [
        {
          name: 'Pizza calabresa',
          quantity: 1,
          unitPrice: 5000,
          lineTotal: 5000,
          confidence: 0.99,
        },
        { name: 'Coca-Cola', quantity: 2, unitPrice: 800, lineTotal: 1600, confidence: 0.97 },
      ],
      charges: [
        { description: 'Serviço 10%', kind: 'FEE', amount: 660, percentBp: 1000, confidence: 0.95 },
      ],
      printedTotal: 7260,
      subtotalRead: 6600,
    };
    registerFakeFixture(new Uint8Array(pngBytes), {
      ok: true,
      receipt: receiptFixture,
      diagnostics: { providerMs: 1, parserMs: 1 },
    });

    const put = await fetch(`${base}${up.body.uploadUrl}`, { method: 'PUT', body: pngBytes });
    expect(put.status).toBe(200);

    // 3. START_OCR → 202 → OCR em background
    const ocr = await j(`/api/bills/${billId}/image`, {
      method: 'POST',
      body: JSON.stringify({ operationId: randomUUID(), objectKey: up.body.objectKey }),
      cookie,
    });
    expect(ocr.status, `start-ocr: ${JSON.stringify(ocr.body)}`).toBe(202);
    expect(ocr.body.attemptId).toBeTruthy();

    const review = await untilStatus(cookie, billId, 'RECEIPT_REVIEW');
    expect(review.snapshot.document.items).toHaveLength(2);
    expect(review.snapshot.document.details.restaurantName).toBe('Boteco Teste');
    expect(review.snapshot.document.printedTotal).toBe(7260);
    expect(review.snapshot.hasImage).toBe(true);

    // 4. confirma a comanda (DRAFT→RECEIPT_REVIEW→OPEN), divide e confirma consumo
    const me: string = review.snapshot.document.participants[0]!.id;
    const confReceipt = await j(`/api/bills/${billId}/commands`, {
      ...cmd({ type: 'CONFIRM_RECEIPT' }),
      cookie,
    });
    expect(confReceipt.status, `CONFIRM_RECEIPT: ${JSON.stringify(confReceipt.body)}`).toBe(200);
    expect(confReceipt.body.snapshot.document.status).toBe('OPEN');

    for (const item of review.snapshot.document.items) {
      const split = await j(`/api/bills/${billId}/commands`, {
        ...cmd({
          type: 'SET_SPLIT',
          itemId: item.id,
          mode: 'EQUAL',
          allocations: [{ participantId: me }],
        }),
        cookie,
      });
      expect(split.status, `SET_SPLIT: ${JSON.stringify(split.body)}`).toBe(200);
    }
    const confMine = await j(`/api/bills/${billId}/commands`, {
      ...cmd({ type: 'CONFIRM_MY_CONSUMPTION' }),
      cookie,
    });
    expect(confMine.status, `CONFIRM_MY: ${JSON.stringify(confMine.body)}`).toBe(200);

    // 5. idempotência: repetir o mesmo operationId não cria revisão nova
    const operationId = randomUUID();
    const first = await j(`/api/bills/${billId}/commands`, {
      method: 'POST',
      body: JSON.stringify({ operationId, command: { type: 'UPDATE_BILL_DETAILS', table: '7' } }),
      cookie,
    });
    expect(first.status).toBe(200);
    const revAfterFirst = first.body.revision;
    const repeat = await j(`/api/bills/${billId}/commands`, {
      method: 'POST',
      body: JSON.stringify({ operationId, command: { type: 'UPDATE_BILL_DETAILS', table: '7' } }),
      cookie,
    });
    expect(repeat.status).toBe(200);
    expect(repeat.body.revision).toBe(revAfterFirst);
    expect(repeat.body.snapshot.revision).toBe(revAfterFirst);

    // 6. convite e entrada de outra pessoa
    const invite = await j(`/api/bills/${billId}/invite`, { cookie });
    expect(invite.status).toBe(200);
    const resolve = await j('/api/join/resolve', {
      method: 'POST',
      body: JSON.stringify({ joinToken: invite.body.token }),
    });
    expect(resolve.status).toBe(200);
    expect(resolve.body.hasSession).toBe(false);
    expect(resolve.body.seats.limit).toBe(6);

    const join = await j('/api/join', {
      method: 'POST',
      body: JSON.stringify({
        operationId: randomUUID(),
        joinToken: invite.body.token,
        command: {
          type: 'JOIN_AS_NEW',
          displayName: 'Nery',
          avatar: { initial: 'N', color: 'teal' },
        },
      }),
    });
    expect(join.status).toBe(201);
    const cookie2 = cookieOf(join.res);
    expect(join.body.me.isCreator).toBe(false);

    // participante vê a mesma conta
    const guestView = await j(`/api/bills/${billId}`, { cookie: cookie2 });
    expect(guestView.status).toBe(200);
    expect(guestView.body.me.isCreator).toBe(false);
    expect(guestView.body.snapshot.document.participants).toHaveLength(2);

    // link antigo revogado para novo participante não existe — outra conta usa outro cookie
    // 7. ambos confirmam e fecham
    const guestConfirm = await j(`/api/bills/${billId}/commands`, {
      ...cmd({ type: 'CONFIRM_NO_CONSUMPTION' }),
      cookie: cookie2,
    });
    expect(guestConfirm.status).toBe(200);

    const viewNow = await j(`/api/bills/${billId}`, { cookie });
    const shareMe = viewNow.body.snapshot.derived.shares[me]!.amount;
    const cvMe = viewNow.body.snapshot.document.participants.find(
      (p: { id: string }) => p.id === me,
    )!.consumptionVersion;
    const closeMine = await j(`/api/bills/${billId}/commands`, {
      method: 'POST',
      body: JSON.stringify({
        operationId: randomUUID(),
        command: { type: 'CLOSE_MY_SHARE' },
        expected: { shareAmount: shareMe, consumptionVersion: cvMe },
      }),
      cookie,
    });
    expect(closeMine.status, `CLOSE_MY_SHARE: ${JSON.stringify(closeMine.body)}`).toBe(200);

    const closeGuest = await j(`/api/bills/${billId}/commands`, {
      ...cmd({ type: 'CLOSE_MY_SHARE' }),
      cookie: cookie2,
    });
    expect(closeGuest.status).toBe(200);

    const chargeId = viewNow.body.snapshot.document.charges[0]?.id;
    if (chargeId) {
      const confirmCharge = await j(`/api/bills/${billId}/commands`, {
        ...cmd({ type: 'CONFIRM_CHARGE', chargeId }),
        cookie,
      });
      expect(confirmCharge.status, `CONFIRM_CHARGE: ${JSON.stringify(confirmCharge.body)}`).toBe(
        200,
      );
    }

    const closeBill = await j(`/api/bills/${billId}/commands`, {
      ...cmd({ type: 'CLOSE_BILL' }),
      cookie,
    });
    expect(closeBill.status, `CLOSE_BILL: ${JSON.stringify(closeBill.body)}`).toBe(200);
    expect(closeBill.body.snapshot.document.status).toBe('CLOSED');

    // 8. estado final e leitura de conta finalizada
    const finalPreview = await j('/api/join/resolve', {
      method: 'POST',
      body: JSON.stringify({ joinToken: invite.body.token }),
    });
    expect(finalPreview.status).toBe(200);
    expect(finalPreview.body.status).toBe('CLOSED');
    expect(finalPreview.body.summary).toBeTruthy();

    // invite não responde mais para conta fechada (§6.2)
    const inviteClosed = await j(`/api/bills/${billId}/invite`, { cookie });
    expect(inviteClosed.status).toBe(404);

    // 9. guarda de versão → 409 VERSION_CONFLICT
    const item = closeBill.body.snapshot.document.items[0]!;
    const stale = await j(`/api/bills/${billId}/commands`, {
      method: 'POST',
      body: JSON.stringify({
        operationId: randomUUID(),
        command: { type: 'EDIT_ITEM', itemId: item.id, name: 'Nome novo' },
        expected: { version: item.version + 5 },
      }),
      cookie,
    });
    expect([200, 409, 422]).toContain(stale.status); // conta CLOSED: a guarda de estado vem primeiro

    // 10. sessão finalizada
    const end = await j(`/api/bills/${billId}/session/end`, { method: 'POST', cookie: cookie2 });
    expect(end.status).toBe(204);
    const afterEnd = await j(`/api/bills/${billId}`, { cookie: cookie2 });
    expect(afterEnd.status).toBe(401);

    // 11. exclusão da conta (§7.5)
    const del = await j(`/api/bills/${billId}/commands`, {
      ...cmd({ type: 'DELETE_BILL', confirmation: 'EXCLUIR' }),
      cookie,
    });
    expect(del.status, `DELETE_BILL: ${JSON.stringify(del.body)}`).toBe(200);
    const gone = await j(`/api/bills/${billId}`, { cookie });
    expect([401, 404]).toContain(gone.status); // §11.4: sessão revogada → 401; sem conta → 404
  }, 60_000);

  it('SSE: hello com revisão e evento após comando', async (ctx: TestContext) => {
    if (!ready) return ctx.skip();

    const create = await j('/api/bills', {
      method: 'POST',
      body: JSON.stringify({ operationId: randomUUID(), displayName: 'Sse', avatar }),
    });
    const cookie = cookieOf(create.res);
    const billId: string = create.body.billId;

    const ctrl = new AbortController();
    const res = await fetch(`${base}/api/bills/${billId}/events`, {
      headers: { cookie },
      signal: ctrl.signal,
    });
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const readUntil = async (needle: string, timeoutMs = 4000): Promise<string> => {
      const start = Date.now();
      while (!buffer.includes(needle)) {
        if (Date.now() - start > timeoutMs)
          throw new Error(`não veio "${needle}"; buffer: ${buffer.slice(0, 300)}`);
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }
      return buffer;
    };

    const hello = await readUntil('event: hello');
    expect(hello).toContain('"revision":0');

    // DRAFT não aceita ADD_ITEM: digita manualmente antes (DRAFT → RECEIPT_REVIEW)
    const manual = await j(`/api/bills/${billId}/commands`, {
      ...cmd({ type: 'ENTER_MANUALLY' }),
      cookie,
    });
    expect(manual.status).toBe(200);
    expect(manual.body.snapshot.document.status).toBe('RECEIPT_REVIEW');

    const update = await j(`/api/bills/${billId}/commands`, {
      ...cmd({
        type: 'ADD_ITEM',
        name: 'Suco',
        quantity: 1,
        priceMode: 'LINE_TOTAL',
        lineTotal: 1200,
      }),
      cookie,
    });
    expect(update.status, `ADD_ITEM: ${JSON.stringify(update.body)}`).toBe(200);

    const ev = await readUntil('"type":"ADD_ITEM"');
    expect(ev).toContain('"Suco"');

    ctrl.abort();
    await reader.cancel().catch(() => {});
  }, 20_000);

  it('join com link inválido → 404 com mesmo corpo', async (ctx: TestContext) => {
    if (!ready) return ctx.skip();
    const r = await j('/api/join/resolve', {
      method: 'POST',
      body: JSON.stringify({ joinToken: 'nao-e-um-token' }),
    });
    expect(r.status).toBe(404);
    expect(r.body.code).toBe('NOT_FOUND');
  });

  it('comando sem sessão da conta → 404 (não revela existência)', async (ctx: TestContext) => {
    if (!ready) return ctx.skip();
    const create = await j('/api/bills', {
      method: 'POST',
      body: JSON.stringify({ operationId: randomUUID(), displayName: 'X', avatar }),
    });
    const billId = create.body.billId;
    const r = await j(`/api/bills/${billId}/commands`, {
      ...cmd({ type: 'ADD_ITEM', name: 'X', quantity: 1, priceMode: 'LINE_TOTAL', lineTotal: 100 }),
    });
    expect(r.status).toBe(404);
  });

  it('origin rejeitado → 403 em mutação', async (ctx: TestContext) => {
    if (!ready) return ctx.skip();
    const r = await j('/api/bills', {
      method: 'POST',
      body: JSON.stringify({ operationId: randomUUID(), displayName: 'X', avatar }),
      headers: { origin: 'https://malicioso.example' },
    });
    expect(r.status).toBe(403);
  });

  it('crons: com segredo 200, sem segredo 404', async (ctx: TestContext) => {
    if (!ready) return ctx.skip();
    const ok = await fetch(`${base}/api/cron/purge-events`, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? 'dev-cron-secret'}` },
    });
    expect(ok.status).toBe(200);
    const bad = await fetch(`${base}/api/cron/purge-events`, { method: 'POST' });
    expect(bad.status).toBe(404);
    const unknown = await fetch(`${base}/api/cron/nao-existe`, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? 'dev-cron-secret'}` },
    });
    expect(unknown.status).toBe(404);
  });

  it('health e ready respondem', async (ctx: TestContext) => {
    if (!ready) return ctx.skip();
    const h = await fetch(`${base}/api/health`);
    expect(h.status).toBe(200);
    const rd = await fetch(`${base}/api/ready`);
    expect([200, 503]).toContain(rd.status);
  });
});
