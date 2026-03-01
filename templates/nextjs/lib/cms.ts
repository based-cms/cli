import { createCMSClient } from '@based-cms/client'

export const cms = createCMSClient({
  key: process.env['BASED-CMS-KEY']!,
})
