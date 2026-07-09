import { Tooltip, TooltipContent, TooltipTrigger } from 'ui'
import { proxy, useSnapshot } from 'valtio'

import type { SqlQueryTarget } from './SqlEditorQueryTargetSelector'

export type SqlWarehouseHealthPreset = 'healthy' | 'catching_up' | 'degraded' | 'error'
export type SqlEditorQueryControlMode = 'compact' | 'separate'

export type SqlWarehouseResultSource =
  | { type: 'query_target' }
  | { type: 'search_path'; schema: string }
  | { type: 'query_reference' }

const SQL_WAREHOUSE_SCHEMA_PATTERN = /\b[a-zA-Z_][\w$]*_warehouse\s*\./i

const SQL_WAREHOUSE_HEALTH_LABELS: Record<SqlWarehouseHealthPreset, string> = {
  healthy: '',
  catching_up: 'Catching up',
  degraded: 'Degraded',
  error: 'Error',
}

const SQL_WAREHOUSE_HEALTH_TOOLTIPS: Record<SqlWarehouseHealthPreset, string> = {
  healthy: 'Warehouse replication is caught up with Postgres.',
  catching_up:
    'Warehouse replication is catching up. Recent writes may not appear in linked tables yet.',
  degraded: 'Warehouse replication is degraded. Query results may be stale.',
  error: 'Warehouse replication encountered an error. Check replication logs.',
}

const SQL_WAREHOUSE_HEALTH_CLASS_NAMES: Record<SqlWarehouseHealthPreset, string> = {
  healthy: 'text-foreground-light hover:text-foreground',
  catching_up: 'text-warning hover:text-warning-600',
  degraded: 'text-destructive hover:text-destructive-600',
  error: 'text-destructive hover:text-destructive-600',
}

export const sqlEditorWarehouseDemoStore = proxy<{
  health: SqlWarehouseHealthPreset
  queryControlMode: SqlEditorQueryControlMode
}>({
  health: 'healthy',
  queryControlMode: 'separate',
})

export function setSqlEditorWarehouseHealth(health: SqlWarehouseHealthPreset) {
  sqlEditorWarehouseDemoStore.health = health
}

export function setSqlEditorQueryControlMode(mode: SqlEditorQueryControlMode) {
  sqlEditorWarehouseDemoStore.queryControlMode = mode
}

export function resolveSqlWarehouseResultSource(
  sql: string,
  searchPath: string,
  queryTarget: SqlQueryTarget = 'postgres'
): SqlWarehouseResultSource | undefined {
  if (queryTarget === 'warehouse') {
    return { type: 'query_target' }
  }

  if (searchPath.endsWith('_warehouse')) {
    return { type: 'search_path', schema: searchPath }
  }

  if (SQL_WAREHOUSE_SCHEMA_PATTERN.test(sql)) {
    return { type: 'query_reference' }
  }

  return undefined
}

function getWarehouseResultSourceTooltip(source: SqlWarehouseResultSource) {
  if (source.type === 'query_target') {
    return 'Results are served from the Warehouse endpoint. Schemas and table names match Postgres.'
  }

  if (source.type === 'search_path') {
    return `Results are served from Warehouse because the search path starts with ${source.schema}.`
  }

  return 'Results include a linked Warehouse table referenced directly in the SQL.'
}

export function SqlWarehouseResultStatus({ source }: { source: SqlWarehouseResultSource }) {
  const snap = useSnapshot(sqlEditorWarehouseDemoStore)
  const health = snap.health as SqlWarehouseHealthPreset
  const shouldShowHealth = health !== 'healthy'

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="group inline-flex cursor-default text-foreground-light transition-colors hover:text-foreground">
            <span className="border-b border-dotted border-current/40 transition-colors group-hover:border-current/70">
              Warehouse
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-72">
          {getWarehouseResultSourceTooltip(source)}
        </TooltipContent>
      </Tooltip>
      {shouldShowHealth && (
        <>
          <span className="shrink-0 text-foreground-muted">·</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`group inline-flex cursor-default transition-colors ${SQL_WAREHOUSE_HEALTH_CLASS_NAMES[health]}`}
              >
                <span className="border-b border-dotted border-current/40 transition-colors group-hover:border-current/70">
                  {SQL_WAREHOUSE_HEALTH_LABELS[health]}
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-72">
              {SQL_WAREHOUSE_HEALTH_TOOLTIPS[health]}
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </span>
  )
}
