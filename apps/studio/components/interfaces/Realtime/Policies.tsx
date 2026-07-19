import { useMemo, useState } from 'react'
import { Admonition } from 'ui-patterns/admonition'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'

import { Policies } from '@/components/interfaces/Database/Policies/Policies'
import { PoliciesDataProvider } from '@/components/interfaces/Database/Policies/PoliciesDataContext'
import { PolicyEditorPanel } from '@/components/interfaces/Database/Policies/PolicyEditorPanel'
import type { Policy } from '@/components/interfaces/Database/Policies/PolicyTableRow/PolicyTableRow.utils'
import { AlertError } from '@/components/ui/AlertError'
import { useDatabasePoliciesQuery } from '@/data/database-policies/database-policies-query'
import { useTablesQuery } from '@/data/tables/tables-query'
import { useDeploymentMode } from '@/hooks/misc/useDeploymentMode'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'

export const RealtimePolicies = () => {
  const { data: project } = useSelectedProjectQuery()
  const { isSelfHosted } = useDeploymentMode()

  const [showPolicyEditor, setShowPolicyEditor] = useState(false)
  const [selectedPolicyToEdit, setSelectedPolicyToEdit] = useState<Policy>()

  const {
    data: tables,
    isPending: isLoading,
    isSuccess,
    isError,
    error,
  } = useTablesQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
    schema: 'realtime',
  })

  const filteredTables = useMemo(
    () => (tables ?? []).filter((table) => table.name === 'messages'),
    [tables]
  )
  const visibleTableIds = useMemo(
    () => new Set(filteredTables.map((table) => table.id)),
    [filteredTables]
  )
  const {
    data: policies,
    isPending: isLoadingPolicies,
    isError: isPoliciesError,
    error: policiesError,
  } = useDatabasePoliciesQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })
  // realtime is never in PostgREST's db_schema — skip the config query to avoid a false warning
  const exposedSchemas = useMemo(() => ['realtime'], [])

  return (
    <>
      {isLoading && <GenericSkeletonLoader />}

      {isError &&
        (isSelfHosted ? (
          <Admonition type="warning" title="Could not inspect realtime.messages policies">
            <div className="space-y-2 text-sm text-foreground-light">
              <p>
                Studio could not read the <code className="text-code-inline">realtime</code> schema
                from this self-hosted database connection. Confirm that Studio can reach Postgres
                and that the <code className="text-code-inline">realtime.messages</code> table
                exists before creating policies.
              </p>
              <p>
                You can still manage policies directly with SQL against the{' '}
                <code className="text-code-inline">realtime.messages</code> table.
              </p>
            </div>
          </Admonition>
        ) : (
          <AlertError error={error} subject="Failed to retrieve tables" />
        ))}

      {isSuccess && (
        <PoliciesDataProvider
          policies={policies ?? []}
          isPoliciesLoading={isLoadingPolicies}
          isPoliciesError={isPoliciesError}
          policiesError={policiesError ?? undefined}
          exposedSchemas={exposedSchemas}
        >
          <Policies
            schema="realtime"
            tables={filteredTables}
            hasTables
            isLocked={false}
            visibleTableIds={visibleTableIds}
            onSelectCreatePolicy={(_tableName) => {
              setSelectedPolicyToEdit(undefined)
              setShowPolicyEditor(true)
            }}
            onSelectEditPolicy={(policy) => {
              setSelectedPolicyToEdit(policy)
              setShowPolicyEditor(true)
            }}
          />
        </PoliciesDataProvider>
      )}

      <PolicyEditorPanel
        visible={showPolicyEditor}
        searchString="messages"
        schema="realtime"
        selectedPolicy={selectedPolicyToEdit}
        onSelectCancel={() => setShowPolicyEditor(false)}
        authContext="realtime"
      />
    </>
  )
}
