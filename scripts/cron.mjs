#!/usr/bin/env node
// Agendador local dos jobs de §14 (substitui o cron-job.org em desenvolvimento).
// Uso: node scripts/cron.mjs [--once] [--job <nome>]
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const envFile = join(root, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const API = process.env.API_URL ?? 'http://localhost:3001';
const SECRET = process.env.CRON_SECRET ?? 'dev-cron-secret';

// intervalos da tabela de §14 (em milissegundos)
const SCHEDULE = [
  ['ocr-sweep', 60_000],
  ['expire-claims', 60_000],
  ['purge-events', 60_000],
  ['purge-presence', 60_000],
  ['purge-operations', 600_000],
  ['product-metrics', 900_000],
  ['purge-images', 3_600_000],
  ['sweep-orphan-images', 86_400_000],
  ['purge-sessions', 86_400_000],
  ['purge-audit-log', 86_400_000],
];

async function fire(job) {
  try {
    const res = await fetch(`${API}/api/cron/${job}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${SECRET}` },
    });
    const body = await res.text();
    console.log(`[cron] ${job} → ${res.status} ${body.slice(0, 200)}`);
  } catch (e) {
    console.error(`[cron] ${job} falhou: ${e.message}`);
  }
}

const args = process.argv.slice(2);
if (args.includes('--once')) {
  const only = args.includes('--job') ? args[args.indexOf('--job') + 1] : null;
  for (const [job] of SCHEDULE) if (!only || job === only) await fire(job);
  process.exit(0);
}

const timers = [];
for (const [job, everyMs] of SCHEDULE) {
  timers.push(setInterval(() => void fire(job), everyMs));
  void fire(job); // primeira leva no boot
}
console.log(`[cron] agendando 10 jobs contra ${API} (Ctrl+C encerra)`);
process.on('SIGINT', () => {
  for (const t of timers) clearInterval(t);
  process.exit(0);
});
