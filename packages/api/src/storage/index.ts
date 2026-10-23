import type { Config } from '../config.js';
import { createFsStorage } from './fs.js';
import { createSupabaseStorage } from './supabase.js';
import type { StorageAdapter } from './types.js';

/** Factory do adapter de Storage (API-11). Backend escolhido em runtime (STORAGE_PROVIDER). */
export function createStorage(config: Config): StorageAdapter {
  switch (config.storageProvider) {
    case 'supabase':
      return createSupabaseStorage(config);
    case 'fs':
    default:
      return createFsStorage(config);
  }
}

export type { StorageAdapter, StorageObjectInfo } from './types.js';
