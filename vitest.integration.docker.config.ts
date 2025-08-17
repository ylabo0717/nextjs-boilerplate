import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // globalSetupを無効化（TestcontainersはDocker-in-Docker環境では動作しない）
    // globalSetup: ['./tests/setup/vitest-global-setup.ts'],
    css: true,
    globals: true,
    passWithNoTests: true,
    include: ['tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/tests/e2e/**',
      '**/tests/unit/**',
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
        'src/components/features/**/*.{ts,tsx}',
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
        'src/app/**/layout.tsx',
        'src/app/**/page.tsx',
        'src/app/**/loading.tsx',
        'src/app/**/error.tsx',
        'src/app/**/not-found.tsx',
        'src/app/**/template.tsx',
        'src/app/**/global-error.tsx',
        'src/app/**/*.css',
        'src/components/ui/**',
        'src/components/layout/**',
        'src/types/**',
        'src/constants/**',
        '**/*.config.*',
        'vitest.setup.*',
      ],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage/integration',
    },
  },
});
