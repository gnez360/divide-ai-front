import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import type { Config } from '../config.js';
import type { StorageAdapter, StorageObjectInfo } from './types.js';

function safeJoin(root: string, rel: string): string {
  const full = normalize(join(root, rel));
  if (!full.startsWith(normalize(root))) throw new Error('caminho fora do storage');
  return full;
}

export function createFsStorage(config: Config): StorageAdapter {
  const root = config.storageDir;
  return {
    async put(key, body) {
      const target = safeJoin(root, key);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, body);
    },
    async get(key) {
      return readFile(safeJoin(root, key));
    },
    async head(key): Promise<StorageObjectInfo | null> {
      const s = await stat(safeJoin(root, key)).catch(() => null);
      if (!s?.isFile()) return null;
      return { size: s.size, contentType: null, lastModified: s.mtime };
    },
    async remove(key) {
      await rm(safeJoin(root, key), { force: true });
    },
    async list(prefix) {
      const dir = join(root, prefix);
      const files = await readdir(dir).catch(() => [] as string[]);
      const out: { key: string; lastModified: Date }[] = [];
      for (const f of files) {
        const s = await stat(join(dir, f)).catch(() => null);
        if (s?.isFile()) out.push({ key: `${prefix}/${f}`, lastModified: s.mtime });
      }
      return out;
    },
  };
}
