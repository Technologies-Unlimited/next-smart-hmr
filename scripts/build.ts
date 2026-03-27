/**
 * Build script for next-smart-hmr.
 *
 * 1. Runs tsc to compile TS → JS + declarations
 * 2. Restores 'use client' directives that tsc strips from output
 * 3. Adds shebang to CLI entry point
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = import.meta.dir.replace('/scripts', '').replace('\\scripts', '')
const SRC = join(ROOT, 'src')
const DIST = join(ROOT, 'dist')

// Step 1: Clean dist
console.log('[build] Cleaning dist/')
execSync(`rm -rf "${DIST}"`, { cwd: ROOT })

// Step 2: Compile with tsc
console.log('[build] Compiling with tsc...')
try {
  execSync('bun node_modules/.bin/tsc', { cwd: ROOT, stdio: 'inherit' })
} catch {
  console.error('[build] tsc failed')
  process.exit(1)
}

// Step 3: Restore 'use client' directives
// tsc strips them, but Next.js needs them in the compiled output
console.log('[build] Restoring directives...')

const CLIENT_DIRECTIVE_FILES = new Map<string, string>()

function scanForDirectives(dir: string) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      scanForDirectives(fullPath)
      continue
    }
    if (!['.ts', '.tsx'].includes(extname(entry))) continue

    const content = readFileSync(fullPath, 'utf-8')
    const firstLine = content.trimStart().split('\n')[0].trim()

    if (firstLine === "'use client'" || firstLine === '"use client"') {
      // Map src path to dist path
      const relativePath = fullPath
        .replace(SRC, '')
        .replace(/\.tsx?$/, '.js')
      CLIENT_DIRECTIVE_FILES.set(relativePath, "'use client'")
    }
    if (firstLine === "'use server'" || firstLine === '"use server"') {
      const relativePath = fullPath
        .replace(SRC, '')
        .replace(/\.tsx?$/, '.js')
      CLIENT_DIRECTIVE_FILES.set(relativePath, "'use server'")
    }
  }
}

scanForDirectives(SRC)

for (const [relativePath, directive] of CLIENT_DIRECTIVE_FILES) {
  const distPath = join(DIST, relativePath)
  try {
    const content = readFileSync(distPath, 'utf-8')
    if (!content.startsWith(directive)) {
      writeFileSync(distPath, `${directive};\n${content}`)
      console.log(`  ✓ ${relativePath} → ${directive}`)
    }
  } catch {
    console.warn(`  ⚠ Could not find ${distPath}`)
  }
}

// Step 4: Add shebang to CLI
console.log('[build] Adding CLI shebang...')
const cliBinPath = join(DIST, 'cli', 'bin.js')
try {
  const cliContent = readFileSync(cliBinPath, 'utf-8')
  if (!cliContent.startsWith('#!')) {
    writeFileSync(cliBinPath, `#!/usr/bin/env bun\n${cliContent}`)
    console.log('  ✓ dist/cli/bin.js → shebang added')
  }
} catch {
  console.warn('  ⚠ Could not find CLI bin')
}

console.log('[build] Done!')
