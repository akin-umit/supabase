import { createFileRoute } from '@tanstack/react-router'

import { toWebHandler } from '@/compat/next/api'
import nextHandler from '@/pages/api/v1/projects/[ref]/config/auth/signing-keys/[id]'

const handler = toWebHandler(nextHandler)

export const Route = createFileRoute('/api/v1/projects/$ref/config/auth/signing-keys/$id')({
  server: { handlers: { PATCH: handler, DELETE: handler } },
})
