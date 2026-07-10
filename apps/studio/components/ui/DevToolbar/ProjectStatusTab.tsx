'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useParams } from 'common'
import { useEffect, useRef } from 'react'
import { cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'ui'

import { projectKeys } from '@/data/projects/keys'
import { useSetProjectStatus, type Project } from '@/data/projects/project-detail-query'
import { useSelectedOrganizationQuery } from '@/hooks/misc/useSelectedOrganization'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { PROJECT_STATUS } from '@/lib/constants'

const STATUS_OPTIONS = Object.values(PROJECT_STATUS)

export const ProjectStatusTab = () => {
  const { ref } = useParams()
  const queryClient = useQueryClient()
  const { setProjectStatus } = useSetProjectStatus()
  const { data: project } = useSelectedProjectQuery()
  const { data: selectedOrg } = useSelectedOrganizationQuery()
  const orgSlug = selectedOrg?.slug

  const hasOverrideRef = useRef(false)
  const latestValues = useRef({ ref, orgSlug })
  useEffect(() => {
    latestValues.current = { ref, orgSlug }
  })

  const revertToRealStatus = (targetRef?: string, targetSlug?: string) => {
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(targetRef) })
    queryClient.invalidateQueries({ queryKey: projectKeys.infiniteList() })
    if (targetSlug) {
      queryClient.invalidateQueries({ queryKey: projectKeys.infiniteListByOrg(targetSlug) })
    }
  }

  useEffect(() => {
    return () => {
      if (!hasOverrideRef.current) return
      const { ref: latestRef, orgSlug: latestOrgSlug } = latestValues.current
      revertToRealStatus(latestRef, latestOrgSlug)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (!hasOverrideRef.current) return
      revertToRealStatus(ref, latestValues.current.orgSlug)
      hasOverrideRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  const handleStatusChange = (status: Project['status']) => {
    if (!ref) return
    setProjectStatus({ ref, slug: orgSlug, status })
    hasOverrideRef.current = true
  }

  const handleReset = () => {
    hasOverrideRef.current = false
    revertToRealStatus(ref, orgSlug)
  }

  const isDisabled = !ref

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-light">Override the status of the current project.</p>
        <button
          onClick={handleReset}
          disabled={isDisabled}
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
          value={project?.status}
          onValueChange={(value) => handleStatusChange(value as Project['status'])}
        >
          <SelectTrigger className="w-56 font-mono text-xs">
            <SelectValue placeholder="Select a status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status} className="font-mono text-xs">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
