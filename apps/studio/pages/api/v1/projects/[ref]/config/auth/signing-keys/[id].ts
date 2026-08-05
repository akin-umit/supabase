import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import {
  JwtSigningKeysManagementApiError,
  revokeSelfHostedSigningKey,
  updateSelfHostedSigningKey,
} from '@/lib/api/self-hosted/jwt-signing-keys'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ref = Array.isArray(req.query.ref) ? undefined : req.query.ref
  const id = Array.isArray(req.query.id) ? undefined : req.query.id
  if (!ref || !id) return res.status(400).json({ message: 'Project ref and key id are required' })

  try {
    if (req.method === 'PATCH') {
      return res.status(200).json(await updateSelfHostedSigningKey(ref, id, req.body?.status))
    }
    if (req.method === 'DELETE') {
      return res.status(200).json(await revokeSelfHostedSigningKey(ref, id))
    }
    res.setHeader('Allow', ['PATCH', 'DELETE'])
    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    const status = error instanceof JwtSigningKeysManagementApiError ? error.statusCode : 500
    const message = error instanceof Error ? error.message : 'JWT signing key operation failed'
    return res.status(status).json({ message })
  }
}
