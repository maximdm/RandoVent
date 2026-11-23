import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The simulation engine is pure TypeScript with no DOM dependencies.
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    globals: false,
  },
});
