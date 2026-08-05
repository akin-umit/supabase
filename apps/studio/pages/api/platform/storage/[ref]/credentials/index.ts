import type { NextApiRequest, NextApiResponse } from 'next'

import {
  requestSelfHostedManagement,
  SelfHostedManagementError,
} from '@/lib/api/self-hosted/management'
import { IS_PLATFORM } from '@/lib/constants'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (IS_PLATFORM) {
    return res.status(404).json({ error: { message: 'Not found' } })
  }

  const projectRef = String(req.query.ref ?? '')
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: { message: 'Method not allowed' } })
  }

  try {
    const data = await requestSelfHostedManagement({
      projectRef,
      resource: ['storage', 's3', 'credentials'],
      method: req.method,
      body: req.body,
    })
    return res.status(req.method === 'POST' ? 201 : 200).json(data)
  } catch (error) {
    const status = error instanceof SelfHostedManagementError ? error.statusCode : 500
    const message = error instanceof Error ? error.message : 'Unable to manage S3 credentials'
    return res.status(status).json({ error: { message } })
  }
}
