// ─── Watcher → Browser WebSocket Messages ───

export interface SmartHMRRoutesMessage {
  type: 'smart-hmr:routes'
  affectedRoutes: string[]
  changedFiles: string[]
  timestamp: number
}

export interface SmartHMRConnectedMessage {
  type: 'smart-hmr:connected'
  fileCount: number
  routeCount: number
  buildTimeMs: number
}

export type SmartHMRMessage = SmartHMRRoutesMessage | SmartHMRConnectedMessage

// ─── Dependency Graph ───

export interface RouteEntry {
  routeId: string
  entryFile: string
  colocatedFiles: string[]
  layouts: string[]
  routeType: 'page' | 'api'
}

export interface ParsedImport {
  specifier: string
  isDynamic: boolean
  isTypeOnly: boolean
}

export interface ScannedFile {
  filePath: string
  imports: ParsedImport[]
  boundary: 'server' | 'client' | null
  mtimeMs: number
}

export interface AffectedRoutesResult {
  routes: string[]
  reasons: Map<string, string[]>
}

export interface GraphStats {
  totalFiles: number
  totalRoutes: number
  totalEdges: number
  buildTimeMs: number
}

// ─── Configuration ───

export interface SmartHMRConfig {
  port: number
  debounce: number
  verbose: boolean
  include: string[]
  exclude: string[]
  routeOverrides: Record<string, string[]>
}

export const DEFAULT_CONFIG: SmartHMRConfig = {
  port: 3002,
  debounce: 50,
  verbose: false,
  include: ['src/**', 'app/**'],
  exclude: ['**/*.test.*', '**/__tests__/**', '**/node_modules/**'],
  routeOverrides: {},
}

// ─── Client-Side State ───

export interface SmartHMRState {
  enabled: boolean
  pathname: string | null
  affectedRoutes: string[] | null
  suppressedCount: number
  debug: boolean
}

// ─── React Component Props ───

export interface SmartHMRProps {
  port?: number
  debug?: boolean
}
