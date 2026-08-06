import type { NextApiRequest, NextApiResponse } from 'next'

import {
  requestSelfHostedManagement,
  SelfHostedManagementError,
} from '@/lib/api/self-hosted/management'
import { IS_PLATFORM } from '@/lib/constants'

const SAFE_NAME = /^[a-z][a-z0-9_-]{2,62}$/

function nameFromDescription(description: unknown) {
  const base = String(description ?? 'studio-key')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return SAFE_NAME.test(base) ? base : `studio-key-${Date.now().toString(36)}`
}

function normalizeKey(key: any) {
  return {
    id: key.id,
    description: key.description ?? key.name ?? 'Self-hosted runtime credential',
    access_key: key.access_key ?? key.accessKeyId ?? key.keyId ?? '',
    created_at: key.created_at ?? key.createdAt ?? null,
    status: key.status ?? 'standby',
  }
}

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
    const body =
      req.method === 'POST'
        ? { name: nameFromDescription(req.body?.description ?? req.body?.name) }
        : undefined
    const data = await requestSelfHostedManagement({
      projectRef,
      resource: ['storage', 's3-keys'],
      method: req.method,
      body,
    })

    if (req.method === 'POST') {
      const key = normalizeKey((data as any)?.key ?? data)
      return res.status(201).json({
        ...key,
        secret_key: (data as any)?.secretAccessKey ?? (data as any)?.secret_key,
        operation: (data as any)?.operation,
      })
    }

    return res.status(200).json({ data: ((data as any)?.keys ?? []).map(normalizeKey) })
  } catch (error) {
    const status = error instanceof SelfHostedManagementError ? error.statusCode : 500
    const message = error instanceof Error ? error.message : 'Unable to manage S3 credentials'
    return res.status(status).json({ error: { message } })
  }
}
