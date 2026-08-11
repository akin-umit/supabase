import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getSelfHostedProject } from '@/lib/api/self-hosted/organization'
import { PROJECT_REST_URL } from '@/lib/constants/api'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'GET':
      return handleGet(req, res)
    default:
      res.setHeader('Allow', ['GET'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  const ref = String(req.query.ref ?? 'default')
  const response = {
    ...(await getSelfHostedProject(ref)),
    connectionString: '',
    restUrl: PROJECT_REST_URL,
  }

  return res.status(200).json(response)
}
