import type { NextApiRequest, NextApiResponse } from 'next'

import { IS_PLATFORM } from '@/lib/constants'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (IS_PLATFORM) {
    return res.status(404).json({ error: { message: 'Not found' } })
  }

  switch (req.method) {
    case 'DELETE':
      return res.status(405).json({
        error: {
          message:
            'S3 access keys are managed by the self-hosted Storage service environment. Remove or rotate them in the runtime secret manager, then redeploy Storage.',
        },
      })
    default:
      res.setHeader('Allow', 'DELETE')
      return res.status(405).json({ error: { message: 'Method not allowed' } })
  }
}
