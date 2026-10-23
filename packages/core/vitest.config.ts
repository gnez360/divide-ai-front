import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@cj/contracts': path.resolve(__dirname, '../contracts/src/index.ts'),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
