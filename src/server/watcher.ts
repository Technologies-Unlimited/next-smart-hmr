import { watch } from 'node:fs'
import { resolve, extname } from 'node:path'
import type { SmartHMRConfig, SmartHMRMessage } from '../shared/types.js'
import { DEFAULT_CONFIG } from '../shared/types.js'
import { RouteMapper, detectAppDir, loadConfig } from './route-mapper.js'
import { normalizePath } from './resolver.js'
import type { ServerWebSocket } from 'bun'

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.css',
  '.module.css',
])

interface WatcherClientData {
  id: number
}

/**
 * Starts the Smart HMR watcher:
 * 1. Builds the dependency graph
 * 2. Starts a WebSocket server for browser clients
 * 3. Watches the filesystem for changes
 * 4. Broadcasts affected routes on each change
 */
export async function startWatcher(
  rootDir: string,
  configOverrides: Partial<SmartHMRConfig> = {}
): Promise<{ stop: () => void; port: number }> {
  const normalizedRoot = normalizePath(rootDir)

  // Load config
  const fileConfig = await loadConfig(normalizedRoot)
  const config: SmartHMRConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...configOverrides,
  }

  // Detect app directory
  const appDir = await detectAppDir(normalizedRoot)

  // Build the dependency graph
  const mapper = new RouteMapper(normalizedRoot, appDir, config)

  if (config.verbose) {
    console.log(`[smart-hmr] Building dependency graph...`)
  }

  const stats = await mapper.build()

  console.log(
    `[smart-hmr] Ready — ${stats.totalFiles} files, ${stats.totalRoutes} routes, ${stats.totalEdges} edges (${Math.round(stats.buildTimeMs)}ms)`
  )

  // Track connected WebSocket clients
  const clients = new Set<ServerWebSocket<WatcherClientData>>()
  let clientIdCounter = 0

  // Start WebSocket server
  const server = Bun.serve<WatcherClientData>({
    port: config.port,
    fetch(req, server) {
      // Upgrade WebSocket connections
      if (
        server.upgrade(req, {
          data: { id: ++clientIdCounter },
        })
      ) {
        return undefined
      }

      // Health check endpoint
      const url = new URL(req.url)
      if (url.pathname === '/health') {
        return new Response(
          JSON.stringify({
            status: 'ok',
            ...mapper.getStats(),
          }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response('smart-hmr watcher', { status: 200 })
    },
    websocket: {
      open(ws) {
        clients.add(ws)
        if (config.verbose) {
          console.log(
            `[smart-hmr] Client connected (#${ws.data.id}), total: ${clients.size}`
          )
        }

        // Send connection info
        const stats = mapper.getStats()
        const connectedMsg: SmartHMRMessage = {
          type: 'smart-hmr:connected',
          fileCount: stats.totalFiles,
          routeCount: stats.totalRoutes,
          buildTimeMs: stats.buildTimeMs,
        }
        ws.send(JSON.stringify(connectedMsg))
      },
      message(_ws, _message) {
        // Clients don't send messages to the watcher (yet)
      },
      close(ws) {
        clients.delete(ws)
        if (config.verbose) {
          console.log(
            `[smart-hmr] Client disconnected (#${ws.data.id}), total: ${clients.size}`
          )
        }
      },
    },
  })

  console.log(`[smart-hmr] WebSocket server on ws://localhost:${server.port}`)

  // File change debouncing
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const pendingChanges = new Set<string>()

  function flushChanges() {
    if (pendingChanges.size === 0) return

    const changedFiles = [...pendingChanges]
    pendingChanges.clear()

    // Update the graph for each changed file
    const updatePromises = changedFiles.map(async (file) => {
      try {
        await mapper.handleFileChange(file)
      } catch (err) {
        if (config.verbose) {
          console.error(`[smart-hmr] Error updating graph for ${file}:`, err)
        }
      }
    })

    Promise.all(updatePromises).then(() => {
      // Query affected routes
      const result = mapper.getAffectedRoutes(changedFiles)

      if (config.verbose) {
        console.log(
          `[smart-hmr] Changed: ${changedFiles.map(f => f.split('/').pop()).join(', ')} → routes: ${result.routes.join(', ')}`
        )
      }

      // Broadcast to all connected clients
      const message: SmartHMRMessage = {
        type: 'smart-hmr:routes',
        affectedRoutes: result.routes,
        changedFiles: changedFiles.map(f =>
          f.startsWith(normalizedRoot)
            ? f.slice(normalizedRoot.length + 1)
            : f
        ),
        timestamp: Date.now(),
      }

      const payload = JSON.stringify(message)
      for (const client of clients) {
        try {
          client.send(payload)
        } catch {
          // Client disconnected; will be cleaned up on close event
        }
      }
    })
  }

  // Determine watch directories (only include dirs that actually exist)
  const watchDirCandidates = config.include
    .map(pattern => {
      // Extract the base directory from patterns like "src/**"
      const base = pattern.split('*')[0].replace(/\/$/, '')
      return normalizePath(resolve(normalizedRoot, base))
    })
    .filter((dir, index, self) => self.indexOf(dir) === index) // dedupe

  const watchDirs: string[] = []
  for (const dir of watchDirCandidates) {
    try {
      const dirFile = Bun.file(dir + '/.')
      // Just check if the directory seems reachable by listing it
      const { existsSync } = await import('node:fs')
      if (existsSync(dir)) {
        watchDirs.push(dir)
      } else if (config.verbose) {
        console.log(`[smart-hmr] Skipping non-existent watch dir: ${dir}`)
      }
    } catch {
      if (config.verbose) {
        console.log(`[smart-hmr] Skipping non-existent watch dir: ${dir}`)
      }
    }
  }

  // Start file watchers
  const watchers: ReturnType<typeof watch>[] = []

  for (const dir of watchDirs) {
    try {
      const fsWatcher = watch(dir, { recursive: true }, (event, filename) => {
        if (!filename) return

        const normalizedFilename = normalizePath(filename)
        const ext = extname(normalizedFilename)

        // Only watch source files
        if (!SOURCE_EXTENSIONS.has(ext)) return

        // Check exclusions
        const excluded = config.exclude.some(ex => {
          if (ex.includes('*')) {
            const regexStr = ex
              .replace(/\./g, '\\.')
              .replace(/\*\*/g, '<<GLOB>>')
              .replace(/\*/g, '[^/]*')
              .replace(/<<GLOB>>/g, '.*')
            return new RegExp(`^${regexStr}$`).test(normalizedFilename)
          }
          return normalizedFilename.includes(ex)
        })
        if (excluded) return

        const fullPath = normalizePath(resolve(dir, normalizedFilename))
        pendingChanges.add(fullPath)

        // Debounce
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(flushChanges, config.debounce)
      })

      watchers.push(fsWatcher)
      if (config.verbose) {
        console.log(`[smart-hmr] Watching: ${dir}`)
      }
    } catch (err) {
      console.warn(`[smart-hmr] Could not watch ${dir}:`, err)
    }
  }

  return {
    port: server.port ?? config.port,
    stop() {
      for (const w of watchers) w.close()
      if (debounceTimer) clearTimeout(debounceTimer)
      server.stop()
      console.log('[smart-hmr] Stopped')
    },
  }
}

/**
 * Standalone entry point — run directly with `bun src/server/watcher.ts`
 */
if (import.meta.main) {
  const rootDir = process.cwd()

  // Parse CLI args for port override
  const portArg = process.argv.find(a => a.startsWith('--port='))
  const portOverride = portArg ? parseInt(portArg.split('=')[1], 10) : undefined
  const verbose = process.argv.includes('--verbose')

  startWatcher(rootDir, {
    ...(portOverride ? { port: portOverride } : {}),
    verbose,
  }).catch(err => {
    console.error('[smart-hmr] Failed to start:', err)
    process.exit(1)
  })
}
