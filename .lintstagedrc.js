module.exports = {
  // TypeScript/JavaScript source files → ESLint + Prettier
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],

  // Node/Config modules → Prettier のみ（ESLint は対象外にする）
  '*.{mjs,cjs,mts,cts}': ['prettier --write'],

  // CSS/SCSS files
  '*.{css,scss}': ['prettier --write'],

  // JSON, Markdown, YAML files
  '*.{json,md,yml,yaml}': ['prettier --write'],

  // TypeScript type checking (run on all TS files when any TS file changes)
  '**/*.{ts,tsx}': () => 'pnpm typecheck',
};
