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

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).json({ error: { message: 'Method not allowed' } })
  }

  try {
    const data = await requestSelfHostedManagement({
      projectRef: String(req.query.ref ?? ''),
      resource: ['storage', 's3', 'credentials', String(req.query.id ?? '')],
      method: 'DELETE',
    })
    return res.status(200).json(data)
  } catch (error) {
    const status = error instanceof SelfHostedManagementError ? error.statusCode : 500
    const message = error instanceof Error ? error.message : 'Unable to revoke S3 credential'
    return res.status(status).json({ error: { message } })
  }
}
