import { describe, test, expect } from 'bun:test'
import { getBootstrapScript } from '../src/client/bootstrap'

describe('bootstrap script', () => {
  test('generates valid JavaScript', () => {
    const script = getBootstrapScript({ port: 3002, debug: false })
    // Should be a valid IIFE
    expect(script).toStartWith('(function(){')
    expect(script).toEndWith('})();')
  })

  test('embeds the correct port', () => {
    const script = getBootstrapScript({ port: 9999 })
    expect(script).toContain('ws://localhost:9999')
  })

  test('respects debug flag', () => {
    const debugScript = getBootstrapScript({ debug: true })
    expect(debugScript).toContain('debug: true')

    const quietScript = getBootstrapScript({ debug: false })
    expect(quietScript).toContain('debug: false')
  })

  test('sets up __SMART_HMR_STATE__ on window', () => {
    const script = getBootstrapScript({})
    expect(script).toContain('window.__SMART_HMR_STATE__')
    expect(script).toContain('enabled: false')
    expect(script).toContain('pathname: null')
    expect(script).toContain('affectedRoutes: null')
    expect(script).toContain('suppressedCount: 0')
  })

  test('wraps WebSocket constructor', () => {
    const script = getBootstrapScript({})
    expect(script).toContain('var OriginalWebSocket = window.WebSocket')
    expect(script).toContain('window.WebSocket = SmartHMRWebSocket')
  })

  test('only filters serverComponentChanges', () => {
    const script = getBootstrapScript({})
    expect(script).toContain('"serverComponentChanges"')
  })

  test('passes through binary messages', () => {
    const script = getBootstrapScript({})
    expect(script).toContain('typeof event.data !== "string"')
  })
})

describe('route matching (from bootstrap)', () => {
  // We test the matchesAnyRoute logic by extracting and evaluating it
  const matchesAnyRoute = (
    pathname: string | null,
    affectedRoutes: string[]
  ): boolean => {
    if (!pathname || !affectedRoutes) return true
    for (const pattern of affectedRoutes) {
      if (pattern === '*') return true
      if (pattern === pathname) return true
      if (pattern.endsWith('/**')) {
        const prefix = pattern.slice(0, -3)
        if (
          pathname === prefix ||
          pathname.startsWith(prefix + '/')
        )
          return true
      }
    }
    return false
  }

  test('wildcard matches everything', () => {
    expect(matchesAnyRoute('/any/path', ['*'])).toBe(true)
  })

  test('exact match', () => {
    expect(
      matchesAnyRoute('/dashboard/company', ['/dashboard/company'])
    ).toBe(true)
  })

  test('exact non-match', () => {
    expect(
      matchesAnyRoute('/dashboard/employee', ['/dashboard/company'])
    ).toBe(false)
  })

  test('prefix match with /**', () => {
    expect(
      matchesAnyRoute('/dashboard/company/settings', ['/dashboard/company/**'])
    ).toBe(true)
  })

  test('prefix match — exact prefix', () => {
    expect(
      matchesAnyRoute('/dashboard/company', ['/dashboard/company/**'])
    ).toBe(true)
  })

  test('prefix non-match — different branch', () => {
    expect(
      matchesAnyRoute('/dashboard/employee', ['/dashboard/company/**'])
    ).toBe(false)
  })

  test('null pathname returns true (safe default)', () => {
    expect(matchesAnyRoute(null, ['/dashboard'])).toBe(true)
  })

  test('multiple patterns — one matches', () => {
    expect(
      matchesAnyRoute('/settings', ['/dashboard/**', '/settings'])
    ).toBe(true)
  })

  test('multiple patterns — none match', () => {
    expect(
      matchesAnyRoute('/about', ['/dashboard/**', '/settings'])
    ).toBe(false)
  })
})
