import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: { NODE_ENV: 'test', DATABASE_URL: 'postgresql://test:test@localhost:5432/test', MAX_UPLOAD_BYTES: '1024', DEMO_MODE: 'true' },
  },
});
