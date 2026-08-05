import type { NextApiRequest, NextApiResponse } from 'next'

import {
  requestSelfHostedManagement,
  SelfHostedManagementError,
} from '@/lib/api/self-hosted/management'

const METHODS = new Set(['GET', 'POST', 'PATCH', 'DELETE'])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ref = req.query.ref
  const resource = req.query.resource
  const method = req.method
  if (typeof ref !== 'string' || !Array.isArray(resource) || !method || !METHODS.has(method)) {
    return res.status(400).json({ error: 'Invalid management request' })
  }

  try {
    const data = await requestSelfHostedManagement({
      projectRef: ref,
      resource,
      method: method as 'GET' | 'POST' | 'PATCH' | 'DELETE',
      body: req.body,
    })
    return res.status(method === 'POST' ? 201 : 200).json(data)
  } catch (error) {
    const status = error instanceof SelfHostedManagementError ? error.statusCode : 500
    const message = error instanceof Error ? error.message : 'Management operation failed'
    return res.status(status).json({ error: message })
  }
}
