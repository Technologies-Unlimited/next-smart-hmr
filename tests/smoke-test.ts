/**
 * Smoke test: Run against the ThothOS-production codebase to verify
 * the dependency graph builds correctly and returns sensible results.
 *
 * Usage: bun tests/smoke-test.ts
 */
import { RouteMapper, detectAppDir } from '../src/server/route-mapper.js'
import { DEFAULT_CONFIG } from '../src/shared/types.js'

const rootDir = 'c:/Users/Matt-PC/Documents/App Development/ThothOS-production'

async function main() {
  const appDir = await detectAppDir(rootDir)
  console.log('App dir:', appDir)

  const mapper = new RouteMapper(rootDir, appDir, DEFAULT_CONFIG)
  console.log('Building dependency graph...')
  const stats = await mapper.build()
  console.log('Stats:', JSON.stringify(stats, null, 2))

  // Test 1: specific page change
  const accountingPage = rootDir + '/src/app/dashboard/administration/workspace/accounting/page.tsx'
  const r1 = mapper.getAffectedRoutes([accountingPage])
  console.log('\n--- Accounting page change ---')
  console.log('Routes:', r1.routes)

  // Test 2: shared barrel hook change
  const adminHook = rootDir + '/src/hooks/useAdministrationData.ts'
  const r2 = mapper.getAffectedRoutes([adminHook])
  console.log('\n--- useAdministrationData change ---')
  console.log('Routes:', r2.routes.slice(0, 10), '...total:', r2.routes.length)

  // Test 3: root layout change
  const rootLayout = rootDir + '/src/app/layout.tsx'
  const r3 = mapper.getAffectedRoutes([rootLayout])
  console.log('\n--- Root layout change ---')
  console.log('Routes:', r3.routes)

  // Test 4: a deep component change
  const clientLayout = rootDir + '/src/app/ClientLayout/index.tsx'
  const r4 = mapper.getAffectedRoutes([clientLayout])
  console.log('\n--- ClientLayout change ---')
  console.log('Routes:', r4.routes)

  // Test 5: lib/auth change (should affect many routes)
  const auth = rootDir + '/src/lib/auth.ts'
  const r5 = mapper.getAffectedRoutes([auth])
  console.log('\n--- lib/auth change ---')
  console.log('Routes:', r5.routes.slice(0, 5), '...total:', r5.routes.length)
}

main().catch(console.error)
