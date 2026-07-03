import type { ConnectMode } from './Connect.types'

const MCP_FEATURES_REQUIRING_DATA_API = ['database'] as const

/**
 * MCP with no explicit feature filter enables all groups except Storage by default,
 * which includes Database tools that depend on PostgREST.
 */
export function mcpSelectionRequiresDataApi(mcpFeatures: unknown): boolean {
  if (!Array.isArray(mcpFeatures) || mcpFeatures.length === 0) return true
  return mcpFeatures.some((feature) =>
    MCP_FEATURES_REQUIRING_DATA_API.includes(
      feature as (typeof MCP_FEATURES_REQUIRING_DATA_API)[number]
    )
  )
}

export function shouldFetchDataApiConfig({
  mode,
  mcpFeatures,
}: {
  mode: ConnectMode
  mcpFeatures?: unknown
}): boolean {
  if (mode === 'framework') return true
  if (mode === 'mcp') return mcpSelectionRequiresDataApi(mcpFeatures)
  return false
}

export function shouldShowDataApiDisabledWarning({
  mode,
  mcpFeatures,
  isDataApiEnabled,
  isPending,
  isError,
}: {
  mode: ConnectMode
  mcpFeatures?: unknown
  isDataApiEnabled: boolean
  isPending: boolean
  isError: boolean
}): boolean {
  if (isPending || isError || isDataApiEnabled) return false
  return shouldFetchDataApiConfig({ mode, mcpFeatures })
}
