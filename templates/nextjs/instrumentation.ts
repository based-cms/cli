/**
 * Next.js instrumentation hook — `register()` runs once per server boot,
 * which is the right place to sync section definitions with the CMS
 * (instead of the per-request root layout).
 */
export async function register() {
  // Only run in the Node.js runtime — the edge runtime lacks the APIs the
  // CMS client needs, and register() is invoked once per runtime.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const [{ getCMS }, { heroSection, teamSection, blogSection }] = await Promise.all([
    import('./lib/cms'),
    import('./lib/sections'),
  ])

  const cms = getCMS()
  if (!cms) {
    console.warn(
      '[cms] BASED_CMS_KEY / BASED_CMS_SLUG not set (or key invalid) — skipping section registration.'
    )
    return
  }

  try {
    await cms.registerSections([heroSection, teamSection, blogSection])
  } catch (err) {
    // Registration failing (bad key, network) should not take the app down
    console.error('[cms] Failed to register sections:', err)
  }
}
