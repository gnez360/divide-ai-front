#!/usr/bin/env node
// Sobe tudo para desenvolvimento local: Postgres (Docker) + migrações + API + web.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function loadDotEnv() {
  const file = join(root, '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
loadDotEnv();

const isWin = process.platform === 'win32';

function runSync(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: isWin, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function run(cmd, args, opts = {}) {
  return spawn(cmd, args, { cwd: root, stdio: 'inherit', shell: isWin, ...opts });
}

// 1. banco
runSync('docker', ['compose', '-f', 'infra/docker-compose.yml', 'up', '-d']);

const dbUrl = process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5433/conta_juntos';
console.log(`[dev] aguardando Postgres em ${dbUrl.replace(/:[^:@/]+@/, ':***@')}...`);
for (let i = 0; i < 60; i++) {
  const ready = spawnSync(
    'docker',
    ['exec', 'cj-postgres', 'pg_isready', '-U', 'app', '-d', 'conta_juntos'],
    {
      encoding: 'utf8',
    },
  );
  if (String(ready.stdout ?? '').includes('accepting')) break;
  if (i === 59) {
    console.error('[dev] Postgres não respondeu; abortando.');
    process.exit(1);
  }
  spawnSync('node', ['-e', 'setTimeout(()=>{},2000)']);
}
runSync('node', ['db/migrate.mjs']);

// 2. processos
const procs = [];
function start(name, cmd, args, opts = {}) {
  const p = run(cmd, args, opts);
  p.on('exit', (code, signal) => {
    console.log(`[dev] ${name} encerrou (${signal ?? code})`);
    shutdown(code ?? 0);
  });
  procs.push({ name, p });
}

let shutting = false;
function shutdown(code = 0) {
  if (shutting) return;
  shutting = true;
  for (const { p } of procs) if (!p.killed) p.kill('SIGTERM');
  setTimeout(() => process.exit(code), 500);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start('api', 'npm', ['run', 'dev', '-w', '@cj/api']);
if (existsSync(join(root, 'apps/web/package.json'))) {
  start('web', 'npm', ['run', 'dev', '-w', '@cj/web']);
}
console.log(
  '[dev] API em http://localhost:3001 · web em http://localhost:5173 (Ctrl+C encerra tudo)',
);
