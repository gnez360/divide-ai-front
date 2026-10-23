import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { problemMessages } from '@cj/contracts';
import { applyDotEnv } from './util/env.js';

applyDotEnv(resolve(dirname(fileURLToPath(import.meta.url)), '../../..'));

export interface Config {
  port: number;
  databaseUrl: string;
  databaseListenUrl: string;
  appOrigins: string[];
  cronSecret: string;
  joinKeys: Map<string, Buffer>;
  currentKid: string;
  auditKey: Buffer;
  storageDir: string;
  storageProvider: 'fs' | 'supabase';
  supabaseUrl: string;
  supabaseStorageKey: string;
  supabaseStorageBucket: string;
  /** Saltos de proxy confiáveis para req.ip (§12.7): 1 na Vercel, 0 em dev. */
  trustProxyHops: number;
  isProd: boolean;
}

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(problemMessages.envVarMissing(name));
  return v;
}

/** Em dev local os segredos têm default; em produção a inicialização falha se faltar (Apêndice B). */
export function loadConfig(): Config {
  const isProd = process.env.NODE_ENV === 'production';
  const defaultKeys = JSON.stringify({
    dev: '2f8c1e4a9b7d6053c1a2e8f4b9d7c3a05e6f1d2b3c4a5e6f708192a3b4c5d6e7',
  });
  const keysRaw = isProd
    ? required('JOIN_TOKEN_KEYS')
    : (process.env.JOIN_TOKEN_KEYS ?? defaultKeys);
  const keysObj = JSON.parse(keysRaw) as Record<string, string>;
  const joinKeys = new Map<string, Buffer>();
  for (const [kid, hex] of Object.entries(keysObj)) joinKeys.set(kid, Buffer.from(hex, 'hex'));
  const currentKid = isProd
    ? required('JOIN_TOKEN_CURRENT_KID')
    : (process.env.JOIN_TOKEN_CURRENT_KID ?? Object.keys(keysObj)[0]!);
  if (!joinKeys.has(currentKid)) throw new Error(problemMessages.unknownJoinTokenKid(currentKid));

  const storageProvider = (process.env.STORAGE_PROVIDER ?? (isProd ? 'supabase' : 'fs')) as
    'fs' | 'supabase';
  if (storageProvider !== 'fs' && storageProvider !== 'supabase')
    throw new Error(problemMessages.envVarMissing('STORAGE_PROVIDER'));

  return {
    port: Number(process.env.PORT ?? 3001),
    databaseUrl: required('DATABASE_URL', 'postgres://app:app@localhost:5433/conta_juntos'),
    databaseListenUrl: required(
      'DATABASE_LISTEN_URL',
      process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5433/conta_juntos',
    ),
    appOrigins: (process.env.APP_ORIGINS ?? process.env.APP_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    cronSecret: required('CRON_SECRET', 'dev-cron-secret'),
    joinKeys,
    currentKid,
    auditKey: Buffer.from(required('AUDIT_HMAC_KEY', '6f3a91c8d2e74b05a1f6c9d8e7b4a201'), 'hex'),
    storageDir: resolve(process.env.STORAGE_DIR ?? 'var/storage'),
    storageProvider,
    supabaseUrl: required('SUPABASE_URL', 'http://localhost:54321'),
    supabaseStorageKey: required('SUPABASE_STORAGE_KEY', 'dev-storage-key'),
    supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'receipts',
    trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? (process.env.VERCEL ? 1 : 0)),
    isProd,
  };
}
