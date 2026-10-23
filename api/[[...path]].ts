import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp, type App } from '../packages/api/src/server.js';

/**
 * Função Node da Vercel (§16.2): embrulha o Express do @cj/api.
 * Init lazy por instância — o primeiro request paga o cold start e os
 * demais reaproveitam (pool de banco + LISTEN/NOTIFY já estabelecidos).
 */
let created: Promise<App> | undefined;

function appOf(): Promise<App> {
  created ??= createApp();
  created.catch(() => {
    // falha no init (ex.: banco fora) não fica em cache: a próxima tentativa refaz
    created = undefined;
  });
  return created;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { app } = await appOf();
  app(req, res);
}

export const config = { maxDuration: 300 };
