import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

process.env.RAZORPAY_MODE = 'test';
process.env.API_AUTH_TOKEN = 'test-auth-token';
export default defineConfig({
  test: {
    name: 'integration',
    globals: true,
    environment: 'node',
    env: {
      RAZORPAY_MODE: 'test',
      API_AUTH_TOKEN: 'test-auth-token',
      QUEUE_ENABLED: 'true',
      REDIS_URL: 'redis://localhost:6379',
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
});
