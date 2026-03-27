'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { setupVisibilityRefresh } from './visibility-refresh'
import type { SmartHMRProps } from '../shared/types'

/**
 * Client component that:
 * 1. Tracks the current route via usePathname()
 * 2. Updates window.__SMART_HMR_STATE__.pathname
 * 3. Sets up visibility-based catch-up refresh
 */
export function SmartHMRClient({ port, debug }: SmartHMRProps) {
  const pathname = usePathname()
  const router = useRouter()
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  // Keep the state's pathname in sync with the current route
  useEffect(() => {
    const state = (window as any).__SMART_HMR_STATE__
    if (state) {
      state.pathname = pathname
      if (state.debug) {
        console.log(`[smart-hmr] Route: ${pathname}`)
      }
    }
  }, [pathname])

  // Set up visibility-based catch-up refresh
  useEffect(() => {
    const cleanup = setupVisibilityRefresh(() => {
      router.refresh()
    })

    return cleanup
  }, [router])

  return null
}

export default SmartHMRClient
