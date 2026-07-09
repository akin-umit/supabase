import { Database } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from 'ui'
import { useSnapshot } from 'valtio'

import {
  setSqlEditorQueryControlMode,
  setSqlEditorWarehouseHealth,
  sqlEditorWarehouseDemoStore,
  type SqlEditorQueryControlMode,
  type SqlWarehouseHealthPreset,
} from '@/components/interfaces/SQLEditor/SqlEditorWarehouseDemo'

const WAREHOUSE_HEALTH_PRESETS: { preset: SqlWarehouseHealthPreset; label: string }[] = [
  { preset: 'healthy', label: 'Live' },
  { preset: 'catching_up', label: 'Catching up' },
  { preset: 'degraded', label: 'Degraded' },
  { preset: 'error', label: 'Error' },
]

const QUERY_CONTROL_MODES: { mode: SqlEditorQueryControlMode; label: string }[] = [
  { mode: 'compact', label: 'Compact Query dropdown' },
  { mode: 'separate', label: 'Separate controls' },
]

export function SqlEditorWarehouseDemoMenu() {
  const snap = useSnapshot(sqlEditorWarehouseDemoStore)

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="flex gap-2">
          <Database size={14} strokeWidth={1.5} className="text-foreground-lighter" />
          SQL Warehouse demo
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-52">
          <DropdownMenuLabel className="text-xs text-foreground-lighter">
            Results health
          </DropdownMenuLabel>
          {WAREHOUSE_HEALTH_PRESETS.map(({ preset, label }) => (
            <DropdownMenuItem
              key={preset}
              className="cursor-pointer"
              onClick={() => {
                setSqlEditorWarehouseHealth(preset)
                toast.message(`SQL Warehouse demo: ${label}`)
              }}
            >
              {label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-foreground-lighter">
            Query control
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={snap.queryControlMode}
            onValueChange={(value) => {
              if (value === 'compact' || value === 'separate') {
                setSqlEditorQueryControlMode(value)
                toast.message(
                  `SQL Warehouse demo: ${
                    value === 'compact' ? 'Compact Query dropdown' : 'Separate controls'
                  }`
                )
              }
            }}
          >
            {QUERY_CONTROL_MODES.map(({ mode, label }) => (
              <DropdownMenuRadioItem key={mode} value={mode} className="cursor-pointer">
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  )
}
