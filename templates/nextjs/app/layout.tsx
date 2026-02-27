import type { Metadata } from 'next'
import { parseKey } from 'cms-client'
import { cms } from '@/lib/cms'
import { heroSection, teamSection } from '@/lib/sections'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: '{{PROJECTNAME}}',
  description: 'Powered by Based CMS',
}

const slug = process.env['BASED-CMS-SLUG']!
const parsed = parseKey(process.env['BASED-CMS-KEY']!)

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Register sections on every server boot — idempotent
  await cms.registerSections([heroSection, teamSection])

  return (
    <html lang="en">
      <body>
        <Providers
          slug={slug}
          convexUrl={parsed.convexUrl}
          env={parsed.env === 'live' ? 'production' : 'preview'}
        >
          {children}
        </Providers>
      </body>
    </html>
  )
}
