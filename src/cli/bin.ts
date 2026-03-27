#!/usr/bin/env bun

import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { startWatcher } from '../server/watcher.js'
import { DEFAULT_CONFIG } from '../shared/types.js'

/**
 * CLI entry point for next-smart-hmr.
 *
 * Usage:
 *   smart-hmr next dev                          # zero config
 *   smart-hmr --port 3002 next dev              # custom watcher port
 *   smart-hmr --verbose next dev --turbopack    # debug + turbopack
 *   smart-hmr --debug next dev                  # alias for verbose
 */
async function main() {
  const args = process.argv.slice(2)

  // Parse smart-hmr specific flags (before the "next" command)
  let port = DEFAULT_CONFIG.port
  let verbose = false
  const nextArgs: string[] = []
  let foundNextCommand = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (foundNextCommand) {
      // Everything after 'next' is passed through to Next.js
      nextArgs.push(arg)
      continue
    }

    if (arg === '--port' && i + 1 < args.length) {
      port = parseInt(args[++i], 10)
    } else if (arg.startsWith('--port=')) {
      port = parseInt(arg.split('=')[1], 10)
    } else if (arg === '--verbose' || arg === '--debug') {
      verbose = true
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else if (arg === '--version' || arg === '-v') {
      printVersion()
      process.exit(0)
    } else {
      // This is the start of the next command (e.g., "next" or "next-smart-dev")
      foundNextCommand = true
      nextArgs.push(arg)
    }
  }

  // env var overrides
  if (process.env.SMART_HMR_PORT) {
    port = parseInt(process.env.SMART_HMR_PORT, 10)
  }
  if (process.env.SMART_HMR_VERBOSE === '1' || process.env.SMART_HMR_DEBUG === '1') {
    verbose = true
  }

  if (nextArgs.length === 0) {
    console.error(
      '[smart-hmr] No command specified. Usage: smart-hmr next dev [options]'
    )
    process.exit(1)
  }

  const rootDir = process.cwd()

  console.log('[smart-hmr] Starting route-aware HMR...')

  // Start the watcher
  let watcher: { stop: () => void; port: number } | null = null
  try {
    watcher = await startWatcher(rootDir, { port, verbose })
  } catch (err) {
    console.error('[smart-hmr] Failed to start watcher:', err)
    console.error('[smart-hmr] Continuing without smart HMR (graceful degradation)')
  }

  // Spawn the Next.js command
  const command = nextArgs[0]
  const commandArgs = nextArgs.slice(1)

  // Determine how to invoke the command
  const isNextDirect = command === 'next'
  const binPath = isNextDirect
    ? resolve(rootDir, 'node_modules/.bin/next')
    : resolve(rootDir, 'node_modules/.bin', command)

  if (verbose) {
    console.log(`[smart-hmr] Spawning: ${binPath} ${commandArgs.join(' ')}`)
  }

  // On Windows with shell mode, paths with spaces must be quoted
  const quotedBinPath = process.platform === 'win32' ? `"${binPath}"` : binPath

  const child = spawn(quotedBinPath, commandArgs, {
    stdio: 'inherit',
    cwd: rootDir,
    env: {
      ...process.env,
      SMART_HMR_ACTIVE: '1',
      SMART_HMR_PORT: String(watcher?.port ?? port),
    },
    shell: true,
  })

  // Cleanup on exit
  function cleanup(code?: number) {
    watcher?.stop()
    process.exit(code ?? 0)
  }

  child.on('exit', (code) => {
    cleanup(code ?? 0)
  })

  child.on('error', (err) => {
    console.error('[smart-hmr] Failed to start Next.js:', err)
    cleanup(1)
  })

  process.on('SIGINT', () => cleanup(0))
  process.on('SIGTERM', () => cleanup(0))
}

function printHelp() {
  console.log(`
next-smart-hmr — Route-aware HMR for Next.js

USAGE
  smart-hmr [options] <next-command> [next-options]

EXAMPLES
  smart-hmr next dev                    Zero config
  smart-hmr next dev --turbopack        With Turbopack
  smart-hmr next-smart-dev              With next-smart-runner
  smart-hmr --verbose next dev          Debug logging
  smart-hmr --port 3003 next dev        Custom watcher port

OPTIONS
  --port <number>    Watcher WebSocket port (default: 3002)
  --verbose          Enable debug logging
  --debug            Alias for --verbose
  --help, -h         Show this help
  --version, -v      Show version

ENVIRONMENT VARIABLES
  SMART_HMR_PORT     Override watcher port
  SMART_HMR_VERBOSE  Set to "1" for debug logging
  SMART_HMR_DEBUG    Alias for SMART_HMR_VERBOSE

CONFIG FILE (optional)
  smart-hmr.config.ts | .js | .json in project root
`)
}

function printVersion() {
  try {
    const pkg = require('../../package.json')
    console.log(`next-smart-hmr v${pkg.version}`)
  } catch {
    console.log('next-smart-hmr v1.0.0')
  }
}

main().catch((err) => {
  console.error('[smart-hmr] Fatal error:', err)
  process.exit(1)
})
