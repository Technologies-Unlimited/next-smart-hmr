// Public API exports
export { SmartHMR, SmartHMRScript, SmartHMRClient } from './client/SmartHMR.js'
export { getBootstrapScript } from './client/bootstrap.js'
export { setupVisibilityRefresh } from './client/visibility-refresh.js'
export { startWatcher } from './server/watcher.js'
export { RouteMapper, detectAppDir, loadConfig } from './server/route-mapper.js'
export { DependencyGraph } from './server/dependency-graph.js'

export type {
  SmartHMRProps,
  SmartHMRConfig,
  SmartHMRState,
  SmartHMRMessage,
  SmartHMRRoutesMessage,
  SmartHMRConnectedMessage,
  RouteEntry,
  AffectedRoutesResult,
  GraphStats,
} from './shared/types.js'

export { DEFAULT_CONFIG } from './shared/types.js'

/**
 * Helper to define a typed smart-hmr config file.
 *
 * Usage in smart-hmr.config.ts:
 * ```ts
 * import { defineConfig } from 'next-smart-hmr'
 *
 * export default defineConfig({
 *   port: 3002,
 *   verbose: false,
 * })
 * ```
 */
export function defineConfig(
  config: Partial<import('./shared/types.js').SmartHMRConfig>
) {
  return config
}
