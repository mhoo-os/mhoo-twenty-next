import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/retain-new-chase-checking.test.ts'],
  },
});
