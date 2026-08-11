// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'

import { toWebHandler } from '@/compat/next/api'
import nextHandler from '@/pages/api/platform/organizations/[slug]/usage'

const handler = toWebHandler(nextHandler)

export const Route = createFileRoute('/api/platform/organizations/$slug/usage')({
  server: { handlers: { GET: handler } },
})
