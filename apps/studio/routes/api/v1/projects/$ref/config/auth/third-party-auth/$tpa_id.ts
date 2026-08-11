// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'

import { toWebHandler } from '@/compat/next/api'
import nextHandler from '@/pages/api/v1/projects/[ref]/config/auth/third-party-auth/[tpa_id]'

const handler = toWebHandler(nextHandler)

export const Route = createFileRoute('/api/v1/projects/$ref/config/auth/third-party-auth/$tpa_id')({
  server: { handlers: { DELETE: handler } },
})
