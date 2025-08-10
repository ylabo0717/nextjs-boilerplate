import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    globals: true,
    passWithNoTests: true,
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
    coverage: {
      provider: 'v8',
      include: [
        'lib/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'features/**/*.{ts,tsx}',
        'services/**/*.{ts,tsx}',
        'stores/**/*.{ts,tsx}',
        'repositories/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.{test,spec}.*',
        '**/__tests__/**',
        '**/__mocks__/**',
        'tests/**',
        'node_modules/**',
        '.next/**',
        'coverage/**',
        // Exclude specific App Router files that don't need coverage
        'app/**/layout.tsx',
        'app/**/page.tsx',
        'app/**/loading.tsx',
        'app/**/error.tsx',
        'app/**/not-found.tsx',
        'app/**/template.tsx',
        'app/**/global-error.tsx',
        'app/**/*.css',
        'components/**',
        'types/**',
        'constants/**',
        '**/*.config.*',
        'vitest.setup.*',
      ],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
});
