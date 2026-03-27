import { dirname } from 'node:path'
import { normalizePath } from './resolver.js'
import type {
  ScannedFile,
  RouteEntry,
  AffectedRoutesResult,
  GraphStats,
} from '../shared/types.js'
import { resolveImport, type ResolverConfig } from './resolver.js'
import { isLayoutFile, isRouteEntry, isApiEntry } from './routes.js'

export class DependencyGraph {
  // Forward edges: file → set of files it imports
  private forward = new Map<string, Set<string>>()

  // Reverse edges: file → set of files that import it
  private reverse = new Map<string, Set<string>>()

  // Cached: file → set of affected route IDs
  private fileToRoutesCache = new Map<string, Set<string>>()

  // Route manifest
  private routes = new Map<string, RouteEntry>()

  // Reverse lookup: entry file path → route ID
  private entryFileToRouteId = new Map<string, string>()

  // Layout file path → set of descendant route IDs
  private layoutToDescendantRoutes = new Map<string, Set<string>>()

  // Resolver config
  private resolverConfig: ResolverConfig

  // Build timing
  private buildTimeMs = 0

  // Collapse threshold — fraction of routes before broadcasting '*'
  collapseThreshold = 0.75

  constructor(resolverConfig: ResolverConfig) {
    this.resolverConfig = resolverConfig
  }

  /**
   * Builds the full dependency graph from scanned files and discovered routes.
   */
  build(
    scannedFiles: Map<string, ScannedFile>,
    routes: Map<string, RouteEntry>
  ): void {
    const startTime = performance.now()

    this.forward.clear()
    this.reverse.clear()
    this.fileToRoutesCache.clear()
    this.routes = routes
    this.entryFileToRouteId.clear()
    this.layoutToDescendantRoutes.clear()

    // Build route lookups
    for (const [routeId, route] of routes) {
      this.entryFileToRouteId.set(route.entryFile, routeId)

      // Map co-located files to the same route
      for (const colocatedFile of route.colocatedFiles) {
        this.entryFileToRouteId.set(colocatedFile, routeId)
      }
    }

    // Build layout → descendant routes mapping
    for (const [routeId, route] of routes) {
      for (const layoutPath of route.layouts) {
        let descendants = this.layoutToDescendantRoutes.get(layoutPath)
        if (!descendants) {
          descendants = new Set()
          this.layoutToDescendantRoutes.set(layoutPath, descendants)
        }
        descendants.add(routeId)
      }
    }

    // Build forward and reverse edges
    for (const [filePath, scannedFile] of scannedFiles) {
      const forwardSet = new Set<string>()

      for (const imp of scannedFile.imports) {
        const resolved = resolveImport(
          imp.specifier,
          filePath,
          this.resolverConfig
        )
        if (resolved) {
          forwardSet.add(resolved)

          // Add reverse edge
          let reverseSet = this.reverse.get(resolved)
          if (!reverseSet) {
            reverseSet = new Set()
            this.reverse.set(resolved, reverseSet)
          }
          reverseSet.add(filePath)
        }
      }

      this.forward.set(filePath, forwardSet)
    }

    this.buildTimeMs = performance.now() - startTime
  }

  /**
   * Given a set of changed file paths, returns the route IDs that are affected.
   *
   * Algorithm: Walk the reverse graph (importers) from each changed file up
   * until we reach route entry points (page.tsx) or layout files.
   */
  getAffectedRoutes(changedFiles: string[]): AffectedRoutesResult {
    const affectedRoutes = new Set<string>()
    const reasons = new Map<string, string[]>()

    for (const changedFile of changedFiles) {
      const normalizedChanged = normalizePath(changedFile)
      const visited = new Set<string>()
      const stack = [normalizedChanged]

      while (stack.length > 0) {
        const current = stack.pop()!
        if (visited.has(current)) continue
        visited.add(current)

        // Check if this file IS a route entry point (page.tsx)
        const routeId = this.entryFileToRouteId.get(current)
        if (routeId) {
          affectedRoutes.add(routeId)
          addReason(reasons, routeId, `imports ${normalizedChanged}`)
        }

        // Check if this file is a layout — affects all descendant routes
        if (isLayoutFile(current)) {
          const descendants = this.layoutToDescendantRoutes.get(current)
          if (descendants) {
            for (const descendantRouteId of descendants) {
              affectedRoutes.add(descendantRouteId)
              addReason(
                reasons,
                descendantRouteId,
                `layout ${current} changed`
              )
            }
          }
        }

        // Walk up the reverse graph — who imports this file?
        const importers = this.reverse.get(current)
        if (importers) {
          for (const importer of importers) {
            if (!visited.has(importer)) {
              stack.push(importer)
            }
          }
        }
      }
    }

    // Convert route IDs to route patterns
    const routePatterns = routesToPatterns(affectedRoutes, this.routes, this.collapseThreshold)

    return {
      routes: routePatterns,
      reasons,
    }
  }

  /**
   * Incrementally updates the graph when a file's content changes.
   * Re-resolves its imports and updates forward/reverse edges.
   */
  updateFile(filePath: string, newScannedFile: ScannedFile): void {
    const normalizedPath = normalizePath(filePath)

    // Get old forward edges
    const oldForward = this.forward.get(normalizedPath) ?? new Set<string>()

    // Compute new forward edges
    const newForward = new Set<string>()
    for (const imp of newScannedFile.imports) {
      const resolved = resolveImport(
        imp.specifier,
        normalizedPath,
        this.resolverConfig
      )
      if (resolved) newForward.add(resolved)
    }

    // Remove old reverse edges that are no longer valid
    for (const oldTarget of oldForward) {
      if (!newForward.has(oldTarget)) {
        this.reverse.get(oldTarget)?.delete(normalizedPath)
      }
    }

    // Add new reverse edges
    for (const newTarget of newForward) {
      if (!oldForward.has(newTarget)) {
        let reverseSet = this.reverse.get(newTarget)
        if (!reverseSet) {
          reverseSet = new Set()
          this.reverse.set(newTarget, reverseSet)
        }
        reverseSet.add(normalizedPath)
      }
    }

    // Update forward edges
    this.forward.set(normalizedPath, newForward)

    // Invalidate cache for this file and all files reachable via reverse graph
    this.invalidateCache(normalizedPath)
  }

  /**
   * Adds a new file to the graph.
   */
  addFile(filePath: string, scannedFile: ScannedFile): void {
    const normalizedPath = normalizePath(filePath)
    this.forward.set(normalizedPath, new Set())
    this.updateFile(normalizedPath, scannedFile)
  }

  /**
   * Removes a file from the graph.
   */
  removeFile(filePath: string): void {
    const normalizedPath = normalizePath(filePath)

    // Remove forward edges and corresponding reverse edges
    const targets = this.forward.get(normalizedPath)
    if (targets) {
      for (const target of targets) {
        this.reverse.get(target)?.delete(normalizedPath)
      }
    }
    this.forward.delete(normalizedPath)

    // Remove reverse edges pointing to this file
    const importers = this.reverse.get(normalizedPath)
    if (importers) {
      for (const importer of importers) {
        this.forward.get(importer)?.delete(normalizedPath)
      }
    }
    this.reverse.delete(normalizedPath)

    // Remove from route lookups
    this.entryFileToRouteId.delete(normalizedPath)

    // Invalidate cache
    if (importers) {
      for (const importer of importers) {
        this.invalidateCache(importer)
      }
    }
    this.fileToRoutesCache.delete(normalizedPath)
  }

  /**
   * Invalidates the cached fileToRoutes for a file and all its
   * transitive importers in the reverse graph.
   */
  private invalidateCache(filePath: string): void {
    const visited = new Set<string>()
    const stack = [filePath]

    while (stack.length > 0) {
      const current = stack.pop()!
      if (visited.has(current)) continue
      visited.add(current)
      this.fileToRoutesCache.delete(current)

      const importers = this.reverse.get(current)
      if (importers) {
        for (const importer of importers) {
          stack.push(importer)
        }
      }
    }
  }

  /**
   * Updates the known files set in the resolver config.
   */
  updateKnownFiles(knownFiles: Set<string>): void {
    this.resolverConfig.knownFiles = knownFiles
  }

  getStats(): GraphStats {
    let totalEdges = 0
    for (const targets of this.forward.values()) {
      totalEdges += targets.size
    }

    return {
      totalFiles: this.forward.size,
      totalRoutes: this.routes.size,
      totalEdges,
      buildTimeMs: this.buildTimeMs,
    }
  }
}

/**
 * Converts a set of exact route IDs into route patterns suitable
 * for client-side matching.
 *
 * If all routes under a common prefix are affected, collapses them
 * into a prefix pattern like "/dashboard/company/**".
 */
function routesToPatterns(
  affectedRouteIds: Set<string>,
  allRoutes: Map<string, RouteEntry>,
  collapseThreshold = 0.75
): string[] {
  // If more than collapseThreshold of all page routes are affected, broadcast to all
  const pageRoutes = [...allRoutes.values()].filter(
    r => r.routeType === 'page'
  )
  if (
    collapseThreshold < 1.0 &&
    affectedRouteIds.size >= pageRoutes.length * collapseThreshold
  ) {
    return ['*']
  }

  const patterns: string[] = []
  const consumed = new Set<string>()

  // Try to collapse routes under common prefixes
  const prefixCounts = new Map<string, number>()
  const prefixTotals = new Map<string, number>()

  for (const routeId of affectedRouteIds) {
    const segments = routeId.split('/').filter(Boolean)
    // Build prefix paths of increasing depth
    for (let depth = 1; depth <= segments.length; depth++) {
      const prefix = '/' + segments.slice(0, depth).join('/')
      prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1)
    }
  }

  // Count total routes under each prefix
  for (const route of pageRoutes) {
    const segments = route.routeId.split('/').filter(Boolean)
    for (let depth = 1; depth <= segments.length; depth++) {
      const prefix = '/' + segments.slice(0, depth).join('/')
      prefixTotals.set(prefix, (prefixTotals.get(prefix) ?? 0) + 1)
    }
  }

  // Find prefixes where all descendant routes are affected
  // Sort by depth (deeper first) to prefer more specific patterns
  const sortedPrefixes = [...prefixCounts.entries()]
    .filter(
      ([prefix, count]) =>
        count >= 3 && count === (prefixTotals.get(prefix) ?? 0)
    )
    .sort((a, b) => b[0].split('/').length - a[0].split('/').length)

  for (const [prefix] of sortedPrefixes) {
    // Check if any of the routes under this prefix are already consumed
    const routesUnderPrefix = [...affectedRouteIds].filter(
      r => r === prefix || r.startsWith(prefix + '/')
    )

    const allUnconsumed = routesUnderPrefix.every(r => !consumed.has(r))
    if (allUnconsumed && routesUnderPrefix.length >= 3) {
      patterns.push(prefix + '/**')
      for (const r of routesUnderPrefix) consumed.add(r)
    }
  }

  // Add remaining routes as exact patterns
  for (const routeId of affectedRouteIds) {
    if (!consumed.has(routeId)) {
      patterns.push(routeId)
    }
  }

  // If no patterns could be collapsed, return exact route IDs instead of '*'
  if (patterns.length === 0 && affectedRouteIds.size > 0) {
    return [...affectedRouteIds]
  }
  return patterns.length > 0 ? patterns : ['*']
}

function addReason(
  reasons: Map<string, string[]>,
  routeId: string,
  reason: string
): void {
  let list = reasons.get(routeId)
  if (!list) {
    list = []
    reasons.set(routeId, list)
  }
  list.push(reason)
}
