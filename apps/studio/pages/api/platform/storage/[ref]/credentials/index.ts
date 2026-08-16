import type { NextApiRequest, NextApiResponse } from 'next'

import {
  requestSelfHostedManagement,
  SelfHostedManagementError,
} from '@/lib/api/self-hosted/management'
import { STORAGE_RUNTIME_WRITE_BRIDGE_REASON } from '@/lib/api/self-hosted/storage'
import { IS_PLATFORM } from '@/lib/constants'

const SAFE_NAME = /^[a-z][a-z0-9_-]{2,62}$/

type UnknownRecord = Record<string, unknown>

function nameFromDescription(description: unknown) {
  const base = String(description ?? 'studio-key')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return SAFE_NAME.test(base) ? base : `studio-key-${Date.now().toString(36)}`
}

function getRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : {}
}

function normalizeKey(value: unknown) {
  const key = getRecord(value)
  const accessKey =
    key.access_key ?? key.accessKey ?? key.accessKeyId ?? key.access_key_id ?? key.keyId ?? key.id
  return {
    id: key.id,
    description: key.description ?? key.name ?? 'Self-hosted runtime credential',
    access_key: accessKey,
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
      const payload = getRecord(data)
      const operation = getRecord(payload.operation)

      if (operation.status === 'failed') {
        const operationError = getRecord(operation.error)
        const message =
          typeof operationError.message === 'string'
            ? operationError.message
            : typeof operation.message === 'string'
              ? operation.message
              : typeof payload.message === 'string'
                ? payload.message
                : 'S3 access key activation failed'

        return res.status(502).json({
          error: {
            message,
            code: operation.code ?? operationError.code ?? 's3_key_activation_failed',
            operation,
          },
        })
      }

      const keyPayload = getRecord(payload.key ?? payload.credential ?? data)
      const key = normalizeKey(keyPayload)
      const secretKey =
        payload.secretAccessKey ??
        payload.secret_access_key ??
        payload.secretKey ??
        payload.secret_key ??
        keyPayload.secretAccessKey ??
        keyPayload.secret_access_key ??
        keyPayload.secretKey ??
        keyPayload.secret_key

      if (!key.access_key || !secretKey) {
        return res.status(502).json({
          error: {
            message: 'S3 access key response did not include the created credentials',
            code: 's3_key_response_invalid',
          },
        })
      }

      return res.status(201).json({
        ...key,
        secret_key: secretKey,
        operation: payload.operation,
      })
    }

    const payload = getRecord(data)
    const keys = Array.isArray(payload.keys)
      ? payload.keys
      : Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(data)
          ? data
          : []
    return res.status(200).json({ data: keys.map(normalizeKey) })
  } catch (error) {
    const status = error instanceof SelfHostedManagementError ? error.statusCode : 500
    const message =
      error instanceof SelfHostedManagementError && error.statusCode === 503
        ? STORAGE_RUNTIME_WRITE_BRIDGE_REASON
        : error instanceof Error
          ? error.message
          : 'Unable to manage S3 credentials'
    return res.status(status).json({ error: { message } })
  }
}
