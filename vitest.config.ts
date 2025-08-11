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
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/tests/e2e/**', // Exclude Playwright E2E tests
    ],
    alias: {
      '@': fileURLToPath(new URL('./src/', import.meta.url)),
    },
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/**/*.{ts,tsx}',
        'src/hooks/**/*.{ts,tsx}',
        'src/features/**/*.{ts,tsx}',
        'src/services/**/*.{ts,tsx}',
        'src/stores/**/*.{ts,tsx}',
        'src/repositories/**/*.{ts,tsx}',
        'src/utils/**/*.{ts,tsx}',
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
        'src/app/**/layout.tsx',
        'src/app/**/page.tsx',
        'src/app/**/loading.tsx',
        'src/app/**/error.tsx',
        'src/app/**/not-found.tsx',
        'src/app/**/template.tsx',
        'src/app/**/global-error.tsx',
        'src/app/**/*.css',
        'src/components/**',
        'src/types/**',
        'src/constants/**',
        '**/*.config.*',
        'vitest.setup.*',
      ],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
});
