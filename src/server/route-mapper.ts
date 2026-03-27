import { resolve } from 'node:path'
import { normalizePath } from './resolver.js'
import type {
  SmartHMRConfig,
  AffectedRoutesResult,
  GraphStats,
  ScannedFile,
} from '../shared/types.js'
import { scanFiles, rescanFile, getFilePathSet } from './scanner.js'
import { loadPathAliases, type ResolverConfig } from './resolver.js'
import { discoverRoutes } from './routes.js'
import { DependencyGraph } from './dependency-graph.js'

/**
 * RouteMapper is the high-level orchestrator that combines
 * scanning, resolving, route discovery, and the dependency graph
 * into a single queryable interface.
 */
export class RouteMapper {
  private graph: DependencyGraph
  private scannedFiles = new Map<string, ScannedFile>()
  private config: SmartHMRConfig
  private rootDir: string
  private appDir: string
  private resolverConfig!: ResolverConfig

  constructor(rootDir: string, appDir: string, config: SmartHMRConfig) {
    this.rootDir = normalizePath(rootDir)
    this.appDir = normalizePath(appDir)
    this.config = config
    this.graph = new DependencyGraph({
      rootDir: this.rootDir,
      pathAliases: {},
      knownFiles: new Set(),
    })
    this.graph.collapseThreshold = config.collapseThreshold
  }

  /**
   * Performs the initial full build:
   * 1. Load tsconfig path aliases
   * 2. Scan all source files
   * 3. Discover all routes
   * 4. Build the dependency graph
   */
  async build(): Promise<GraphStats> {
    // Load path aliases from tsconfig
    const pathAliases = await loadPathAliases(this.rootDir)

    // Scan all source files
    this.scannedFiles = await scanFiles(
      this.rootDir,
      this.config.include,
      this.config.exclude
    )

    // Build resolver config
    const knownFiles = getFilePathSet(this.scannedFiles)
    this.resolverConfig = {
      rootDir: this.rootDir,
      pathAliases,
      knownFiles,
    }

    // Update graph's resolver config
    this.graph = new DependencyGraph(this.resolverConfig)

    // Discover routes
    const routes = await discoverRoutes(this.appDir)

    // Build the graph
    this.graph.build(this.scannedFiles, routes)

    // Apply route overrides from config
    // (handled at query time, not build time)

    return this.graph.getStats()
  }

  /**
   * Given one or more changed file paths, returns the affected route patterns.
   */
  getAffectedRoutes(changedFiles: string[]): AffectedRoutesResult {
    const normalizedFiles = changedFiles.map(f => normalizePath(f))

    // Check config overrides first
    for (const file of normalizedFiles) {
      const relativePath = file.startsWith(this.rootDir)
        ? file.slice(this.rootDir.length + 1)
        : file

      for (const [pattern, routes] of Object.entries(
        this.config.routeOverrides
      )) {
        if (matchesGlob(relativePath, pattern)) {
          return {
            routes,
            reasons: new Map([[pattern, [`config override: ${pattern}`]]]),
          }
        }
      }
    }

    return this.graph.getAffectedRoutes(normalizedFiles)
  }

  /**
   * Handles a file change event. Re-scans the file and updates the graph.
   */
  async handleFileChange(filePath: string): Promise<void> {
    const normalizedPath = normalizePath(filePath)
    const rescan = await rescanFile(normalizedPath)

    if (rescan) {
      // File still exists — update
      this.scannedFiles.set(normalizedPath, rescan)
      this.resolverConfig.knownFiles = getFilePathSet(this.scannedFiles)
      this.graph.updateKnownFiles(this.resolverConfig.knownFiles)
      this.graph.updateFile(normalizedPath, rescan)
    } else {
      // File was deleted
      this.scannedFiles.delete(normalizedPath)
      this.resolverConfig.knownFiles = getFilePathSet(this.scannedFiles)
      this.graph.updateKnownFiles(this.resolverConfig.knownFiles)
      this.graph.removeFile(normalizedPath)
    }
  }

  /**
   * Handles a new file being created.
   */
  async handleFileAdd(filePath: string): Promise<void> {
    const normalizedPath = normalizePath(filePath)
    const rescan = await rescanFile(normalizedPath)

    if (rescan) {
      this.scannedFiles.set(normalizedPath, rescan)
      this.resolverConfig.knownFiles = getFilePathSet(this.scannedFiles)
      this.graph.updateKnownFiles(this.resolverConfig.knownFiles)
      this.graph.addFile(normalizedPath, rescan)
    }
  }

  getStats(): GraphStats {
    return this.graph.getStats()
  }
}

/**
 * Simple glob matching for config overrides.
 */
function matchesGlob(path: string, pattern: string): boolean {
  if (path === pattern) return true

  const regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '<<GLOB>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<GLOB>>/g, '.*')

  return new RegExp(`^${regexStr}$`).test(path)
}

/**
 * Auto-detects the app directory (src/app or app).
 */
export async function detectAppDir(rootDir: string): Promise<string> {
  const normalizedRoot = normalizePath(rootDir)

  // Try src/app first (most common with modern Next.js)
  const srcAppDir = normalizePath(resolve(normalizedRoot, 'src/app'))
  try {
    const srcAppFile = Bun.file(srcAppDir + '/layout.tsx')
    if (await srcAppFile.exists()) return srcAppDir
  } catch {}
  try {
    const srcAppFile = Bun.file(srcAppDir + '/layout.ts')
    if (await srcAppFile.exists()) return srcAppDir
  } catch {}
  try {
    const srcAppFile = Bun.file(srcAppDir + '/layout.js')
    if (await srcAppFile.exists()) return srcAppDir
  } catch {}

  // Try app/ at root
  const appDir = normalizePath(resolve(normalizedRoot, 'app'))
  try {
    const appFile = Bun.file(appDir + '/layout.tsx')
    if (await appFile.exists()) return appDir
  } catch {}
  try {
    const appFile = Bun.file(appDir + '/layout.ts')
    if (await appFile.exists()) return appDir
  } catch {}

  // Default to src/app
  return srcAppDir
}

/**
 * Loads the optional smart-hmr.config.ts/.js/.json file.
 */
export async function loadConfig(
  rootDir: string
): Promise<Partial<SmartHMRConfig>> {
  const normalizedRoot = normalizePath(rootDir)
  const configNames = [
    'smart-hmr.config.ts',
    'smart-hmr.config.js',
    'smart-hmr.config.mjs',
    'smart-hmr.config.json',
  ]

  for (const name of configNames) {
    const configPath = normalizePath(resolve(normalizedRoot, name))
    try {
      const file = Bun.file(configPath)
      if (await file.exists()) {
        if (name.endsWith('.json')) {
          return JSON.parse(await file.text())
        }
        // For TS/JS configs, use dynamic import
        const mod = await import(configPath)
        return mod.default ?? mod
      }
    } catch {
      continue
    }
  }

  return {}
}
