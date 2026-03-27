/**
 * Sets up a visibility change listener that triggers a catch-up refresh
 * when a tab becomes visible after having HMR updates suppressed.
 *
 * Returns a cleanup function to remove the listener.
 */
export function setupVisibilityRefresh(
  refreshFn: () => void
): () => void {
  function handleVisibilityChange() {
    if (document.visibilityState !== 'visible') return

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

    // Small delay to let the tab fully render before refreshing
    setTimeout(refreshFn, 50)
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}
