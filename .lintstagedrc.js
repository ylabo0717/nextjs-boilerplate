module.exports = {
  // TypeScript/JavaScript source files → Prettier 先行（基本整形）、ESLint 最後（Tailwind整形）
  '{src,scripts}/**/*.{ts,tsx,js,jsx}': ['prettier --write', 'cross-env CI=true eslint --fix'],

  // Node/Config modules → Prettier のみ（ESLint は対象外にする）
  '**/*.{mjs,cjs,mts,cts}': ['prettier --write'],

  // CSS/SCSS files
  '**/*.{css,scss}': ['prettier --write'],

  // JSON, Markdown files (including root directory)
  '**/*.{json,md}': ['prettier --write'],

  // YAML files - Prettier first, then ESLint for YAML-specific rules
  '**/*.{yml,yaml}': ['prettier --write', 'eslint --fix'],

  // TypeScript type checking (run on all TS files when any TS file changes)
  '**/*.{ts,tsx}': () => 'pnpm typecheck',
};
