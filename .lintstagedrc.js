module.exports = {
  // TypeScript/JavaScript source files → Prettier 先行（基本整形）、ESLint 最後（Tailwind整形）
  'src/**/*.{ts,tsx,js,jsx}': ['prettier --write', 'cross-env CI=true eslint --fix'],

  // Node/Config modules → Prettier のみ（ESLint は対象外にする）
  '*.{mjs,cjs,mts,cts}': ['prettier --write'],

  // CSS/SCSS files
  '*.{css,scss}': ['prettier --write'],

  // JSON, Markdown, YAML files
  '*.{json,md,yml,yaml}': ['prettier --write'],

  // TypeScript type checking (run on all TS files when any TS file changes)
  '**/*.{ts,tsx}': () => 'pnpm typecheck',
};
