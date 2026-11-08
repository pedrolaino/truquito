import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['src/worker/**'],
        },
      },
      {
        plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })],
        test: {
          name: 'worker',
          include: ['src/worker/**/*.test.ts'],
        },
      },
    ],
  },
})
