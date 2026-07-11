import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getProjectOperations } from '@/lib/api/self-hosted/project-operations'

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

const handleGet = async (_req: NextApiRequest, res: NextApiResponse) => {
  const projectRef = Array.isArray(_req.query.ref) ? undefined : _req.query.ref
  if (!projectRef || !/^[A-Za-z0-9_-]{1,64}$/.test(projectRef)) {
    return res.status(400).json({ data: null, error: { message: 'Invalid project reference' } })
  }

  const response = await getProjectOperations()
  return res.status(200).json(response)
}
