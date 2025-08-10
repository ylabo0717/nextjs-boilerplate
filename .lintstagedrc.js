module.exports = {
  // TypeScript/JavaScript files
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],

  // CSS/SCSS files
  '*.{css,scss}': ['prettier --write'],

  // JSON, Markdown, YAML files
  '*.{json,md,yml,yaml}': ['prettier --write'],

  // TypeScript type checking (run on all TS files when any TS file changes)
  '**/*.{ts,tsx}': () => 'pnpm typecheck',
};
