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

import { useLocalStorageQuery } from '@/hooks/misc/useLocalStorage'

type SearchPathOption = {
  value: string
  label: string
  description: string
}

const SEARCH_PATH_OPTIONS: SearchPathOption[] = [
  {
    value: 'public',
    label: 'public',
    description: 'Default Postgres tables',
  },
  {
    value: 'public_warehouse',
    label: 'public_warehouse',
    description: 'Linked Warehouse tables',
  },
  {
    value: 'auth',
    label: 'auth',
    description: 'Auth schema',
  },
  {
    value: 'storage',
    label: 'storage',
    description: 'Storage schema',
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Multiple schemas, e.g. "$user", public',
  },
]

const DEFAULT_SEARCH_PATH = 'public'

function getSearchPathOption(value: string) {
  return (
    SEARCH_PATH_OPTIONS.find((option) => option.value === value) ??
    SEARCH_PATH_OPTIONS.find((option) => option.value === 'custom')!
  )
}

export function SqlEditorSearchPathSelector() {
  const { ref } = useParams()
  const [searchPath, setSearchPath] = useLocalStorageQuery(
    LOCAL_STORAGE_KEYS.SQL_EDITOR_SEARCH_PATH(ref ?? 'unknown'),
    DEFAULT_SEARCH_PATH
  )
  const selectedOption = getSearchPathOption(searchPath)
  const isWarehousePath = selectedOption.value.endsWith('_warehouse')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="tiny"
          variant="default"
          className="h-[26px] justify-start gap-0 pr-3"
        >
          <div className="flex min-w-0 items-center gap-1">
            <span className="text-foreground-muted">Search path</span>
            <span
              className={cn(
                'max-w-32 truncate font-mono',
                isWarehousePath ? 'text-brand-link' : 'text-foreground'
              )}
            >
              {selectedOption.label}
            </span>
            <ChevronDown className="shrink-0 text-muted" strokeWidth={1} size={12} />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="end">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span>Search path</span>
          <span className="text-xs font-normal leading-snug text-foreground-light">
            Unqualified table names resolve against this schema first. Custom represents a
            multi-schema path.
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={selectedOption.value} onValueChange={setSearchPath}>
          {SEARCH_PATH_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <div className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    'truncate',
                    option.value.endsWith('_warehouse') ? 'text-brand-link' : undefined
                  )}
                >
                  {option.label}
                </span>
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
