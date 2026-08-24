import type { Metadata } from 'next'
import { keyEnvToContentEnv, parseKey } from '@based-cms/client'
import { Providers } from '@/components/providers'
import { SetupRequired } from '@/components/setup-required'
import './globals.css'

export const metadata: Metadata = {
  title: '{{PROJECTNAME}}',
  description: 'Powered by Based CMS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const slug = process.env.BASED_CMS_SLUG
  const key = process.env.BASED_CMS_KEY

  // Resolve the Convex URL and content env from the key. If the env isn't
  // configured (or the key is malformed), render a friendly setup page
  // instead of crashing.
  let convexUrl: string | null = null
  let env: 'production' | 'test' = 'production'
  let keyInvalid = false
  if (key) {
    try {
      const parsed = parseKey(key)
      convexUrl = parsed.convexUrl
      // bcms_test-* keys read test content, bcms_live-* production — the
      // browser must query the same env the server does
      env = keyEnvToContentEnv(parsed.env)
    } catch {
      keyInvalid = true
    }
  }

  return (
    <html lang="en">
      <body>
        {slug && convexUrl ? (
          <Providers slug={slug} convexUrl={convexUrl} env={env}>
            {children}
          </Providers>
        ) : (
          <SetupRequired
            hasSlug={Boolean(slug)}
            hasKey={Boolean(key)}
            keyInvalid={keyInvalid}
          />
        )}
      </body>
    </html>
  )
}
