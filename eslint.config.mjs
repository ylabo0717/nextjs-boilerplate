import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import securityPlugin from 'eslint-plugin-security';
import noSecretsPlugin from 'eslint-plugin-no-secrets';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import unicornPlugin from 'eslint-plugin-unicorn';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import eslintPluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import vitestPlugin from 'eslint-plugin-vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    settings: {
      tailwindcss: {
        // 明示的に Tailwind 設定を指す（pre-commit の解決エラー回避）
        config: 'tailwind.config.ts',
        callees: ['classnames', 'clsx', 'ctl', 'cn', 'cv', 'tw'],
        classRegex: '^(class|className)$',
      },
      // better-tailwindcss 用のエントリポイント（Tailwind v4）
      'better-tailwindcss': {
        entryPoint: 'src/app/globals.css',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      security: securityPlugin,
      'no-secrets': noSecretsPlugin,
      sonarjs: sonarjsPlugin,
      jsdoc: jsdocPlugin,
      unicorn: unicornPlugin,
      'jsx-a11y': jsxA11yPlugin,
      import: importPlugin,
      // tailwindcss: removed (migrated to eslint-plugin-better-tailwindcss)
      'better-tailwindcss': eslintPluginBetterTailwindcss,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // better-tailwindcss 推奨設定（Flat Config互換: rulesのみをマージ）
      ...eslintPluginBetterTailwindcss.configs['recommended-error'].rules,
      // 整形系ルールは段階導入のため一時OFF（CI安定化優先）
      // ローカルでの一括整形は `pnpm lint:tw:fix` を使用
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
      'better-tailwindcss/enforce-consistent-class-order': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'security/detect-object-injection': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-possible-timing-attacks': 'error',
      'no-secrets/no-secrets': 'warn',

      // SonarJS rules - Code quality and complexity
      'sonarjs/cognitive-complexity': ['warn', 15], // Start with warning, tighten later
      'sonarjs/no-duplicate-string': ['warn', { threshold: 3 }],
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-collapsible-if': 'error',
      'sonarjs/prefer-immediate-return': 'warn',
      'sonarjs/no-redundant-jump': 'error',
      'sonarjs/no-unused-collection': 'error',
      'sonarjs/no-use-of-empty-return-value': 'error',

      // JSDoc rules - Documentation quality
      'jsdoc/require-description': 'off', // Optional, enable for stricter docs
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-returns-description': 'warn',
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-param-names': 'error',

      // Unicorn rules - Best practices
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            camelCase: true,
            pascalCase: true,
            kebabCase: true,
          },
        },
      ],
      'unicorn/no-array-reduce': 'warn',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-module': 'off', // Next.js compatibility
      'unicorn/prevent-abbreviations': 'off', // Too strict for now
      'unicorn/no-null': 'off', // React compatibility

      // JSX A11y rules - Accessibility
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/no-access-key': 'error',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/no-distracting-elements': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/scope': 'error',

      // Import rules - Module management
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'next/**',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
            },
          ],
          pathGroupsExcludedImportTypes: ['react', 'next'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'error',
      'import/no-unused-modules': 'warn',
      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      'import/newline-after-import': 'error',
      'import/no-named-as-default': 'warn',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            'tests/**/*',
            '**/*.test.{ts,tsx}',
            '**/*.spec.{ts,tsx}',
            'scripts/**/*',
            'vitest.config.ts',
            'playwright.config.ts',
          ],
        },
      ],

      // old eslint-plugin-tailwindcss rules removed

      // better-tailwindcss - Tailwind v4 対応の正当性チェックを上書き（ignore維持）
      'better-tailwindcss/no-unregistered-classes': [
        'error',
        {
          ignore: ['toaster'],
        },
      ],
      'better-tailwindcss/no-conflicting-classes': 'error',

      // React Hooks rules - Hooks validation
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // Vitest configuration for test files
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    plugins: {
      vitest: vitestPlugin,
    },
    rules: {
      // Vitest rules - Test quality and best practices
      'vitest/no-disabled-tests': 'warn',
      'vitest/no-focused-tests': 'error',
      'vitest/no-identical-title': 'error',
      'vitest/no-commented-out-tests': 'warn',
      'vitest/no-conditional-in-test': 'warn',
      'vitest/no-conditional-tests': 'warn',
      'vitest/no-duplicate-hooks': 'error',
      'vitest/no-test-return-statement': 'error',
      'vitest/prefer-to-be': 'warn',
      'vitest/prefer-to-have-length': 'warn',
      'vitest/prefer-to-contain': 'warn',
      'vitest/prefer-to-be-truthy': 'warn',
      'vitest/prefer-to-be-falsy': 'warn',
      'vitest/prefer-equality-matcher': 'warn',
      'vitest/prefer-strict-equal': 'warn',
      'vitest/prefer-spy-on': 'warn',
      'vitest/prefer-mock-promise-shorthand': 'warn',
      'vitest/prefer-snapshot-hint': 'warn',
      'vitest/require-top-level-describe': 'warn',
      'vitest/consistent-test-it': ['warn', { fn: 'it' }],
      'vitest/expect-expect': 'error',
      'vitest/no-alias-methods': 'warn',
      'vitest/no-interpolation-in-snapshots': 'error',
      'vitest/no-large-snapshots': ['warn', { maxSize: 50 }],
      'vitest/no-test-prefixes': 'error',
      'vitest/valid-describe-callback': 'error',
      'vitest/valid-expect': 'error',
      'vitest/valid-title': 'error',
    },
  },
  ...compat.extends('prettier'),
];

export default eslintConfig;
