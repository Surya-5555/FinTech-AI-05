import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import path from 'path';
import { fileURLToPath } from 'url';

export default defineConfig({
  test: {
    include: ['test/**/*.e2e.test.ts', 'test/**/*.e2e-spec.ts'],
    globals: true,
    environment: 'node',
    server: {
      deps: {
        inline: [/@rr\/.*/],
      },
    },
  },
  resolve: {
    alias: {
      '@rr/persistence': fileURLToPath(new URL('./test/__mocks__/persistence.ts', import.meta.url)),
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
