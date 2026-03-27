// This is a SERVER component — no 'use client' directive.
// The inline <script> renders in the initial HTML (before hydration),
// which is critical: the WebSocket interceptor must be in place
// before Next.js creates its HMR WebSocket during hydration.

import { getBootstrapScript } from './bootstrap'
import { SmartHMRClient } from './SmartHMRClient'
import type { SmartHMRProps } from '../shared/types'

/**
 * Main SmartHMR component — drop into your root layout.
 *
 * Usage:
 * ```tsx
 * import { SmartHMR } from 'next-smart-hmr/react'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html><body>
 *       {children}
 *       <SmartHMR />
 *     </body></html>
 *   )
 * }
 * ```
 */
export function SmartHMR({ port = 3002, debug = false }: SmartHMRProps) {
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <>
      {/* Server-rendered inline script — appears in initial HTML */}
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: getBootstrapScript({ port, debug }),
        }}
      />
      {/* Client component for route tracking + visibility refresh */}
      <SmartHMRClient port={port} debug={debug} />
    </>
  )
}

/**
 * Separate export for placing the script in <head>.
 */
export function SmartHMRScript({ port = 3002, debug = false }: SmartHMRProps) {
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: getBootstrapScript({ port, debug }),
      }}
    />
  )
}

export { SmartHMRClient } from './SmartHMRClient'
export default SmartHMR
