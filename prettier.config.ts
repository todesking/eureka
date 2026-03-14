import type { Config } from 'prettier'

export default {
  semi: true,
  singleQuote: true,
  printWidth: 100,
  trailingComma: 'all',
  tabWidth: 2,
  plugins: ['prettier-plugin-tailwindcss'],
} satisfies Config
