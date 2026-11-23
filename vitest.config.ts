import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    // The simulation engine is pure TypeScript with no DOM dependencies.
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    globals: false,
  },
  resolve: {
    // In the Node test environment we cannot bundle the real React Native package
    // (it is intended for the Metro bundler). Alias it to a tiny stub so modules
    // that import `react-native` (e.g. the theme provider) can be imported in tests.
    // The actual app build via Metro still uses the genuine module.
    alias: {
      'react-native': fileURLToPath(new URL('./src/test/rn-stub.ts', import.meta.url)),
    },
  },
});
