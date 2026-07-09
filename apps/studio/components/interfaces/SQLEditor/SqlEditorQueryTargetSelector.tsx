import { LOCAL_STORAGE_KEYS, useParams } from 'common'
import { ChevronDown } from 'lucide-react'
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'ui'

import { isWarehouseProjectEnabled } from '@/components/interfaces/Database/Warehouse/warehouseDemoStore'
import { useIsWarehouseEnabled } from '@/hooks/misc/useIsWarehouseEnabled'
import { useLocalStorageQuery } from '@/hooks/misc/useLocalStorage'

export type SqlQueryTarget = 'postgres' | 'warehouse'

const QUERY_TARGET_OPTIONS: { value: SqlQueryTarget; label: string; description: string }[] = [
  {
    value: 'postgres',
    label: 'Postgres',
    description: 'Primary database connection',
  },
  {
    value: 'warehouse',
    label: 'Warehouse',
    description: 'Warehouse endpoint with 1:1 schema names',
  },
]

type SqlEditorQueryTargetSelectorProps = {
  className?: string
  align?: 'start' | 'end'
}

export function SqlEditorQueryTargetSelector({
  className,
  align = 'end',
}: SqlEditorQueryTargetSelectorProps) {
  const { ref: projectRef } = useParams()
  const isWarehouseFeatureEnabled = useIsWarehouseEnabled()
  const warehouseEnabled = isWarehouseProjectEnabled(projectRef)

  const [queryTarget, setQueryTarget] = useLocalStorageQuery<SqlQueryTarget>(
    LOCAL_STORAGE_KEYS.SQL_EDITOR_QUERY_TARGET(projectRef as string),
    'postgres'
  )

  if (!isWarehouseFeatureEnabled || !warehouseEnabled) return null

  const selectedOption =
    QUERY_TARGET_OPTIONS.find((option) => option.value === queryTarget) ?? QUERY_TARGET_OPTIONS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="tiny"
          variant="default"
          className={cn('h-[26px] justify-start gap-0 pr-3', className)}
        >
          <div className="flex min-w-0 items-center gap-1">
            <span className="text-foreground-muted">Database</span>
            <span className="max-w-32 truncate text-foreground">{selectedOption.label}</span>
            <ChevronDown className="shrink-0 text-muted" strokeWidth={1} size={12} />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align={align}>
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span>Query database</span>
          <span className="text-xs font-normal leading-snug text-foreground-light">
            Choose whether this query runs against Postgres or the Warehouse endpoint.
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={selectedOption.value}
          onValueChange={(value) => setQueryTarget(value as SqlQueryTarget)}
        >
          {QUERY_TARGET_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <div className="flex min-w-0 flex-col">
                <span className="truncate">{option.label}</span>
                <span className="truncate text-xs text-foreground-lighter">
                  {option.description}
                </span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function useSqlQueryTarget(): SqlQueryTarget {
  const { ref: projectRef } = useParams()
  const [queryTarget] = useLocalStorageQuery<SqlQueryTarget>(
    LOCAL_STORAGE_KEYS.SQL_EDITOR_QUERY_TARGET(projectRef as string),
    'postgres'
  )
  return queryTarget
}
