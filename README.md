# next-smart-hmr

Route-aware Hot Module Replacement for Next.js. When you edit a file, only the browser tabs viewing affected routes refresh. All other tabs stay untouched.

## The Problem

Next.js broadcasts HMR updates to **every** connected browser tab. If you have 10 tabs open while developing, editing a single component causes all 10 tabs to hard-refresh. This loses component state, triggers redundant API calls, and wastes time.

## The Solution

`next-smart-hmr` builds a dependency graph of your project and intercepts HMR messages on each tab. When a file changes, it traces the import chain to determine which routes are affected, then only those tabs refresh. Everything else stays untouched.

```
Edit accounting/page.tsx
  Tab 1: /dashboard/accounting   -> refreshes (affected)
  Tab 2: /dashboard/employees    -> untouched
  Tab 3: /dashboard/settings     -> untouched
  Tab 4: /auth/login             -> untouched
```

## Quick Start

### Install

```bash
bun add -d next-smart-hmr
```

### Add to Root Layout

```tsx
// src/app/layout.tsx
import { SmartHMR } from 'next-smart-hmr/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <SmartHMR />
      </body>
    </html>
  )
}
```

`<SmartHMR />` renders nothing in production. In development, it injects a lightweight WebSocket interceptor that filters HMR messages per-tab.

### Update Dev Script

```json
{
  "scripts": {
    "dev": "smart-hmr next dev"
  }
}
```

The `smart-hmr` CLI wraps your Next.js dev command. It starts a file watcher alongside Next.js that builds the dependency graph and broadcasts affected routes to browser tabs.

Works with Turbopack, Webpack, and wrappers like `next-smart-runner`:

```json
{
  "scripts": {
    "dev": "smart-hmr next dev --turbopack",
    "dev:webpack": "smart-hmr next dev --webpack"
  }
}
```

That's it. Selective HMR is active.

## How It Works

```
                                  next-smart-hmr watcher (Bun)
                                 ┌────────────────────────────┐
   fs.watch detects file save -> │ Dependency Graph            │
                                 │ (2000+ files, <25ms build)  │
                                 │                             │
                                 │ Maps changed file -> routes  │
                                 │ via import chain traversal   │
                                 └──────────┬─────────────────┘
                                            │ WebSocket (port 3002)
                                            │ { affectedRoutes: ["/dashboard/accounting"] }
                                            │
          ┌─────────────────────────────────┼─────────────────────────────────┐
          │                                 │                                 │
   Tab 1: /dashboard/accounting      Tab 2: /dashboard/employees      Tab 3: /auth
   Route matches -> REFRESH          Route doesn't match -> SKIP      SKIP
```

1. **File watcher** detects saves in `src/` and queries the dependency graph
2. **Dependency graph** traces imports from the changed file up to route entry points (`page.tsx`, `layout.tsx`)
3. **WebSocket broadcast** sends affected route patterns to all browser tabs
4. **Client-side interceptor** (injected via `<SmartHMR />`) wraps the native WebSocket constructor. When Next.js sends a `serverComponentChanges` message, it checks if the current tab's route is affected. If not, the message is silently dropped.
5. **Visibility catch-up**: if you switch to a tab that had updates suppressed, it auto-refreshes once

### Dependency Resolution

The graph handles:

- **Direct page changes**: `page.tsx` edit -> only that route
- **Layout changes**: `layout.tsx` edit -> all child routes under that layout
- **Shared dependencies**: traces through the full import chain (e.g., `page.tsx -> client.tsx -> useHook.ts -> graphql-client.ts`)
- **Barrel re-exports**: `export * from` files are tracked transitively
- **Path aliases**: reads `tsconfig.json` paths (e.g., `@/*` -> `src/*`)
- **Smart collapsing**: when many routes under a prefix are all affected, collapses to `"/dashboard/**"` patterns
- **Conservative fallback**: files that can't be traced to specific routes broadcast to all tabs (same as stock Next.js)

### Graceful Degradation

If the watcher isn't running or crashes, the client-side interceptor stays inactive. All HMR messages pass through unfiltered. Zero breakage — identical to stock Next.js.

## Configuration

### CLI Options

```bash
smart-hmr [options] <next-command> [next-options]

smart-hmr next dev                    # zero config
smart-hmr --verbose next dev          # debug logging
smart-hmr --port 3003 next dev        # custom watcher port
```

### Environment Variables

```bash
SMART_HMR_PORT=3003          # watcher WebSocket port (default: 3002)
SMART_HMR_VERBOSE=1          # enable debug logging
```

### Config File (Optional)

Create `smart-hmr.config.ts` in your project root:

```typescript
import { defineConfig } from 'next-smart-hmr'

export default defineConfig({
  port: 3002,                              // watcher WebSocket port
  debounce: 50,                            // ms to batch rapid edits
  verbose: false,                          // debug logging
  include: ['src/**', 'app/**'],           // directories to watch
  exclude: ['**/*.test.*', '**/__tests__/**'],

  // Manual overrides for files the graph can't trace
  routeOverrides: {
    'src/lib/theme.ts': ['*'],             // theme changes affect all routes
  },
})
```

### Component Props

```tsx
<SmartHMR
  port={3002}      // watcher WebSocket port (default: 3002)
  debug={false}    // enable console logging in browser (default: false)
/>
```

## API

### Programmatic Usage

```typescript
import { startWatcher, RouteMapper, DependencyGraph } from 'next-smart-hmr'

// Start the watcher programmatically
const watcher = await startWatcher(process.cwd(), { port: 3002, verbose: true })

// Or use the graph directly
const mapper = new RouteMapper(rootDir, appDir, config)
await mapper.build()
const result = mapper.getAffectedRoutes(['src/lib/auth.ts'])
console.log(result.routes) // ["/dashboard/company/**", "/dashboard/employee/**"]
```

### Health Check

While the watcher is running:

```bash
curl http://localhost:3002/health
# {"status":"ok","totalFiles":2158,"totalRoutes":326,"totalEdges":4780,"buildTimeMs":21}
```

## Performance

Tested on a production Next.js 16 app with 2,158 source files and 326 routes:

| Metric | Value |
|--------|-------|
| Full graph build | ~20ms |
| Incremental update (file change) | <10ms |
| Memory overhead | ~15MB |
| Dependency edges tracked | 4,780 |

## Requirements

- **Runtime**: [Bun](https://bun.sh) >= 1.0 (for the watcher CLI)
- **Next.js**: 16+
- **React**: 19+
- **App Router** (Pages Router is not supported)

## Browser Verification

Open DevTools console on any page and check:

```javascript
window.__SMART_HMR_STATE__
// { enabled: true, pathname: "/dashboard/...", affectedRoutes: [...], suppressedCount: 0 }
```

If `enabled` is `true`, the interceptor is active and filtering HMR messages.

## Troubleshooting

**Watcher not starting**: Check if port 3002 is already in use. Use `--port 3003` or set `SMART_HMR_PORT`.

**All tabs still refreshing**: Check `window.__SMART_HMR_STATE__.enabled` in DevTools. If `false`, the watcher WebSocket isn't connecting. Verify the watcher is running (`curl http://localhost:3002/health`).

**Wrong routes refreshing**: Run with `--verbose` to see which files map to which routes. Use `routeOverrides` in the config file for files the graph can't trace.

**No effect in production**: Correct. `<SmartHMR />` renders nothing when `NODE_ENV !== 'development'`. The watcher CLI is only for dev.

## Contributing

```bash
git clone https://github.com/Technologies-Unlimited/next-smart-hmr.git
cd next-smart-hmr
bun install
bun test              # unit tests
bun run build         # compile to dist/
```

## License

MIT - [Technologies Unlimited](https://github.com/Technologies-Unlimited)
