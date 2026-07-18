import type { NextApiRequest, NextApiResponse } from 'next'

import { IS_PLATFORM } from '@/lib/constants'

function getSelfHostedCredentials() {
  const accessKey =
    process.env.S3_PROTOCOL_ACCESS_KEY_ID ?? process.env.STORAGE_S3_PROTOCOL_ACCESS_KEY_ID

  if (!accessKey) return { data: [] }

  return {
    data: [
      {
        id: 'self-hosted-runtime',
        access_key: accessKey,
        description: 'Self-hosted runtime credential',
        created_at: '1970-01-01T00:00:00.000Z',
      },
    ],
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (IS_PLATFORM) {
    return res.status(404).json({ error: { message: 'Not found' } })
  }

  switch (req.method) {
    case 'GET':
      return res.status(200).json(getSelfHostedCredentials())
    case 'POST':
      return res.status(405).json({
        error: {
          message:
            'S3 access keys are managed by the self-hosted Storage service environment. Update the runtime secret manager, then redeploy Storage.',
        },
      })
    default:
      res.setHeader('Allow', 'GET, POST')
      return res.status(405).json({ error: { message: 'Method not allowed' } })
  }
}
