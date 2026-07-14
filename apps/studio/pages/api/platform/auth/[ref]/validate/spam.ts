import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { assertSelfHosted } from '@/lib/api/self-hosted/util'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  assertSelfHosted()

  switch (req.method) {
    case 'POST':
      return res.status(200).json({ rules: [] })
    default:
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }
}
