export interface StorageObjectInfo {
  size: number;
  contentType: string | null;
  lastModified: Date;
}

/** Adapter de Storage (§10.4, API-11). Implementações: disco (dev/testes) e Supabase (produção). */
export interface StorageAdapter {
  put(key: string, body: Buffer, contentType?: string | null): Promise<void>;
  get(key: string): Promise<Buffer>;
  head(key: string): Promise<StorageObjectInfo | null>;
  remove(key: string): Promise<void>;
  list(prefix: string): Promise<{ key: string; lastModified: Date }[]>;
}
