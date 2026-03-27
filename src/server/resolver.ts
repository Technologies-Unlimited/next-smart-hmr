import { resolve, dirname, join } from 'node:path'
import posix from 'node:path/posix'

/**
 * Normalizes a file path for consistent comparison:
 * forward slashes, lowercase drive letter on Windows.
 */
export function normalizePath(p: string): string {
  let n = p.replace(/\\/g, '/')
  // Lowercase Windows drive letter: C:/ → c:/
  if (/^[A-Z]:\//.test(n)) {
    n = n[0].toLowerCase() + n.slice(1)
  }
  return n
}

/**
 * Strips single-line (//) and multi-line comments from JSON,
 * respecting string boundaries so // inside strings is preserved.
 */
function stripJsonComments(source: string): string {
  let result = ''
  let inString = false
  let escapeNext = false

  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    const next = source[i + 1]

    if (escapeNext) {
      result += ch
      escapeNext = false
      continue
    }

    if (inString) {
      if (ch === '\\') {
        escapeNext = true
        result += ch
        continue
      }
      if (ch === '"') {
        inString = false
      }
      result += ch
      continue
    }

    // Not in a string
    if (ch === '"') {
      inString = true
      result += ch
      continue
    }

    // Single-line comment
    if (ch === '/' && next === '/') {
      // Skip until end of line
      while (i < source.length && source[i] !== '\n') i++
      result += '\n' // preserve line structure
      continue
    }

    // Multi-line comment
    if (ch === '/' && next === '*') {
      i += 2
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') result += '\n' // preserve line count
        i++
      }
      i++ // skip the closing /
      continue
    }

    result += ch
  }

  return result
}

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx']
const INDEX_FILES = EXTENSIONS.map(ext => `index${ext}`)

export interface ResolverConfig {
  rootDir: string
  pathAliases: Record<string, string>
  knownFiles: Set<string>
}

/**
 * Reads tsconfig.json and extracts path alias mappings.
 * Converts { "@/*": ["./src/*"] } into { "@/": "/abs/path/src/" }
 */
export async function loadPathAliases(
  rootDir: string
): Promise<Record<string, string>> {
  const aliases: Record<string, string> = {}
  const normalizedRoot = normalizePath(rootDir)

  try {
    const tsconfigPath = join(normalizedRoot, 'tsconfig.json')
    const content = await Bun.file(tsconfigPath).text()

    // Strip comments while respecting string values (// inside strings is NOT a comment)
    const stripped = stripJsonComments(content)
    // Remove trailing commas before } or ]
    const cleaned = stripped.replace(/,\s*([}\]])/g, '$1')

    const tsconfig = JSON.parse(cleaned)
    const paths = tsconfig?.compilerOptions?.paths

    if (paths) {
      for (const [aliasPattern, targetPatterns] of Object.entries(paths)) {
        const targets = targetPatterns as string[]
        if (targets.length > 0) {
          // Convert "@/*" → "@/" and "./src/*" → "/abs/src/"
          const aliasPrefix = aliasPattern.replace(/\*$/, '')
          const targetPath = targets[0].replace(/\*$/, '')
          const absoluteTarget = normalizePath(resolve(normalizedRoot, targetPath))
          aliases[aliasPrefix] = absoluteTarget.endsWith('/')
            ? absoluteTarget
            : absoluteTarget + '/'
        }
      }
    }
  } catch {
    // No tsconfig or parsing error — proceed without aliases
  }

  return aliases
}

/**
 * Resolves an import specifier to an absolute file path.
 * Returns null if the specifier can't be resolved (e.g., external package).
 */
export function resolveImport(
  specifier: string,
  importerPath: string,
  config: ResolverConfig
): string | null {
  let basePath: string | null = null

  // 1. Check path aliases
  for (const [aliasPrefix, aliasTarget] of Object.entries(config.pathAliases)) {
    if (specifier.startsWith(aliasPrefix)) {
      const remainder = specifier.slice(aliasPrefix.length)
      basePath = aliasTarget + remainder
      break
    }
  }

  // 2. Relative imports (use posix.resolve to avoid Windows drive-letter issues)
  if (!basePath && (specifier.startsWith('./') || specifier.startsWith('../'))) {
    const importerDir = posix.dirname(normalizePath(importerPath))
    basePath = posix.resolve(importerDir, specifier)
  }

  if (!basePath) return null

  // Normalize
  basePath = normalizePath(basePath)

  // 3. Try exact match (if it already has an extension)
  if (config.knownFiles.has(basePath)) return basePath

  // 4. Try appending extensions
  for (const ext of EXTENSIONS) {
    const candidate = basePath + ext
    if (config.knownFiles.has(candidate)) return candidate
  }

  // 5. Try as directory with index file
  for (const indexFile of INDEX_FILES) {
    const candidate = basePath.endsWith('/')
      ? basePath + indexFile
      : basePath + '/' + indexFile
    if (config.knownFiles.has(candidate)) return candidate
  }

  // 6. Try stripping a trailing extension and re-resolving
  // (handles cases like `import './foo.js'` where the actual file is `foo.ts`)
  const extMatch = basePath.match(/\.(ts|tsx|js|jsx|mjs|cjs)$/)
  if (extMatch) {
    const withoutExt = basePath.slice(0, -extMatch[0].length)
    for (const ext of EXTENSIONS) {
      const candidate = withoutExt + ext
      if (config.knownFiles.has(candidate)) return candidate
    }
  }

  return null
}
