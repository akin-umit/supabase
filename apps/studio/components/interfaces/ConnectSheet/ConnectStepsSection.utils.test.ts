import { describe, expect, test } from 'vitest'

import type { ConnectMode } from './Connect.types'
import {
  mcpSelectionRequiresDataApi,
  shouldFetchDataApiConfig,
  shouldShowDataApiDisabledWarning,
} from './ConnectStepsSection.utils'

const ALL_MODES: ConnectMode[] = ['framework', 'direct', 'orm', 'mcp', 'server', 'catalog']

describe('mcpSelectionRequiresDataApi', () => {
  test('returns true when no features are selected (server default includes database)', () => {
    expect(mcpSelectionRequiresDataApi(undefined)).toBe(true)
    expect(mcpSelectionRequiresDataApi([])).toBe(true)
  })

  test('returns true when database is selected', () => {
    expect(mcpSelectionRequiresDataApi(['database'])).toBe(true)
    expect(mcpSelectionRequiresDataApi(['docs', 'database'])).toBe(true)
  })

  test('returns false when database is not selected', () => {
    expect(mcpSelectionRequiresDataApi(['docs'])).toBe(false)
    expect(mcpSelectionRequiresDataApi(['docs', 'account'])).toBe(false)
  })
})

describe('shouldFetchDataApiConfig', () => {
  test('returns true for framework mode', () => {
    expect(shouldFetchDataApiConfig({ mode: 'framework' })).toBe(true)
  })

  test('returns true for mcp when database tools may be used', () => {
    expect(shouldFetchDataApiConfig({ mode: 'mcp', mcpFeatures: [] })).toBe(true)
    expect(shouldFetchDataApiConfig({ mode: 'mcp', mcpFeatures: ['database'] })).toBe(true)
  })

  test('returns false for mcp when database is excluded', () => {
    expect(shouldFetchDataApiConfig({ mode: 'mcp', mcpFeatures: ['docs'] })).toBe(false)
  })

  test.each(['direct', 'orm', 'server', 'catalog'] as const)(
    'returns false for %s mode',
    (mode) => {
      expect(shouldFetchDataApiConfig({ mode })).toBe(false)
    }
  )
})

describe('shouldShowDataApiDisabledWarning', () => {
  test.each(ALL_MODES)('returns false while pending for %s mode', (mode) => {
    expect(
      shouldShowDataApiDisabledWarning({
        mode,
        isDataApiEnabled: false,
        isPending: true,
        isError: false,
      })
    ).toBe(false)
  })

  test('returns false when config query errored', () => {
    expect(
      shouldShowDataApiDisabledWarning({
        mode: 'framework',
        isDataApiEnabled: false,
        isPending: false,
        isError: true,
      })
    ).toBe(false)
  })

  test('returns true for framework when Data API is disabled', () => {
    expect(
      shouldShowDataApiDisabledWarning({
        mode: 'framework',
        isDataApiEnabled: false,
        isPending: false,
        isError: false,
      })
    ).toBe(true)
  })

  test('returns true for mcp with database tools when Data API is disabled', () => {
    expect(
      shouldShowDataApiDisabledWarning({
        mode: 'mcp',
        mcpFeatures: ['database'],
        isDataApiEnabled: false,
        isPending: false,
        isError: false,
      })
    ).toBe(true)
  })

  test('returns false for mcp without database tools when Data API is disabled', () => {
    expect(
      shouldShowDataApiDisabledWarning({
        mode: 'mcp',
        mcpFeatures: ['docs'],
        isDataApiEnabled: false,
        isPending: false,
        isError: false,
      })
    ).toBe(false)
  })

  test('returns false for server when Data API is disabled', () => {
    expect(
      shouldShowDataApiDisabledWarning({
        mode: 'server',
        isDataApiEnabled: false,
        isPending: false,
        isError: false,
      })
    ).toBe(false)
  })

  test('returns false for catalog when Data API is disabled', () => {
    expect(
      shouldShowDataApiDisabledWarning({
        mode: 'catalog',
        isDataApiEnabled: false,
        isPending: false,
        isError: false,
      })
    ).toBe(false)
  })

  test.each(['framework', 'mcp'] as const)(
    'returns false when %s mode has Data API enabled',
    (mode) => {
      expect(
        shouldShowDataApiDisabledWarning({
          mode,
          mcpFeatures: mode === 'mcp' ? ['database'] : undefined,
          isDataApiEnabled: true,
          isPending: false,
          isError: false,
        })
      ).toBe(false)
    }
  )
})
