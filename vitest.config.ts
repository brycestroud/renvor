import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

// Mirrors the @shared/@main path aliases from electron.vite.config.ts /
// tsconfig.node.json so test files that transitively import through them
// (e.g. legacyImport.ts -> db/client.ts -> @shared/paths) resolve under
// vitest too, not just under the real electron-vite build.
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@main': resolve('src/main')
    }
  },
  test: {
    // e2e/ holds Playwright specs (run via `npm run test:e2e`), not vitest
    // tests - Playwright's own `test` global isn't vitest-compatible.
    exclude: ['node_modules/**', 'e2e/**']
  }
})
