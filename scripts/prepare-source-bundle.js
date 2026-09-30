// Stages the editable source that the installer ships (Settings > Customize)
// into build/source-bundle, which electron-builder.yml copies to
// resources/source. Done here instead of an extraResources entry with
// `from: .`, which (verified) makes electron-builder drop package.json from
// app.asar and fail the packaging sanity check.
const { cpSync, existsSync, mkdirSync, rmSync } = require('fs')
const { join } = require('path')

const root = join(__dirname, '..')
const target = join(root, 'build', 'source-bundle')

const include = [
  'src',
  'drizzle',
  'scripts',
  'e2e',
  'docs',
  'build/icon.ico',
  'build/icon.png',
  'package.json',
  'package-lock.json',
  'electron.vite.config.ts',
  'electron-builder.yml',
  'drizzle.config.ts',
  'tailwind.config.ts',
  'postcss.config.cjs',
  'tsconfig.json',
  'tsconfig.node.json',
  'tsconfig.web.json',
  'vitest.config.ts',
  'playwright.config.ts',
  'README.md',
  'CHANGELOG.md',
  '.gitignore'
]

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })

for (const entry of include) {
  const from = join(root, entry)
  if (!existsSync(from)) continue
  const to = join(target, entry)
  mkdirSync(join(to, '..'), { recursive: true })
  cpSync(from, to, { recursive: true })
}

console.log(`Source bundle staged at ${target}`)
