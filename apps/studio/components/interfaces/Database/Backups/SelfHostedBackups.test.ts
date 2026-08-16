import { describe, expect, it } from 'vitest'

import { formatManagementError, isSelfHostedManagementUnavailable } from './SelfHostedBackups'

describe('self-hosted backup helpers', () => {
  it('turns upstream backup worker failures into runtime guidance', () => {
    const error = new Error('upstream_operation_failed')

    expect(formatManagementError(error)).toContain('backup job runner rejected the operation')
    expect(isSelfHostedManagementUnavailable(error)).toBe(true)
  })

  it('classifies missing management API as a self-host configuration state', () => {
    const error = new Error('Management API is not configured')

    expect(formatManagementError(error)).toContain('management API is not configured')
    expect(isSelfHostedManagementUnavailable(error)).toBe(true)
  })

  it('does not hide unrelated errors', () => {
    const error = new Error('permission denied')

    expect(formatManagementError(error)).toBe('permission denied')
    expect(isSelfHostedManagementUnavailable(error)).toBe(false)
  })
})
