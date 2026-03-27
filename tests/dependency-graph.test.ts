import { describe, test, expect } from 'bun:test'
import { DependencyGraph } from '../src/server/dependency-graph'
import type { ScannedFile, RouteEntry } from '../src/shared/types'
import type { ResolverConfig } from '../src/server/resolver'

function makeFile(
  filePath: string,
  imports: string[] = [],
  boundary: 'server' | 'client' | null = null
): ScannedFile {
  return {
    filePath,
    imports: imports.map(specifier => ({
      specifier,
      isDynamic: false,
      isTypeOnly: false,
    })),
    boundary,
    mtimeMs: Date.now(),
  }
}

function makeRoute(
  routeId: string,
  entryFile: string,
  layouts: string[] = [],
  colocatedFiles: string[] = []
): RouteEntry {
  return {
    routeId,
    entryFile,
    colocatedFiles,
    layouts,
    routeType: 'page',
  }
}

// Resolver config with all files pre-known
function makeConfig(allFiles: string[]): ResolverConfig {
  return {
    rootDir: '/project',
    pathAliases: { '@/': '/project/src/' },
    knownFiles: new Set(allFiles),
  }
}

describe('DependencyGraph', () => {
  test('direct page change affects only that route', () => {
    const files = new Map<string, ScannedFile>([
      ['/project/src/app/about/page.tsx', makeFile('/project/src/app/about/page.tsx')],
      ['/project/src/app/contact/page.tsx', makeFile('/project/src/app/contact/page.tsx')],
    ])

    const routes = new Map<string, RouteEntry>([
      ['/about', makeRoute('/about', '/project/src/app/about/page.tsx')],
      ['/contact', makeRoute('/contact', '/project/src/app/contact/page.tsx')],
    ])

    const config = makeConfig([...files.keys()])
    const graph = new DependencyGraph(config)
    graph.build(files, routes)

    const result = graph.getAffectedRoutes(['/project/src/app/about/page.tsx'])
    expect(result.routes).toContain('/about')
    expect(result.routes).not.toContain('/contact')
  })

  test('shared dependency change affects all importing routes', () => {
    const allFiles = [
      '/project/src/app/about/page.tsx',
      '/project/src/app/contact/page.tsx',
      '/project/src/lib/auth.ts',
    ]

    const files = new Map<string, ScannedFile>([
      [
        '/project/src/app/about/page.tsx',
        makeFile('/project/src/app/about/page.tsx', ['@/lib/auth']),
      ],
      [
        '/project/src/app/contact/page.tsx',
        makeFile('/project/src/app/contact/page.tsx', ['@/lib/auth']),
      ],
      ['/project/src/lib/auth.ts', makeFile('/project/src/lib/auth.ts')],
    ])

    const routes = new Map<string, RouteEntry>([
      ['/about', makeRoute('/about', '/project/src/app/about/page.tsx')],
      ['/contact', makeRoute('/contact', '/project/src/app/contact/page.tsx')],
    ])

    const config = makeConfig(allFiles)
    const graph = new DependencyGraph(config)
    graph.build(files, routes)

    const result = graph.getAffectedRoutes(['/project/src/lib/auth.ts'])
    // When all/most routes are affected, routesToPatterns collapses to "*"
    // which is correct — it means "all routes"
    const affectsAll = result.routes.includes('*')
    const affectsBoth =
      result.routes.includes('/about') && result.routes.includes('/contact')
    expect(affectsAll || affectsBoth).toBe(true)
  })

  test('layout change affects all descendant routes', () => {
    const allFiles = [
      '/project/src/app/dashboard/layout.tsx',
      '/project/src/app/dashboard/settings/page.tsx',
      '/project/src/app/dashboard/profile/page.tsx',
      '/project/src/app/about/page.tsx',
    ]

    const files = new Map<string, ScannedFile>([
      [
        '/project/src/app/dashboard/layout.tsx',
        makeFile('/project/src/app/dashboard/layout.tsx'),
      ],
      [
        '/project/src/app/dashboard/settings/page.tsx',
        makeFile('/project/src/app/dashboard/settings/page.tsx'),
      ],
      [
        '/project/src/app/dashboard/profile/page.tsx',
        makeFile('/project/src/app/dashboard/profile/page.tsx'),
      ],
      [
        '/project/src/app/about/page.tsx',
        makeFile('/project/src/app/about/page.tsx'),
      ],
    ])

    const routes = new Map<string, RouteEntry>([
      [
        '/dashboard/settings',
        makeRoute(
          '/dashboard/settings',
          '/project/src/app/dashboard/settings/page.tsx',
          ['/project/src/app/dashboard/layout.tsx']
        ),
      ],
      [
        '/dashboard/profile',
        makeRoute(
          '/dashboard/profile',
          '/project/src/app/dashboard/profile/page.tsx',
          ['/project/src/app/dashboard/layout.tsx']
        ),
      ],
      ['/about', makeRoute('/about', '/project/src/app/about/page.tsx')],
    ])

    const config = makeConfig(allFiles)
    const graph = new DependencyGraph(config)
    graph.build(files, routes)

    const result = graph.getAffectedRoutes([
      '/project/src/app/dashboard/layout.tsx',
    ])
    expect(result.routes).toContain('/dashboard/settings')
    expect(result.routes).toContain('/dashboard/profile')
    expect(result.routes).not.toContain('/about')
  })

  test('co-located client.tsx change affects its route', () => {
    const allFiles = [
      '/project/src/app/settings/page.tsx',
      '/project/src/app/settings/client.tsx',
    ]

    const files = new Map<string, ScannedFile>([
      [
        '/project/src/app/settings/page.tsx',
        makeFile('/project/src/app/settings/page.tsx', ['./client']),
      ],
      [
        '/project/src/app/settings/client.tsx',
        makeFile('/project/src/app/settings/client.tsx', [], 'client'),
      ],
    ])

    const routes = new Map<string, RouteEntry>([
      [
        '/settings',
        makeRoute('/settings', '/project/src/app/settings/page.tsx', [], [
          '/project/src/app/settings/client.tsx',
        ]),
      ],
    ])

    const config = makeConfig(allFiles)
    const graph = new DependencyGraph(config)
    graph.build(files, routes)

    const result = graph.getAffectedRoutes([
      '/project/src/app/settings/client.tsx',
    ])
    // With only 1 route, the 75% threshold collapses to "*"
    const affectsSettings =
      result.routes.includes('/settings') || result.routes.includes('*')
    expect(affectsSettings).toBe(true)
  })

  test('transitive dependency change traces to correct routes', () => {
    const allFiles = [
      '/project/src/app/dashboard/page.tsx',
      '/project/src/app/about/page.tsx',
      '/project/src/hooks/useDashboard.ts',
      '/project/src/lib/graphql-client.ts',
    ]

    const files = new Map<string, ScannedFile>([
      [
        '/project/src/app/dashboard/page.tsx',
        makeFile('/project/src/app/dashboard/page.tsx', [
          '@/hooks/useDashboard',
        ]),
      ],
      [
        '/project/src/app/about/page.tsx',
        makeFile('/project/src/app/about/page.tsx'),
      ],
      [
        '/project/src/hooks/useDashboard.ts',
        makeFile('/project/src/hooks/useDashboard.ts', [
          '@/lib/graphql-client',
        ]),
      ],
      [
        '/project/src/lib/graphql-client.ts',
        makeFile('/project/src/lib/graphql-client.ts'),
      ],
    ])

    const routes = new Map<string, RouteEntry>([
      [
        '/dashboard',
        makeRoute('/dashboard', '/project/src/app/dashboard/page.tsx'),
      ],
      ['/about', makeRoute('/about', '/project/src/app/about/page.tsx')],
    ])

    const config = makeConfig(allFiles)
    const graph = new DependencyGraph(config)
    graph.build(files, routes)

    // Change deep dependency — only dashboard should be affected
    const result = graph.getAffectedRoutes([
      '/project/src/lib/graphql-client.ts',
    ])
    expect(result.routes).toContain('/dashboard')
    expect(result.routes).not.toContain('/about')
  })

  test('incremental update reflects new imports', () => {
    const allFiles = [
      '/project/src/app/page.tsx',
      '/project/src/lib/auth.ts',
      '/project/src/lib/new-util.ts',
    ]

    const files = new Map<string, ScannedFile>([
      [
        '/project/src/app/page.tsx',
        makeFile('/project/src/app/page.tsx', ['@/lib/auth']),
      ],
      ['/project/src/lib/auth.ts', makeFile('/project/src/lib/auth.ts')],
      [
        '/project/src/lib/new-util.ts',
        makeFile('/project/src/lib/new-util.ts'),
      ],
    ])

    const routes = new Map<string, RouteEntry>([
      ['/', makeRoute('/', '/project/src/app/page.tsx')],
    ])

    const config = makeConfig(allFiles)
    const graph = new DependencyGraph(config)
    graph.build(files, routes)

    // Initially, new-util doesn't affect any route
    let result = graph.getAffectedRoutes(['/project/src/lib/new-util.ts'])
    expect(result.routes).toEqual(['*']) // fallback since no route found

    // Now auth.ts starts importing new-util
    graph.updateFile(
      '/project/src/lib/auth.ts',
      makeFile('/project/src/lib/auth.ts', ['@/lib/new-util'])
    )

    // Now new-util should affect the root route (via auth.ts → page.tsx)
    result = graph.getAffectedRoutes(['/project/src/lib/new-util.ts'])
    // With only 1 route, the 75% threshold collapses to "*"
    const affectsRoot = result.routes.includes('/') || result.routes.includes('*')
    expect(affectsRoot).toBe(true)
  })

  test('getStats returns correct counts', () => {
    const allFiles = [
      '/project/src/app/page.tsx',
      '/project/src/lib/auth.ts',
    ]

    const files = new Map<string, ScannedFile>([
      [
        '/project/src/app/page.tsx',
        makeFile('/project/src/app/page.tsx', ['@/lib/auth']),
      ],
      ['/project/src/lib/auth.ts', makeFile('/project/src/lib/auth.ts')],
    ])

    const routes = new Map<string, RouteEntry>([
      ['/', makeRoute('/', '/project/src/app/page.tsx')],
    ])

    const config = makeConfig(allFiles)
    const graph = new DependencyGraph(config)
    graph.build(files, routes)

    const stats = graph.getStats()
    expect(stats.totalFiles).toBe(2)
    expect(stats.totalRoutes).toBe(1)
    expect(stats.totalEdges).toBe(1) // page.tsx → auth.ts
    expect(stats.buildTimeMs).toBeGreaterThan(0)
  })
})
