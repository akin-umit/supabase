import { useMemo } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Badge, Checkbox, cn, Label, RadioGroupCard, RadioGroupCardItem } from 'ui'
import { Admonition } from 'ui-patterns/admonition'
import {
  MultiSelector,
  MultiSelectorContent,
  MultiSelectorItem,
  MultiSelectorList,
  MultiSelectorTrigger,
} from 'ui-patterns/multi-select'

import type { ResourceAccessMode } from '../../AccessToken.permissions'
import { useOrgAndProjectData } from '../../hooks/useOrgAndProjectData'
import type { TokenFormValues } from './tokenForm'

interface ResourceAccessStepProps {
  form: UseFormReturn<TokenFormValues>
  /** Inline error surfaced only after an attempt to advance. */
  error?: string
}

const CARD_OPTIONS: {
  value: Exclude<ResourceAccessMode, 'account'>
  name: string
  description: string
  recommended?: boolean
}[] = [
  {
    value: 'single-project',
    name: 'Projects',
    description: 'Access one or more specific projects.',
    recommended: true,
  },
  {
    value: 'organization',
    name: 'Organizations',
    description: 'Access one or more organizations.',
  },
]

export const ResourceAccessStep = ({ form, error }: ResourceAccessStepProps) => {
  const { organizations, projects, isLoadingOrgs, isLoadingProjects } = useOrgAndProjectData()

  const resourceAccess = form.watch('resourceAccess')
  const organizationSlugs = form.watch('organizationSlugs')
  const projectRefs = form.watch('projectRefs')
  const accountConfirmed = form.watch('accountConfirmed')

  const isAccount = resourceAccess === 'account'

  // MultiSelector works on display names; map names <-> ids for each list.
  const orgNameBySlug = useMemo(
    () => new Map(organizations.map((org) => [org.slug, org.name])),
    [organizations]
  )
  const projectNameByRef = useMemo(
    () => new Map(projects.map((project) => [project.ref, project.name])),
    [projects]
  )

  const selectedOrgNames = (organizationSlugs ?? []).map((slug) => orgNameBySlug.get(slug) ?? slug)
  const selectedProjectNames = (projectRefs ?? []).map((ref) => projectNameByRef.get(ref) ?? ref)

  const handleOrgNamesChange = (names: string[]) => {
    const slugs = names
      .map((name) => organizations.find((org) => org.name === name)?.slug ?? name)
      .filter(Boolean)
    form.setValue('organizationSlugs', slugs, { shouldValidate: true })
  }

  const handleProjectNamesChange = (names: string[]) => {
    const refs = names
      .map((name) => projects.find((project) => project.name === name)?.ref ?? name)
      .filter(Boolean)
    form.setValue('projectRefs', refs, { shouldValidate: true })
  }

  const handleModeChange = (value: string) => {
    form.setValue('resourceAccess', value as ResourceAccessMode, { shouldValidate: true })
    if (value !== 'account') form.setValue('accountConfirmed', false)
  }

  const enableAccountLevel = () => {
    form.setValue('resourceAccess', 'account', { shouldValidate: true })
    form.setValue('organizationSlugs', [])
    form.setValue('projectRefs', [])
  }

  const switchBackToProjects = () => {
    form.setValue('resourceAccess', 'single-project', { shouldValidate: true })
    form.setValue('accountConfirmed', false)
  }

  return (
    <section className="space-y-4 px-5 sm:px-6 py-6">
      <div>
        <h3 className="text-sm text-foreground">Resource access</h3>
        <p className="text-xs text-foreground-light">Choose what this token can reach.</p>
      </div>

      <RadioGroupCard
        className="grid-cols-2"
        value={isAccount ? undefined : resourceAccess}
        onValueChange={handleModeChange}
        disabled={isAccount}
      >
        {CARD_OPTIONS.map((option) => (
          <RadioGroupCardItem
            key={option.value}
            id={option.value}
            value={option.value}
            className={cn('w-full', isAccount && 'opacity-50')}
            disabled={isAccount}
            label={
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-foreground">{option.name}</span>
                  {option.recommended && <Badge variant="success">Recommended</Badge>}
                </div>
                <span className="text-foreground-light">{option.description}</span>
              </div>
            }
          />
        ))}
      </RadioGroupCard>

      {!isAccount && (
        <div className="space-y-1">
          {resourceAccess === 'single-project' ? (
            <>
              <p className="text-xs text-foreground-light">Projects</p>
              <MultiSelector
                values={selectedProjectNames}
                onValuesChange={handleProjectNamesChange}
              >
                <MultiSelectorTrigger
                  deletableBadge
                  showIcon={false}
                  mode="inline-combobox"
                  label="Select projects"
                  badgeLimit="wrap"
                />
                <MultiSelectorContent className="z-50">
                  {isLoadingProjects ? (
                    <div className="px-3 py-2 text-sm text-foreground-light">Loading projects…</div>
                  ) : projects.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-foreground-light">No projects found</div>
                  ) : (
                    <MultiSelectorList>
                      {projects.map((project) => (
                        <MultiSelectorItem key={project.ref} value={project.name}>
                          {project.name}
                        </MultiSelectorItem>
                      ))}
                    </MultiSelectorList>
                  )}
                </MultiSelectorContent>
              </MultiSelector>
            </>
          ) : (
            <>
              <p className="text-xs text-foreground-light">Organizations</p>
              <MultiSelector values={selectedOrgNames} onValuesChange={handleOrgNamesChange}>
                <MultiSelectorTrigger
                  deletableBadge
                  showIcon={false}
                  mode="inline-combobox"
                  label="Select organizations"
                  badgeLimit="wrap"
                />
                <MultiSelectorContent className="z-50">
                  {isLoadingOrgs ? (
                    <div className="px-3 py-2 text-sm text-foreground-light">
                      Loading organizations…
                    </div>
                  ) : organizations.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-foreground-light">
                      No organizations found
                    </div>
                  ) : (
                    <MultiSelectorList>
                      {organizations.map((org) => (
                        <MultiSelectorItem key={org.slug} value={org.name}>
                          {org.name}
                        </MultiSelectorItem>
                      ))}
                    </MultiSelectorList>
                  )}
                </MultiSelectorContent>
              </MultiSelector>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {!isAccount ? (
        <p className="text-xs text-foreground-lighter">
          Need access to every organization and project?{' '}
          <button
            type="button"
            className="text-foreground-light underline hover:text-foreground transition-colors"
            onClick={enableAccountLevel}
          >
            Advanced options
          </button>
        </p>
      ) : (
        <Admonition
          type="warning"
          title="Account-level access is broad."
          description={
            <div className="space-y-3">
              <p>
                This token can reach every organization and project you have access to. Prefer
                specific projects or organizations unless you specifically need account-wide access.
              </p>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="accountConfirmed"
                  checked={accountConfirmed ?? false}
                  onCheckedChange={(checked) =>
                    form.setValue('accountConfirmed', checked === true, { shouldValidate: true })
                  }
                />
                <Label htmlFor="accountConfirmed" className="text-xs text-foreground-light">
                  I understand this token is not limited to one project or organization.
                </Label>
              </div>
              <button
                type="button"
                className="text-xs text-foreground-light underline hover:text-foreground transition-colors"
                onClick={switchBackToProjects}
              >
                Switch back
              </button>
            </div>
          }
        />
      )}
    </section>
  )
}
