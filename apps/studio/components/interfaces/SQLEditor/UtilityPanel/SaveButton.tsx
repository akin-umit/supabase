import { Loader2 } from 'lucide-react'
import { Button, Tooltip, TooltipContent, TooltipTrigger } from 'ui'

import { ShortcutTooltip } from '@/components/ui/ShortcutTooltip'
import { SHORTCUT_IDS } from '@/state/shortcuts/registry'
import { hasUnsavedChanges, isSaving } from '@/state/sql-editor/sql-editor-lifecycle'
import { useSqlEditorSaveCoordinator } from '@/state/sql-editor/sql-editor-save-coordinator'
import { useSqlEditorV2StateSnapshot } from '@/state/sql-editor/sql-editor-state'

interface SqlSaveButtonProps {
  id: string
}

export const SqlSaveButton = ({ id }: SqlSaveButtonProps) => {
  const snapV2 = useSqlEditorV2StateSnapshot()
  const { requestSave } = useSqlEditorSaveCoordinator()

  const status = snapV2.snippets[id]?.snippet.status
  const saving = isSaving(status)
  const isDirty = hasUnsavedChanges(status) && !saving

  const button = (
    <Button
      onClick={() => requestSave(id)}
      disabled={!isDirty}
      variant="default"
      size="tiny"
      data-testid="sql-save-button"
      icon={saving ? <Loader2 className="animate-spin" size={12} strokeWidth={1.5} /> : undefined}
    >
      Save
    </Button>
  )

  if (isDirty) {
    return <ShortcutTooltip shortcutId={SHORTCUT_IDS.SQL_EDITOR_SAVE}>{button}</ShortcutTooltip>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {saving ? 'Saving changes...' : 'All changes saved'}
      </TooltipContent>
    </Tooltip>
  )
}
