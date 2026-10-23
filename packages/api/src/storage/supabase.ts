import type { Config } from '../config.js';
import type { StorageAdapter, StorageObjectInfo } from './types.js';

/**
 * Supabase Storage (§10.4). Bucket privado; a chave de serviço fica só no servidor.
 * A assinatura de upload (§10.1) ainda é gerada pela própria API (HMAC), então aqui
 * só precisamos das operações autenticadas: get/head/remove/list.
 */
export function createSupabaseStorage(config: Config): StorageAdapter {
  const base = `${config.supabaseUrl.replace(/\/$/, '')}/storage/v1`;
  const bucket = config.supabaseStorageBucket;
  const headers = {
    Authorization: `Bearer ${config.supabaseStorageKey}`,
    apikey: config.supabaseStorageKey,
  };

  const url = (key: string) => `${base}/object/${bucket}/${key}`;

  return {
    async put(key, body, contentType) {
      const res = await fetch(url(key), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': contentType ?? 'application/octet-stream' },
        body: new Uint8Array(body),
      });
      if (!res.ok) throw new Error(`storage put ${res.status}`);
    },

    async get(key) {
      const res = await fetch(url(key), { headers });
      if (!res.ok) throw new Error(`storage get ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    },

    async head(key): Promise<StorageObjectInfo | null> {
      const res = await fetch(url(key), { method: 'HEAD', headers });
      if (res.status === 404 || res.status === 400) return null;
      if (!res.ok) return null;
      const size = Number(res.headers.get('content-length') ?? '0');
      const contentType = res.headers.get('content-type');
      const lastModified = new Date(res.headers.get('last-modified') ?? Date.now());
      return { size, contentType, lastModified };
    },

    async remove(key) {
      // remoção idempotente: objeto inexistente é sucesso (§10.4)
      await fetch(url(key), { method: 'DELETE', headers }).catch(() => {});
    },

    async list(prefix) {
      const res = await fetch(`${base}/object/list/${bucket}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, limit: 1000 }),
      });
      if (!res.ok) return [];
      const rows = (await res.json()) as { name: string; created_at?: string }[];
      return rows.map((r) => ({
        key: prefix ? `${prefix}/${r.name}` : r.name,
        lastModified: new Date(r.created_at ?? Date.now()),
      }));
    },
  };
}
