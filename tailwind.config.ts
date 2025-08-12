// Minimal Tailwind config to satisfy eslint-plugin-tailwindcss resolution in pre-commit
import type { Config } from 'tailwindcss';

export default {
  content: [],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
