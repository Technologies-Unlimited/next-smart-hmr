import { Glob } from 'bun'
import { dirname, basename, resolve } from 'node:path'
import type { RouteEntry } from '../shared/types.js'
import { normalizePath } from './resolver.js'

const ROUTE_ENTRY_FILES = new Set([
  'page.tsx',
  'page.ts',
  'page.jsx',
  'page.js',
])

const API_ENTRY_FILES = new Set([
  'route.tsx',
  'route.ts',
  'route.jsx',
  'route.js',
])

const LAYOUT_FILES = new Set([
  'layout.tsx',
  'layout.ts',
  'layout.jsx',
  'layout.js',
])

const ROUTE_ASSOCIATED_FILES = new Set([
  ...LAYOUT_FILES,
  'loading.tsx',
  'loading.ts',
  'error.tsx',
  'error.ts',
  'not-found.tsx',
  'not-found.ts',
  'template.tsx',
  'template.ts',
])

// Route group pattern: (group-name)
const ROUTE_GROUP_RE = /\([^)]+\)\//g

/**
 * Converts a filesystem path relative to the app directory into a route ID.
 * Strips route groups, keeps dynamic segments.
 *
 * Examples:
 *   "dashboard/company/settings/page.tsx" → "/dashboard/company/settings"
 *   "(public-booking)/admin/page.tsx" → "/admin"
 *   "dashboard/[companyId]/page.tsx" → "/dashboard/[companyId]"
 */
function pathToRouteId(relativePath: string): string {
  // Remove the filename
  let dir = normalizePath(dirname(relativePath))

  // Strip route groups
  dir = dir.replace(ROUTE_GROUP_RE, '')

  // Clean up
  if (dir === '.') return '/'
  if (!dir.startsWith('/')) dir = '/' + dir
  if (dir.endsWith('/') && dir !== '/') dir = dir.slice(0, -1)

  return dir
}

/**
 * Discovers all Next.js App Router routes from the filesystem.
 */
export async function discoverRoutes(
  appDir: string
): Promise<Map<string, RouteEntry>> {
  const normalizedAppDir = normalizePath(appDir)
  const routes = new Map<string, RouteEntry>()

  // Find all page and route files
  const entryGlob = new Glob('**/page.{ts,tsx,js,jsx}')
  const apiGlob = new Glob('**/route.{ts,tsx,js,jsx}')

  // Collect all layout files for ancestry lookup
  const layoutGlob = new Glob('**/layout.{ts,tsx,js,jsx}')
  const allLayouts: string[] = []
  for await (const path of layoutGlob.scan({
    cwd: normalizedAppDir,
    absolute: true,
  })) {
    allLayouts.push(normalizePath(path))
  }

  // Process page routes
  for await (const path of entryGlob.scan({
    cwd: normalizedAppDir,
    absolute: true,
  })) {
    const normalizedPath = normalizePath(path)
    const relativePath = normalizedPath.slice(normalizedAppDir.length + 1)
    const routeId = pathToRouteId(relativePath)
    const entryDir = normalizePath(dirname(normalizedPath))

    // Find ancestor layouts
    const layouts = findAncestorLayouts(entryDir, normalizedAppDir, allLayouts)

    // Find co-located files
    const colocated = await findColocatedFiles(entryDir, normalizedPath)

    routes.set(routeId, {
      routeId,
      entryFile: normalizedPath,
      colocatedFiles: colocated,
      layouts,
      routeType: 'page',
    })
  }

  // Process API routes
  for await (const path of apiGlob.scan({
    cwd: normalizedAppDir,
    absolute: true,
  })) {
    const normalizedPath = normalizePath(path)
    const relativePath = normalizedPath.slice(normalizedAppDir.length + 1)
    const routeId = pathToRouteId(relativePath)

    // Skip if a page route already exists for this path
    if (routes.has(routeId)) continue

    const entryDir = normalizePath(dirname(normalizedPath))
    const layouts = findAncestorLayouts(entryDir, normalizedAppDir, allLayouts)

    routes.set(routeId, {
      routeId,
      entryFile: normalizedPath,
      colocatedFiles: [],
      layouts,
      routeType: 'api',
    })
  }

  return routes
}

/**
 * Finds all layout files in ancestor directories from the entry dir up to the app dir.
 */
function findAncestorLayouts(
  entryDir: string,
  appDir: string,
  allLayouts: string[]
): string[] {
  const layouts: string[] = []
  let current = entryDir

  while (current.startsWith(appDir)) {
    for (const layoutPath of allLayouts) {
      const layoutDir = normalizePath(dirname(layoutPath))
      if (layoutDir === current) {
        layouts.push(layoutPath)
      }
    }

    if (current === appDir) break
    current = normalizePath(dirname(current))
  }

  return layouts
}

/**
 * Finds co-located files in the same directory as a route entry,
 * excluding Next.js convention files.
 */
async function findColocatedFiles(
  dir: string,
  entryFile: string
): Promise<string[]> {
  const colocated: string[] = []
  const glob = new Glob('*.{ts,tsx,js,jsx}')

  for await (const path of glob.scan({ cwd: dir, absolute: true })) {
    const normalizedPath = normalizePath(path)
    const fileName = basename(normalizedPath)

    // Skip the entry file itself
    if (normalizedPath === entryFile) continue

    // Skip Next.js convention files
    if (ROUTE_ENTRY_FILES.has(fileName)) continue
    if (API_ENTRY_FILES.has(fileName)) continue
    if (ROUTE_ASSOCIATED_FILES.has(fileName)) continue

    colocated.push(normalizedPath)
  }

  return colocated
}

/**
 * Returns true if the given file path is a layout file.
 */
export function isLayoutFile(filePath: string): boolean {
  return LAYOUT_FILES.has(basename(filePath))
}

/**
 * Returns true if the given file path is a route entry (page.tsx).
 */
export function isRouteEntry(filePath: string): boolean {
  return ROUTE_ENTRY_FILES.has(basename(filePath))
}

/**
 * Returns true if the given file path is an API route entry (route.ts).
 */
export function isApiEntry(filePath: string): boolean {
  return API_ENTRY_FILES.has(basename(filePath))
}

/**
 * Returns true if the given file is a Next.js convention file
 * (page, route, layout, loading, error, not-found, template).
 */
export function isConventionFile(filePath: string): boolean {
  const fileName = basename(filePath)
  return (
    ROUTE_ENTRY_FILES.has(fileName) ||
    API_ENTRY_FILES.has(fileName) ||
    ROUTE_ASSOCIATED_FILES.has(fileName)
  )
}
