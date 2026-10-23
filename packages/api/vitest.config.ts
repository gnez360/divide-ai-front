import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@cj/contracts': r('../contracts/src/index.ts'),
      '@cj/core': r('../core/src/index.ts'),
      '@cj/ocr': r('../ocr/src/index.ts'),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
