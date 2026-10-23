import pg from 'pg';

export type Db = pg.Pool;

export function createPool(databaseUrl: string): pg.Pool {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 5 });
  return pool;
}

export class BusyError extends Error {
  constructor() {
    super('lock timeout');
    this.name = 'BusyError';
  }
}

export async function withTx<T>(pool: pg.Pool, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* conexão pode já estar morta */
    }
    throw e;
  } finally {
    client.release();
  }
}

/** Transação de comando (§7.1): lock_timeout 3s por transação. */
export async function withCommandTx<T>(
  pool: pg.Pool,
  fn: (c: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '3s'");
    try {
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  } catch (e) {
    if ((e as { code?: string }).code === '55P03') throw new BusyError();
    throw e;
  } finally {
    client.release();
  }
}

export async function notify(
  client: pg.PoolClient | pg.Client,
  channel: string,
  payload: string,
): Promise<void> {
  await client.query('SELECT pg_notify($1, $2)', [channel, payload]);
}

export interface ListenHandle {
  client: pg.Client;
  close(): Promise<void>;
  ready(): boolean;
}

/** Conexão dedicada de LISTEN (§8.4) com reconexão em backoff. */
export function startListener(
  listenUrl: string,
  handlers: Record<string, (payload: string) => void>,
  onStatus: (ready: boolean) => void,
): ListenHandle {
  let client: pg.Client | null = null;
  let closed = false;
  let attempt = 0;

  const connect = async () => {
    if (closed) return;
    try {
      const c = new pg.Client({ connectionString: listenUrl });
      c.on('error', () => {
        onStatus(false);
        c.end().catch(() => {});
        if (client === c) client = null;
        schedule();
      });
      await c.connect();
      for (const channel of Object.keys(handlers)) await c.query(`LISTEN ${channel}`);
      c.on('notification', (msg) => {
        if (msg.channel && handlers[msg.channel]) handlers[msg.channel]!(msg.payload ?? '');
      });
      client = c;
      attempt = 0;
      onStatus(true);
    } catch {
      onStatus(false);
      schedule();
    }
  };

  const schedule = () => {
    if (closed) return;
    const delay = Math.min(30_000, 500 * 2 ** Math.min(attempt++, 6));
    setTimeout(() => void connect(), delay);
  };

  void connect();

  return {
    get client() {
      return client!;
    },
    ready() {
      return client !== null;
    },
    async close() {
      closed = true;
      onStatus(false);
      if (client) await client.end().catch(() => {});
    },
  } as ListenHandle;
}
