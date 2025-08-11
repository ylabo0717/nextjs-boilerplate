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
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      security: securityPlugin,
      'no-secrets': noSecretsPlugin,
      sonarjs: sonarjsPlugin,
      jsdoc: jsdocPlugin,
      unicorn: unicornPlugin,
    },
    rules: {
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
    },
  },
  ...compat.extends('prettier'),
];

export default eslintConfig;
