/**
 * Sets up a visibility change listener that triggers a catch-up refresh
 * when a tab becomes visible after having HMR updates suppressed.
 *
 * Returns a cleanup function to remove the listener.
 */
export function setupVisibilityRefresh(
  refreshFn: () => void
): () => void {
  let catchUpTimer: ReturnType<typeof setTimeout> | null = null

  function handleVisibilityChange() {
    if (document.visibilityState !== 'visible') {
      // Tab became hidden — cancel any pending catch-up
      if (catchUpTimer) {
        clearTimeout(catchUpTimer)
        catchUpTimer = null
      }
      return
    }

    const state = (window as any).__SMART_HMR_STATE__
    if (!state || state.suppressedCount === 0) return

    // Tab became visible and has suppressed updates — catch up
    const count = state.suppressedCount
    state.suppressedCount = 0

    if (state.debug) {
      console.log(
        `[smart-hmr] Tab visible — catching up on ${count} suppressed update(s)`
      )
    }

    // Longer delay to let the tab fully settle and avoid racing with navigation
    if (catchUpTimer) clearTimeout(catchUpTimer)
    catchUpTimer = setTimeout(() => {
      catchUpTimer = null
      // Double-check we're still visible before refreshing
      if (document.visibilityState === 'visible') {
        refreshFn()
      }
    }, 300)
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    if (catchUpTimer) clearTimeout(catchUpTimer)
  }
}
