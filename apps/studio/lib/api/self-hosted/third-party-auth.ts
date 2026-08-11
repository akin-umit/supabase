import { requestSelfHostedManagement, SelfHostedManagementError } from './management'

export class ThirdPartyAuthManagementApiError extends Error {
  constructor(
    message: string,
    public statusCode = 500
  ) {
    super(message)
    this.name = 'ThirdPartyAuthManagementApiError'
  }
}

const MANAGEMENT_UNAVAILABLE_MESSAGE =
  'Third-party auth integrations require a configured self-host management API'

function normalizeError(error: unknown, fallback: string): ThirdPartyAuthManagementApiError {
  if (error instanceof SelfHostedManagementError) {
    if (error.statusCode === 503) {
      return new ThirdPartyAuthManagementApiError(MANAGEMENT_UNAVAILABLE_MESSAGE, 503)
    }
    return new ThirdPartyAuthManagementApiError(fallback, error.statusCode)
  }
  return new ThirdPartyAuthManagementApiError(error instanceof Error ? error.message : fallback)
}

export async function listSelfHostedThirdPartyAuthIntegrations(projectRef: string) {
  try {
    const payload = await requestSelfHostedManagement({
      projectRef,
      resource: ['auth', 'third-party-auth'],
      method: 'GET',
    })

    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).integrations)) {
      return (payload as any).integrations
    }
    return []
  } catch (error) {
    if (error instanceof SelfHostedManagementError) return []
    throw normalizeError(error, 'Unable to list third-party auth integrations')
  }
}

export async function createSelfHostedThirdPartyAuthIntegration(projectRef: string, body: unknown) {
  try {
    return await requestSelfHostedManagement({
      projectRef,
      resource: ['auth', 'third-party-auth'],
      method: 'POST',
      body,
    })
  } catch (error) {
    throw normalizeError(error, 'Unable to create third-party auth integration')
  }
}

export async function deleteSelfHostedThirdPartyAuthIntegration(projectRef: string, tpaId: string) {
  try {
    return await requestSelfHostedManagement({
      projectRef,
      resource: ['auth', 'third-party-auth', tpaId],
      method: 'DELETE',
    })
  } catch (error) {
    throw normalizeError(error, 'Unable to delete third-party auth integration')
  }
}
