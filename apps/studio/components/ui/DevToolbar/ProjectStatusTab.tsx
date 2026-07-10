'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useParams } from 'common'
import { useEffect, useState } from 'react'
import { cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'ui'

import { projectKeys } from '@/data/projects/keys'
import { useSetProjectStatus, type Project } from '@/data/projects/project-detail-query'
import {
  clearProjectStatusOverride,
  getProjectStatusOverride,
  setProjectStatusOverride,
} from '@/data/projects/project-status-override'
import { useSelectedOrganizationQuery } from '@/hooks/misc/useSelectedOrganization'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { PROJECT_STATUS } from '@/lib/constants'

type ProjectStatus = Project['status']

const STATUS_LABELS: Record<ProjectStatus, string> = {
  INACTIVE: 'Paused',
  ACTIVE_HEALTHY: 'Active (healthy)',
  ACTIVE_UNHEALTHY: 'Active (unhealthy)',
  COMING_UP: 'Coming up',
  UNKNOWN: 'Unknown',
  GOING_DOWN: 'Going down',
  INIT_FAILED: 'Init failed',
  REMOVED: 'Removed',
  RESTARTING: 'Restarting',
  RESTORING: 'Restoring',
  RESTORE_FAILED: 'Restore failed',
  UPGRADING: 'Upgrading',
  PAUSING: 'Pausing',
  PAUSE_FAILED: 'Pause failed',
  RESIZING: 'Resizing',
}

const STATUS_OPTIONS = Object.values(PROJECT_STATUS)

export const ProjectStatusTab = () => {
  const { ref } = useParams()
  const queryClient = useQueryClient()
  const { setProjectStatus } = useSetProjectStatus()
  const { data: project } = useSelectedProjectQuery()
  const { data: selectedOrg } = useSelectedOrganizationQuery()
  const orgSlug = selectedOrg?.slug

  const [override, setOverride] = useState<ProjectStatus | undefined>(undefined)
  useEffect(() => {
    setOverride(getProjectStatusOverride(ref))
  }, [ref])

  const currentValue = override ?? project?.status

  const refetchRealStatus = () => {
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(ref) })
    queryClient.invalidateQueries({ queryKey: projectKeys.infiniteList() })
    if (orgSlug) {
      queryClient.invalidateQueries({ queryKey: projectKeys.infiniteListByOrg(orgSlug) })
    }
  }

  const handleStatusChange = (status: ProjectStatus) => {
    if (!ref) return
    setProjectStatusOverride(ref, status)
    setOverride(status)
    setProjectStatus({ ref, slug: orgSlug, status })
  }

  const handleReset = () => {
    if (ref) clearProjectStatusOverride(ref)
    setOverride(undefined)
    refetchRealStatus()
  }

  const isDisabled = !ref

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-light">
          Override the status of the current project. The override persists across refetches until
          reset.
        </p>
        <button
          onClick={handleReset}
          disabled={isDisabled || override === undefined}
          className="text-xs text-foreground-lighter hover:text-foreground transition underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset to real data
        </button>
      </div>

      {isDisabled && (
        <p className="text-xs text-foreground-muted">Navigate to a project page to use this tab.</p>
      )}

      <div
        className={cn(
          'flex items-center justify-between',
          isDisabled && 'opacity-50 pointer-events-none'
        )}
      >
        <span className="text-sm text-foreground-light">Status</span>
        <Select
          value={currentValue}
          onValueChange={(value) => handleStatusChange(value as ProjectStatus)}
        >
          <SelectTrigger className="w-56 text-xs">
            <SelectValue placeholder="Select a status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status} className="text-xs">
                {STATUS_LABELS[status]}
                <span className="ml-1.5 font-mono text-foreground-lighter">{status}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
