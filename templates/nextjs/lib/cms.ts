import { createCMSClient, type CMSClient } from '@based-cms/client'

let client: CMSClient | null | undefined

/**
 * Lazily-created CMS client.
 *
 * Returns `null` when BASED_CMS_KEY or BASED_CMS_SLUG is unset — or the key is
 * malformed — so the app can render a friendly setup page instead of crashing
 * at import time (or at server boot via instrumentation.ts).
 */
export function getCMS(): CMSClient | null {
  if (client === undefined) {
    const key = process.env.BASED_CMS_KEY
    const slug = process.env.BASED_CMS_SLUG
    if (key && slug) {
      try {
        client = createCMSClient({ key, slug })
      } catch (err) {
        // createCMSClient parses the key eagerly and throws on a malformed
        // one — the root layout renders the setup page for that case, so
        // never let it crash the server.
        console.warn('[cms] BASED_CMS_KEY is invalid:', err)
        client = null
      }
    } else {
      client = null
    }
  }
  return client
}
