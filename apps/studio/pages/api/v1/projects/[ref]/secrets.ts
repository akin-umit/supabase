import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getFunctionSecretStore } from '@/lib/api/self-hosted/functions/secrets'
import {
  SecretStoreCapacityError,
  SecretStoreConflictError,
  SecretStoreDataError,
  SecretStoreValidationError,
} from '@/lib/api/self-hosted/functions/secrets/fileSystemStore'

export default function handlerWithErrorCatching(req: NextApiRequest, res: NextApiResponse) {
  return apiWrapper(req, res, handler, { withAuth: true })
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return handleRequest(res, async () =>
        res.status(200).json(await getFunctionSecretStore().list())
      )
    case 'POST':
      return handleRequest(res, async () => {
        await getFunctionSecretStore().upsert(req.body)
        res.status(201).end()
      })
    case 'DELETE':
      return handleRequest(res, async () => {
        await getFunctionSecretStore().delete(req.body)
        res.status(200).end()
      })
    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
      return res
        .status(405)
        .json({ data: null, error: { message: `Method ${req.method} Not Allowed` } })
  }
}

async function handleRequest(res: NextApiResponse, operation: () => Promise<void>) {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof SecretStoreValidationError) {
      return res.status(400).json({ error: { message: error.message } })
    }
    if (error instanceof SecretStoreConflictError) {
      return res.status(409).json({ error: { message: 'The secret store is busy' } })
    }
    if (error instanceof SecretStoreCapacityError) {
      return res.status(413).json({ error: { message: 'The secret store exceeds its capacity' } })
    }
    if (error instanceof SecretStoreDataError) {
      return res.status(500).json({ error: { message: 'The secret store is unavailable' } })
    }
    return res.status(500).json({ error: { message: 'Secret operation failed' } })
  }
}
