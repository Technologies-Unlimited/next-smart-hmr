/**
 * Live integration test — run while `bun dev` is active in ThothOS.
 *
 * Tests:
 * 1. Watcher health endpoint is responding
 * 2. WebSocket connection works and receives connected message
 * 3. Touching a file triggers the correct affected routes broadcast
 * 4. Touching a different file triggers different routes
 *
 * Usage: bun tests/live-test.ts
 */
import { writeFileSync, readFileSync } from 'node:fs'

const WATCHER_PORT = 3002
const NEXT_PORT = 3000
const THOTHOS_ROOT = 'c:/Users/Matt-PC/Documents/App Development/ThothOS-production'

let passed = 0
let failed = 0

function ok(name: string) {
  passed++
  console.log(`  ✓ ${name}`)
}

function fail(name: string, reason: string) {
  failed++
  console.log(`  ✗ ${name}: ${reason}`)
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Test 1: Health endpoint ───
async function testHealth() {
  console.log('\n1. Watcher health endpoint')
  try {
    const res = await fetch(`http://localhost:${WATCHER_PORT}/health`)
    const data = await res.json() as any
    if (data.status === 'ok') ok('Health status is ok')
    else fail('Health status', `got ${data.status}`)
    if (data.totalFiles > 2000) ok(`Tracking ${data.totalFiles} files`)
    else fail('File count', `only ${data.totalFiles}`)
    if (data.totalRoutes > 300) ok(`Tracking ${data.totalRoutes} routes`)
    else fail('Route count', `only ${data.totalRoutes}`)
    if (data.totalEdges > 4000) ok(`${data.totalEdges} dependency edges`)
    else fail('Edge count', `only ${data.totalEdges}`)
  } catch (e: any) {
    fail('Health endpoint', e.message)
  }
}

// ─── Test 2: WebSocket connection ───
async function testWebSocket(): Promise<WebSocket | null> {
  console.log('\n2. WebSocket connection')
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(`ws://localhost:${WATCHER_PORT}`)
      const timeout = setTimeout(() => {
        fail('WebSocket connect', 'timed out after 3s')
        resolve(null)
      }, 3000)

      ws.onopen = () => {
        ok('Connected to watcher WebSocket')
      }

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string)
        if (msg.type === 'smart-hmr:connected') {
          ok(`Received connected message (${msg.totalFiles} files, ${msg.totalRoutes} routes)`)
          clearTimeout(timeout)
          resolve(ws)
        }
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        fail('WebSocket connect', 'connection error')
        resolve(null)
      }
    } catch (e: any) {
      fail('WebSocket connect', e.message)
      resolve(null)
    }
  })
}

// ─── Test 3: File change → route broadcast ───
async function testFileChange(ws: WebSocket) {
  console.log('\n3. File change detection (specific page)')

  const targetFile = `${THOTHOS_ROOT}/src/app/dashboard/administration/workspace/accounting/page.tsx`

  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      fail('File change broadcast', 'no message received within 3s')
      resolve()
    }, 3000)

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string)
      if (msg.type === 'smart-hmr:routes') {
        clearTimeout(timeout)

        const routes = msg.affectedRoutes as string[]
        const files = msg.changedFiles as string[]

        if (files.some((f: string) => f.includes('accounting/page.tsx'))) {
          ok(`Detected change to: ${files.join(', ')}`)
        } else {
          fail('Changed files', `unexpected: ${files.join(', ')}`)
        }

        if (routes.includes('/dashboard/administration/workspace/accounting')) {
          ok('Affected route: /dashboard/administration/workspace/accounting')
        } else if (routes.includes('*')) {
          fail('Route specificity', 'got wildcard "*" — expected specific route')
        } else {
          fail('Affected routes', `unexpected: ${routes.join(', ')}`)
        }

        // Route should NOT include unrelated pages
        if (!routes.includes('/auth') && !routes.includes('/about')) {
          ok('Unrelated routes NOT included')
        } else {
          fail('Route filtering', 'unrelated routes were included')
        }

        resolve()
      }
    }

    // Touch the file (append a comment then remove it)
    const content = readFileSync(targetFile, 'utf-8')
    writeFileSync(targetFile, content + '\n// smart-hmr-test')
    // Restore immediately
    setTimeout(() => writeFileSync(targetFile, content), 200)
  })
}

// ─── Test 4: Shared dependency → multiple routes ───
async function testSharedDepChange(ws: WebSocket) {
  console.log('\n4. Shared dependency change (useAdministrationData barrel)')

  const targetFile = `${THOTHOS_ROOT}/src/hooks/useAdministrationData.ts`

  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      fail('Shared dep broadcast', 'no message received within 3s')
      resolve()
    }, 3000)

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string)
      if (msg.type === 'smart-hmr:routes') {
        clearTimeout(timeout)

        const routes = msg.affectedRoutes as string[]

        if (routes.length > 5 && routes.length < 50) {
          ok(`Affected ${routes.length} routes (expected ~16 for this barrel)`)
        } else if (routes.includes('*')) {
          fail('Route specificity', `got wildcard — barrel has ~16 consumers, not all 326`)
        } else {
          ok(`Affected ${routes.length} routes`)
        }

        // Should include administration routes
        const hasAdmin = routes.some((r: string) => r.includes('administration'))
        if (hasAdmin) ok('Includes administration workspace routes')
        else fail('Admin routes', 'no administration routes in result')

        resolve()
      }
    }

    const content = readFileSync(targetFile, 'utf-8')
    writeFileSync(targetFile, content + '\n// smart-hmr-test')
    setTimeout(() => writeFileSync(targetFile, content), 200)
  })
}

// ─── Test 5: Check Next.js page has bootstrap script ───
async function testBootstrapInjected() {
  console.log('\n5. Bootstrap script injected in HTML')
  try {
    const res = await fetch(`http://localhost:${NEXT_PORT}`)
    const html = await res.text()

    if (html.includes('__SMART_HMR_STATE__')) {
      ok('Bootstrap script found in page HTML')
    } else {
      fail('Bootstrap script', 'not found in page HTML')
    }

    if (html.includes('SmartHMRWebSocket')) {
      ok('WebSocket wrapper found in page HTML')
    } else {
      fail('WebSocket wrapper', 'not found in page HTML')
    }

    if (html.includes(`ws://localhost:${WATCHER_PORT}`)) {
      ok(`Watcher connection URL (port ${WATCHER_PORT}) found in page HTML`)
    } else {
      fail('Watcher URL', 'not found in page HTML')
    }
  } catch (e: any) {
    fail('Page fetch', e.message)
  }
}

// ─── Run all tests ───
async function main() {
  console.log('=== next-smart-hmr Live Integration Test ===')
  console.log(`Watcher: ws://localhost:${WATCHER_PORT}`)
  console.log(`Next.js: http://localhost:${NEXT_PORT}`)

  await testHealth()
  const ws = await testWebSocket()

  if (ws) {
    await testFileChange(ws)
    await sleep(500) // let the watcher settle between tests
    await testSharedDepChange(ws)
    ws.close()
  }

  await testBootstrapInjected()

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
