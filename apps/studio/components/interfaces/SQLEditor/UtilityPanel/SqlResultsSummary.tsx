import { Tooltip, TooltipContent, TooltipTrigger } from 'ui'

interface SqlResultsSummaryProps {
  rowCount: number
  autoLimit?: number
}

function formatRowCount(rowCount: number) {
  return `${rowCount.toLocaleString()} row${rowCount === 1 ? '' : 's'}`
}

export function SqlResultsSummary({ rowCount, autoLimit }: SqlResultsSummaryProps) {
  const hasReachedLimit = autoLimit !== undefined && rowCount >= autoLimit

  return (
    <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-foreground-lighter">
      {hasReachedLimit && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="group inline-flex cursor-default text-warning transition-colors hover:text-warning-600">
                <span className="border-b border-dotted border-current/40 transition-colors group-hover:border-current/70">
                  Limited
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="flex flex-col gap-y-1">
                <span>
                  Results are limited to preserve browser performance when a query returns many
                  rows.
                </span>
                <span className="text-foreground-light">
                  Change or remove this limit from the dropdown near Run.
                </span>
              </div>
            </TooltipContent>
          </Tooltip>
          <span className="shrink-0 text-foreground-muted">·</span>
        </>
      )}
      <span className="truncate text-foreground">
        {formatRowCount(rowCount)}
        {hasReachedLimit && (
          <span className="ml-1 text-foreground-lighter">(limit {autoLimit.toLocaleString()})</span>
        )}
      </span>
    </p>
  )
}
