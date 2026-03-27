import { describe, test, expect } from 'bun:test'
import { resolveImport, type ResolverConfig } from '../src/server/resolver'

const ROOT = '/project'

function makeConfig(files: string[]): ResolverConfig {
  return {
    rootDir: ROOT,
    pathAliases: { '@/': ROOT + '/src/' },
    knownFiles: new Set(files),
  }
}

describe('resolveImport', () => {
  test('resolves path alias with direct file', () => {
    const config = makeConfig(['/project/src/lib/auth.ts'])
    const result = resolveImport('@/lib/auth', '/project/src/app/page.tsx', config)
    expect(result).toBe('/project/src/lib/auth.ts')
  })

  test('resolves path alias with tsx extension', () => {
    const config = makeConfig(['/project/src/components/Button.tsx'])
    const result = resolveImport(
      '@/components/Button',
      '/project/src/app/page.tsx',
      config
    )
    expect(result).toBe('/project/src/components/Button.tsx')
  })

  test('resolves path alias with index file', () => {
    const config = makeConfig(['/project/src/lib/graphql/index.ts'])
    const result = resolveImport(
      '@/lib/graphql',
      '/project/src/app/page.tsx',
      config
    )
    expect(result).toBe('/project/src/lib/graphql/index.ts')
  })

  test('resolves relative import', () => {
    const config = makeConfig([
      '/project/src/app/dashboard/client.tsx',
    ])
    const result = resolveImport(
      './client',
      '/project/src/app/dashboard/page.tsx',
      config
    )
    expect(result).toBe('/project/src/app/dashboard/client.tsx')
  })

  test('resolves parent-relative import', () => {
    const config = makeConfig(['/project/src/utils/helpers.ts'])
    const result = resolveImport(
      '../../utils/helpers',
      '/project/src/app/dashboard/page.tsx',
      config
    )
    expect(result).toBe('/project/src/utils/helpers.ts')
  })

  test('returns null for node_modules import', () => {
    const config = makeConfig([])
    const result = resolveImport('react', '/project/src/app/page.tsx', config)
    expect(result).toBeNull()
  })

  test('returns null for unresolvable import', () => {
    const config = makeConfig([])
    const result = resolveImport(
      '@/nonexistent',
      '/project/src/app/page.tsx',
      config
    )
    expect(result).toBeNull()
  })

  test('resolves import with explicit extension swap (.js → .ts)', () => {
    const config = makeConfig(['/project/src/lib/util.ts'])
    const result = resolveImport(
      '@/lib/util.js',
      '/project/src/app/page.tsx',
      config
    )
    expect(result).toBe('/project/src/lib/util.ts')
  })
})
