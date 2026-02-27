'use client'

import { CMSProvider } from 'cms-client/react'

export function Providers({
  slug,
  convexUrl,
  children,
}: {
  slug: string
  convexUrl: string
  children: React.ReactNode
}) {
  return (
    <CMSProvider slug={slug} convexUrl={convexUrl}>
      {children}
    </CMSProvider>
  )
}
