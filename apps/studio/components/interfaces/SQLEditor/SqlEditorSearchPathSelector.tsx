import { LOCAL_STORAGE_KEYS, useParams } from 'common'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'ui'

import { useSchemasQuery } from '@/data/database/schemas-query'
import { useLocalStorageQuery } from '@/hooks/misc/useLocalStorage'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'

type SearchPathOption = {
  value: string
  label: string
  description?: string
}

type SqlEditorSearchPathSelectorProps = {
  className?: string
  align?: 'start' | 'end'
}

const SEARCH_PATH_OPTIONS: SearchPathOption[] = [
  {
    value: 'public',
    label: 'public',
  },
  {
    value: 'auth',
    label: 'auth',
  },
  {
    value: 'storage',
    label: 'storage',
  },
]

export const DEFAULT_SQL_EDITOR_SEARCH_PATH = 'public'
const COMMON_SCHEMA_NAMES = ['public', 'auth', 'storage']
export const getSqlEditorSearchPathStorageKey = (ref: string) =>
  LOCAL_STORAGE_KEYS.SQL_EDITOR_SEARCH_PATH(ref)

function getSchemaDescription(schemaName: string) {
  if (schemaName.endsWith('_warehouse')) return 'Warehouse linked schema'

  return undefined
}

function getSchemaSortPriority(schemaName: string) {
  const commonIndex = COMMON_SCHEMA_NAMES.indexOf(schemaName)
  if (commonIndex !== -1) return commonIndex
  if (schemaName.endsWith('_warehouse')) return COMMON_SCHEMA_NAMES.length

  return COMMON_SCHEMA_NAMES.length + 1
}

function getSearchPathOption(value: string, options: SearchPathOption[]) {
  return (
    options.find((option) => option.value === value) ?? {
      value,
      label: value,
    }
  )
}

export function SqlEditorSearchPathSelector({
  className,
  align = 'end',
}: SqlEditorSearchPathSelectorProps) {
  const { ref } = useParams()
  const [isShowingMoreSchemas, setIsShowingMoreSchemas] = useState(false)
  const { data: project } = useSelectedProjectQuery()
  const { data: schemaData } = useSchemasQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })
  const [searchPath, setSearchPath] = useLocalStorageQuery(
    getSqlEditorSearchPathStorageKey(ref ?? 'unknown'),
    DEFAULT_SQL_EDITOR_SEARCH_PATH
  )
  const schemaOptions =
    schemaData !== undefined && schemaData.length > 0
      ? schemaData
          .map((schema) => ({
            value: schema.name,
            label: schema.name,
            description: getSchemaDescription(schema.name),
          }))
          .sort((a, b) => {
            const priority = getSchemaSortPriority(a.label) - getSchemaSortPriority(b.label)
            return priority !== 0 ? priority : a.label.localeCompare(b.label)
          })
      : SEARCH_PATH_OPTIONS
  const selectedOption = getSearchPathOption(searchPath, schemaOptions)
  const standardSchemaOptions = schemaOptions.filter(
    (option) => !option.value.endsWith('_warehouse')
  )
  const warehouseSchemaOptions = schemaOptions.filter((option) =>
    option.value.endsWith('_warehouse')
  )
  const visibleStandardSchemaOptions = standardSchemaOptions.filter(
    (option) =>
      isShowingMoreSchemas ||
      COMMON_SCHEMA_NAMES.includes(option.value) ||
      option.value === selectedOption.value
  )
  const hiddenStandardSchemaCount =
    standardSchemaOptions.length - visibleStandardSchemaOptions.length

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
            <span className="text-foreground-muted">Search path</span>
            <span className="max-w-32 truncate text-foreground">{selectedOption.label}</span>
            <ChevronDown className="shrink-0 text-muted" strokeWidth={1} size={12} />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align={align}>
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span>Search path</span>
          <span className="text-xs font-normal leading-snug text-foreground-light">
            Choose where your query looks first for unqualified table names.{' '}
            <a
              href="https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline decoration-foreground-lighter underline-offset-2 hover:decoration-foreground"
            >
              Learn more
            </a>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={selectedOption.value} onValueChange={setSearchPath}>
          {standardSchemaOptions.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs font-normal text-foreground-lighter">
                {warehouseSchemaOptions.length > 0 ? 'Postgres schemas' : 'Schemas'}
              </DropdownMenuLabel>
              {visibleStandardSchemaOptions.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{option.label}</span>
                    {option.description !== undefined && (
                      <span className="truncate text-xs text-foreground-lighter">
                        {option.description}
                      </span>
                    )}
                  </div>
                </DropdownMenuRadioItem>
              ))}
              {hiddenStandardSchemaCount > 0 && (
                <DropdownMenuItem
                  className="text-foreground-light"
                  onSelect={(event) => {
                    event.preventDefault()
                    setIsShowingMoreSchemas(true)
                  }}
                >
                  Show {hiddenStandardSchemaCount} more schema
                  {hiddenStandardSchemaCount === 1 ? '' : 's'}
                </DropdownMenuItem>
              )}
            </>
          )}
          {warehouseSchemaOptions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-foreground-lighter">
                Warehouse schemas
              </DropdownMenuLabel>
              {warehouseSchemaOptions.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{option.label}</span>
                    {option.description !== undefined && (
                      <span className="truncate text-xs text-foreground-lighter">
                        {option.description}
                      </span>
                    )}
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </>
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
