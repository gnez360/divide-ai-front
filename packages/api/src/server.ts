import express, { type Express, type Request, type Response } from 'express';
import { mkdir } from 'node:fs/promises';
import { problemMessages, statusTitle } from '@cj/contracts';
import { loadConfig, type Config } from './config.js';
import { createPool, startListener, type Db } from './db.js';
import { errorMiddleware } from './http/problem.js';
import { securityHeaders, originCheck } from './http/security.js';
import { apiRouter } from './routes/bills.js';
import { cronRouter } from './routes/cron.js';
import { SseHub } from './sse/hub.js';
import { createStorage } from './storage/index.js';
import type { AppDeps } from './deps.js';

export interface App {
  app: Express;
  deps: AppDeps;
  close(): Promise<void>;
}

export async function createApp(config: Config = loadConfig()): Promise<App> {
  const db: Db = createPool(config.databaseUrl);
  await db.query('SELECT 1');

  if (config.storageProvider === 'fs') await mkdir(config.storageDir, { recursive: true });

  const ready = { listen: false };
  const hub = new SseHub(db);
  const storage = createStorage(config);
  const deps: AppDeps = { db, config, hub, storage, ready };

  const listener = startListener(
    config.databaseListenUrl,
    {
      bill_events: (payload) => void hub.onBillEvent(payload),
      session_revoked: (payload) => hub.onSessionRevoked(payload),
      bill_deleted: (payload) => hub.sendDeleted(payload),
      presence: () => void hub.sendPresence(''),
    },
    (isReady) => {
      ready.listen = isReady;
    },
  );

  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders());
  app.use(express.json({ limit: '256kb', strict: true }));
  app.use(originCheck(config));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true });
  });

  app.get('/api/ready', async (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      await db.query('SELECT 1');
      const ok = ready.listen;
      res.status(ok ? 200 : 503).json({ ok, listen: ready.listen, streams: hub.streamCount() });
    } catch {
      res.status(503).json({ ok: false, listen: false });
    }
  });

  app.use('/api', cronRouter(deps));
  app.use('/api', apiRouter(deps));

  app.use((_req, res) => {
    res.status(404);
    res.setHeader('Content-Type', 'application/problem+json; charset=utf-8');
    res.json({
      type: 'about:blank#NOT_FOUND',
      title: statusTitle(404),
      status: 404,
      code: 'NOT_FOUND',
      message: problemMessages.notFound,
    });
  });
  app.use(errorMiddleware(config.isProd));

  const heartbeat = setInterval(() => hub.heartbeat(), 15_000);

  return {
    app,
    deps,
    async close() {
      clearInterval(heartbeat);
      hub.close();
      await listener.close();
      await db.end();
    },
  };
}

async function main(): Promise<void> {
  const config = loadConfig();
  const created = await createApp(config);
  const { app, deps } = created;
  const server = app.listen(config.port, () => {
    console.log(`[api] http://localhost:${config.port} (origem: ${config.appOrigins.join(', ')})`);
  });

  let shutting = false;
  const shutdown = (signal: string) => {
    if (shutting) return;
    shutting = true;
    console.log(`[api] ${signal}: closing streams, draining for 10 s`);
    deps.hub.close();
    server.close(() => {
      void created.close().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

import { pathToFileURL } from 'node:url';

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entry || process.env.CJ_API_AUTOSTART === '1') {
  main().catch((e) => {
    console.error('[api] falha ao iniciar:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
