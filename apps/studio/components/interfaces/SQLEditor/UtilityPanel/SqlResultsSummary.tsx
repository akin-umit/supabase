import { cn, Tooltip, TooltipContent, TooltipTrigger } from 'ui'

interface SqlResultsSummaryProps {
  rowCount: number
  autoLimit?: number
}

type ResultsHealth = 'complete' | 'limited'

const RESULTS_HEALTH_LABEL: Record<ResultsHealth, string> = {
  complete: 'Complete',
  limited: 'Limited',
}

const RESULTS_HEALTH_CLASS_NAME: Record<ResultsHealth, string> = {
  complete: 'text-foreground-light hover:text-foreground',
  limited: 'text-warning hover:text-warning-600',
}

function formatRowCount(rowCount: number) {
  return `${rowCount.toLocaleString()} row${rowCount === 1 ? '' : 's'}`
}

export function SqlResultsSummary({ rowCount, autoLimit }: SqlResultsSummaryProps) {
  const health: ResultsHealth = autoLimit !== undefined ? 'limited' : 'complete'

  return (
    <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-foreground-lighter">
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'group inline-flex cursor-default transition-colors',
              RESULTS_HEALTH_CLASS_NAME[health]
            )}
          >
            <span className="border-b border-dotted border-current/40 transition-colors group-hover:border-current/70">
              {RESULTS_HEALTH_LABEL[health]}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {health === 'limited' ? (
            <div className="flex flex-col gap-y-1">
              <span>
                Results are limited to preserve browser performance when a query returns many rows.
              </span>
              <span className="text-foreground-light">
                Change or remove this limit from the dropdown near Run.
              </span>
            </div>
          ) : (
            'Query completed without applying the SQL Editor row limit.'
          )}
        </TooltipContent>
      </Tooltip>
      <span className="shrink-0 text-foreground-muted">·</span>
      <span className="truncate text-foreground">
        {formatRowCount(rowCount)}
        {autoLimit !== undefined && (
          <span className="ml-1 text-foreground-lighter">(limit {autoLimit.toLocaleString()})</span>
        )}
      </span>
    </p>
  )
}
