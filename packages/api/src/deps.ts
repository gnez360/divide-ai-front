import type { Config } from './config.js';
import type { Db } from './db.js';
import type { SseHub } from './sse/hub.js';
import type { StorageAdapter } from './storage/types.js';

export interface AppDeps {
  db: Db;
  config: Config;
  hub: SseHub;
  storage: StorageAdapter;
  ready: { listen: boolean };
}
