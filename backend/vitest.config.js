import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '*.config.js'
      ]
    },
    include: ['tests/**/*.test.js'],
    testTimeout: 10000,
    hookTimeout: 10000,
    setupFiles: ['./tests/setup.js']
  }
});
