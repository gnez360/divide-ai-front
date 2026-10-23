import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Carrega `.env` do diretório raiz do monorepo com prioridade sobre o ambiente
 * do shell (a máquina pode ter DATABASE_URL de outro projeto).
 */
export function applyDotEnv(rootDir: string): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(rootDir, '.env'), 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    if (key) process.env[key] = value;
  }
}
