import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // tsconfig maps @friday/types to the .d.ts (types only). Point the test
      // runner at the real ESM build so runtime values (enums, constants,
      // helpers) resolve in specs.
      '@friday/types': fileURLToPath(
        new URL('../packages/types/dist/index.mjs', import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
