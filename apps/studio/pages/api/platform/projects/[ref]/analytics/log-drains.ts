import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { IS_PLATFORM } from '@/lib/constants'
import { PROJECT_ANALYTICS_URL } from '@/lib/constants/api'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  const missingEnvVars = envVarsSet()

  if (missingEnvVars !== true) {
    return res
      .status(IS_PLATFORM ? 500 : 503)
      .json({ error: { message: `${missingEnvVars.join(', ')} env variables are not set` } })
  }

  const baseUrl = PROJECT_ANALYTICS_URL
  if (!baseUrl) {
    return res
      .status(IS_PLATFORM ? 500 : 503)
      .json({ error: { message: `LOGFLARE_URL env variable is not set` } })
  }

  switch (method) {
    case 'GET':
      // list log drains
      const url = new URL(baseUrl)
      url.pathname = '/api/backends'
      url.search = new URLSearchParams({
        'metadata[type]': 'log-drain',
      }).toString()
      const upstream = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.LOGFLARE_PRIVATE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })

      if (!upstream.ok) {
        const message = await upstream.text().catch(() => '')
        return res.status(upstream.status).json({
          error: { message: message || 'Failed to fetch log drains from Logflare' },
        })
      }

      const resp = await upstream.json()

      if (!Array.isArray(resp)) {
        return res
          .status(500)
          .json({ error: { message: 'Unexpected response format from upstream' } })
      }

      return res.status(200).json(resp)
    case 'POST':
      // create the log drain
      const postUrl = new URL(baseUrl)
      postUrl.pathname = '/api/backends'
      const postResponse = await fetch(postUrl, {
        body: JSON.stringify({
          ...req.body,
          config: req.body.config,
          metadata: {
            type: 'log-drain',
          },
        }),
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.LOGFLARE_PRIVATE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })
      const postResult = await postResponse.json().catch(() => undefined)
      if (!postResponse.ok || !postResult) {
        return res.status(postResponse.status).json({
          error: { message: postResult?.error ?? 'Failed to create log drain in Logflare' },
        })
      }

      const sourcesGetUrl = new URL(baseUrl)
      sourcesGetUrl.pathname = '/api/sources'
      const sourcesResponse = await fetch(sourcesGetUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.LOGFLARE_PRIVATE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })
      const sources = await sourcesResponse.json().catch(() => undefined)
      if (!sourcesResponse.ok || !Array.isArray(sources)) {
        return res.status(sourcesResponse.status).json({
          error: { message: 'Log drain was created, but Logflare sources could not be loaded' },
        })
      }

      const params = sources
        .filter((source: { name: string; metadata: { type: string } }) =>
          [
            'cloudflare.logs.prod',
            'deno-relay-logs',
            'deno-subhosting-events',
            'gotrue.logs.prod',
            'pgbouncer.logs.prod',
            'postgrest.logs.prod',
            'postgres.logs',
            'realtime.logs.prod',
            'storage.logs.prod.2',
          ].includes(source.name.toLocaleLowerCase())
        )
        .map((source: { name: string; id: number }) => {
          return { backend_id: postResult.id, lql_string: `~".*?"`, source_id: source.id }
        })
      const rulesPostUrl = new URL(baseUrl)
      rulesPostUrl.pathname = '/api/rules'
      const ruleResponses = await Promise.all(
        params.map((param: any) =>
          fetch(rulesPostUrl, {
            method: 'POST',
            body: JSON.stringify(param),
            headers: {
              Authorization: `Bearer ${process.env.LOGFLARE_PRIVATE_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          })
        )
      )
      const failedRule = ruleResponses.find((response) => !response.ok)
      if (failedRule) {
        return res.status(failedRule.status).json({
          error: { message: 'Log drain was created, but Logflare source routing failed' },
        })
      }
      return res.status(201).json(postResult)

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

const envVarsSet = () => {
  const missingEnvVars = [
    process.env.LOGFLARE_PRIVATE_ACCESS_TOKEN ? null : 'LOGFLARE_PRIVATE_ACCESS_TOKEN',
    process.env.LOGFLARE_URL ? null : 'LOGFLARE_URL',
  ].filter((v) => v)
  if (missingEnvVars.length == 0) {
    return true
  } else {
    return missingEnvVars
  }
}
