// Aplica db/migrations/*.sql na ordem, registrando em app.schema_migrations.
// Uso: node db/migrate.mjs   (lê DATABASE_URL do ambiente ou usa o default local)
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

// `.env` da raiz tem prioridade sobre o ambiente do shell
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
try {
  for (const line of readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq > 0) process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
} catch {
  /* sem .env */
}

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5433/conta_juntos';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  await client
    .query(
      'create table if not exists app.schema_migrations (name text primary key, applied_at timestamptz not null default now())',
    )
    .catch(async () => {
      await client.query('create schema if not exists app');
      await client.query(
        'create table if not exists app.schema_migrations (name text primary key, applied_at timestamptz not null default now())',
      );
    });
  const done = new Set(
    (await client.query('select name from app.schema_migrations')).rows.map((r) => r.name),
  );
  for (const f of files) {
    if (done.has(f)) {
      console.log('skip  ', f);
      continue;
    }
    const sql = readFileSync(path.join(dir, f), 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into app.schema_migrations (name) values ($1)', [f]);
      await client.query('commit');
      console.log('apply ', f);
    } catch (e) {
      await client.query('rollback');
      throw e;
    }
  }
  console.log('migrations ok');
} finally {
  await client.end();
}
