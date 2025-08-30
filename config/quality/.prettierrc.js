module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  // prettier-plugin-tailwindcss を削除
  // Tailwindクラスの整形はESLint (better-tailwindcss)に一本化
  // plugins: ['prettier-plugin-tailwindcss'],
  // tailwindFunctions: ['clsx', 'cn'],
};
