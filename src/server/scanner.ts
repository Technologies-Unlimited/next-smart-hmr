import { Glob } from 'bun'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ParsedImport, ScannedFile } from '../shared/types.js'
import { normalizePath } from './resolver.js'

// Matches static imports:
//   import X from './client'
//   import { A, B } from '@/lib/auth'
//   import type { X } from '@/types/...'
//   import '@/lib/initialize-tracking'
//   import styles from './layout.module.css'
const STATIC_IMPORT_RE =
  /(?:^|\n)\s*import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/gm

// Matches re-exports:
//   export * from '@/hooks/administration/...'
//   export { X } from '...'
const REEXPORT_RE =
  /(?:^|\n)\s*export\s+(?:\*|{[^}]*})\s+from\s+['"]([^'"]+)['"]/gm

// Matches dynamic imports:
//   import('./client')
//   import("@/lib/auth")
const DYNAMIC_IMPORT_RE = /import\(\s*['"]([^'"]+)['"]\s*\)/g

// Matches type-only imports specifically (to tag them)
const TYPE_IMPORT_RE =
  /(?:^|\n)\s*import\s+type\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/gm

// Directive detection: 'use client' or 'use server'
const DIRECTIVE_RE = /^['"]use (client|server)['"]/

/**
 * Parses all import specifiers from a TypeScript/JavaScript source file.
 */
function parseImports(source: string): {
  imports: ParsedImport[]
  boundary: 'server' | 'client' | null
} {
  const imports: ParsedImport[] = []
  const seenSpecifiers = new Set<string>()

  // Detect boundary directive from first meaningful line
  let boundary: 'server' | 'client' | null = null
  const lines = source.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue
    const match = DIRECTIVE_RE.exec(trimmed)
    if (match) {
      boundary = match[1] as 'server' | 'client'
    }
    break
  }

  // Collect type-only imports into a set for tagging
  const typeOnlySpecifiers = new Set<string>()
  let typeMatch: RegExpExecArray | null
  TYPE_IMPORT_RE.lastIndex = 0
  while ((typeMatch = TYPE_IMPORT_RE.exec(source)) !== null) {
    typeOnlySpecifiers.add(typeMatch[1])
  }

  // Parse static imports
  STATIC_IMPORT_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = STATIC_IMPORT_RE.exec(source)) !== null) {
    const specifier = match[1]
    if (!seenSpecifiers.has(specifier)) {
      seenSpecifiers.add(specifier)
      imports.push({
        specifier,
        isDynamic: false,
        isTypeOnly: typeOnlySpecifiers.has(specifier),
      })
    }
  }

  // Parse re-exports
  REEXPORT_RE.lastIndex = 0
  while ((match = REEXPORT_RE.exec(source)) !== null) {
    const specifier = match[1]
    if (!seenSpecifiers.has(specifier)) {
      seenSpecifiers.add(specifier)
      imports.push({
        specifier,
        isDynamic: false,
        isTypeOnly: false,
      })
    }
  }

  // Parse dynamic imports
  DYNAMIC_IMPORT_RE.lastIndex = 0
  while ((match = DYNAMIC_IMPORT_RE.exec(source)) !== null) {
    const specifier = match[1]
    if (!seenSpecifiers.has(specifier)) {
      seenSpecifiers.add(specifier)
      imports.push({
        specifier,
        isDynamic: true,
        isTypeOnly: false,
      })
    }
  }

  return { imports, boundary }
}

/**
 * Returns true if the specifier looks like a project-local import
 * (relative path or path alias), not an external npm package.
 */
function isLocalImport(specifier: string): boolean {
  if (specifier.startsWith('./') || specifier.startsWith('../')) return true
  if (specifier.startsWith('@/')) return true
  // Could be a custom alias like '~/' — we handle this via the aliases map
  return false
}

/**
 * Scans all TypeScript/JavaScript files in the given directories,
 * reads their content, and parses their imports.
 */
export async function scanFiles(
  rootDir: string,
  includePatterns: string[],
  excludePatterns: string[]
): Promise<Map<string, ScannedFile>> {
  const files = new Map<string, ScannedFile>()
  const filePaths: string[] = []

  // Discover files
  for (const pattern of includePatterns) {
    const fullPattern = pattern.endsWith('/**')
      ? `${pattern}/*.{ts,tsx,js,jsx}`
      : `${pattern}.{ts,tsx,js,jsx}`
    const glob = new Glob(fullPattern)
    for await (const path of glob.scan({ cwd: rootDir, absolute: true })) {
      // Check exclusions
      const relativePath = path.slice(rootDir.length + 1).replace(/\\/g, '/')
      const excluded = excludePatterns.some(ex => {
        if (ex.includes('*')) {
          const regexStr = ex
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '<<GLOB>>')
            .replace(/\*/g, '[^/]*')
            .replace(/<<GLOB>>/g, '.*')
          return new RegExp(`^${regexStr}$`).test(relativePath)
        }
        return relativePath.includes(ex)
      })
      if (!excluded) {
        filePaths.push(path)
      }
    }
  }

  // Read all files in parallel
  const entries = await Promise.all(
    filePaths.map(async (filePath) => {
      const normalizedPath = normalizePath(filePath)
      const file = Bun.file(normalizedPath)
      const [content, fileStat] = await Promise.all([
        file.text(),
        stat(normalizedPath),
      ])
      const { imports: rawImports, boundary } = parseImports(content)

      // Filter to only local imports
      const localImports = rawImports.filter(imp => isLocalImport(imp.specifier))

      const scanned: ScannedFile = {
        filePath: normalizedPath,
        imports: localImports,
        boundary,
        mtimeMs: fileStat.mtimeMs,
      }
      return [normalizedPath, scanned] as const
    })
  )

  for (const [path, scanned] of entries) {
    files.set(path, scanned)
  }

  return files
}

/**
 * Re-scans a single file and returns its updated ScannedFile entry.
 */
export async function rescanFile(filePath: string): Promise<ScannedFile | null> {
  const normalizedPath = normalizePath(filePath)
  try {
    const file = Bun.file(normalizedPath)
    const [content, fileStat] = await Promise.all([
      file.text(),
      stat(normalizedPath),
    ])
    const { imports: rawImports, boundary } = parseImports(content)
    const localImports = rawImports.filter(imp => isLocalImport(imp.specifier))

    return {
      filePath: normalizedPath,
      imports: localImports,
      boundary,
      mtimeMs: fileStat.mtimeMs,
    }
  } catch {
    return null
  }
}

/**
 * Returns the set of all discovered file paths (for fast existence checks in the resolver).
 */
export function getFilePathSet(files: Map<string, ScannedFile>): Set<string> {
  return new Set(files.keys())
}
