'use client'

import { CMSProvider } from '@based-cms/client/react'

export function Providers({
  slug,
  convexUrl,
  env,
  children,
}: {
  slug: string
  convexUrl: string
  env: 'production' | 'test'
  children: React.ReactNode
}) {
  return (
    <CMSProvider slug={slug} convexUrl={convexUrl} env={env}>
      {children}
    </CMSProvider>
  )
}
