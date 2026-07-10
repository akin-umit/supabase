import { useMemo } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Badge, FormControl, FormField, Select, SelectContent, SelectItem, SelectTrigger } from 'ui'
import { Admonition } from 'ui-patterns/admonition'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import { MultiSelector } from 'ui-patterns/multi-select'

import type { DestinationPanelSchemaType } from './DestinationForm.schema'
import type { ReplicationConfiguredTable } from '@/data/replication/pipeline-by-id-query'
import type { ReplicationPublication } from '@/data/replication/publications-query'

type TableCopySelectionProps = {
  form: UseFormReturn<DestinationPanelSchemaType>
  publications: ReplicationPublication[]
  configuredTables: ReplicationConfiguredTable[]
  isLoadingPublications: boolean
}

const isSelectiveMode = (mode: DestinationPanelSchemaType['tableSyncCopyMode']) =>
  mode === 'include_tables' || mode === 'skip_tables'

// `schema`/`name` are `null` when the table was dropped after being selected.
const tableLabel = ({
  id,
  schema,
  name,
}: {
  id: number
  schema: string | null
  name: string | null
}) => (schema !== null && name !== null ? `${schema}.${name}` : `Table ${id} (deleted)`)

export const TableCopySelection = ({
  form,
  publications,
  configuredTables,
  isLoadingPublications,
}: TableCopySelectionProps) => {
  const { publicationName, tableSyncCopyMode, tableSyncCopyTableIds } = form.watch()

  const publicationTables = useMemo(() => {
    const publication = publications.find(({ name }) => name === publicationName)

    return (publication?.tables ?? [])
      .map((table) => ({ ...table, isMissingFromPublication: false }))
      .sort((a, b) => tableLabel(a).localeCompare(tableLabel(b)))
  }, [publicationName, publications])

  const publicationTableIds = new Set(publicationTables.map(({ id }) => String(id)))
  const selectedTableIds = new Set(tableSyncCopyTableIds)
  const missingConfiguredTables = configuredTables
    .filter(({ id }) => selectedTableIds.has(String(id)) && !publicationTableIds.has(String(id)))
    .map((table) => ({ ...table, isMissingFromPublication: true }))
  const selectableTables = [...publicationTables, ...missingConfiguredTables].sort((a, b) =>
    tableLabel(a).localeCompare(tableLabel(b))
  )
  const tableLabelsById = new Map(selectableTables.map((table) => [String(table.id), tableLabel(table)]))
  const selectedPublicationCount = tableSyncCopyTableIds.filter((id) =>
    publicationTableIds.has(id)
  ).length
  const tableCount = publicationTables.length

  return (
    <div className="flex flex-col gap-y-4">
      <FormField
        control={form.control}
        name="tableSyncCopyMode"
        render={({ field }) => (
          <FormItemLayout
            layout="horizontal"
            label="Initial table copy"
            description="Choose which existing rows to copy before change streaming begins. All publication tables continue streaming new changes."
          >
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  {field.value === 'include_all_tables' && 'Copy all tables'}
                  {field.value === 'skip_all_tables' && 'Skip all table copies'}
                  {field.value === 'include_tables' && 'Copy only selected tables'}
                  {field.value === 'skip_tables' && 'Skip selected table copies'}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="include_all_tables" className="[&>span]:top-2.5">
                    <p>Copy all tables</p>
                    <p className="text-foreground-lighter">Copy existing rows from every table.</p>
                  </SelectItem>
                  <SelectItem value="skip_tables" className="[&>span]:top-2.5">
                    <p>Skip selected table copies</p>
                    <p className="text-foreground-lighter">
                      Stream selected tables without copying existing rows.
                    </p>
                  </SelectItem>
                  <SelectItem value="include_tables" className="[&>span]:top-2.5">
                    <p>Copy only selected tables</p>
                    <p className="text-foreground-lighter">
                      Only copy existing rows from selected tables.
                    </p>
                  </SelectItem>
                  <SelectItem value="skip_all_tables" className="[&>span]:top-2.5">
                    <p>Skip all table copies</p>
                    <p className="text-foreground-lighter">
                      Start streaming without copying any existing rows.
                    </p>
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
          </FormItemLayout>
        )}
      />

      {isSelectiveMode(tableSyncCopyMode) && (
        <FormField
          control={form.control}
          name="tableSyncCopyTableIds"
          render={({ field }) => (
            <FormItemLayout
              layout="horizontal"
              label={tableSyncCopyMode === 'skip_tables' ? 'Tables to skip' : 'Tables to copy'}
              description={
                tableSyncCopyMode === 'skip_tables'
                  ? `${selectedPublicationCount} of ${tableCount} publication tables will stream without an initial copy.`
                  : `${selectedPublicationCount} of ${tableCount} publication tables will have their existing rows copied.`
              }
            >
              <FormControl>
                <MultiSelector
                  values={field.value}
                  onValuesChange={field.onChange}
                  disabled={
                    isLoadingPublications || !publicationName || selectableTables.length === 0
                  }
                >
                  <MultiSelector.Trigger
                    badgeLimit={2}
                    renderValue={(id) => tableLabelsById.get(id) ?? `Table ${id}`}
                    label={
                      isLoadingPublications
                        ? 'Loading publication tables...'
                        : publicationName
                          ? 'Select tables...'
                          : 'Select a publication first'
                    }
                  />
                  <MultiSelector.Content>
                    <MultiSelector.List>
                      {selectableTables.map((table) => (
                        <MultiSelector.Item key={table.id} value={String(table.id)}>
                          <div className="flex w-full items-center justify-between gap-2">
                            <span>{tableLabel(table)}</span>
                            {table.schema === null || table.name === null ? (
                              <Badge variant="warning">Table deleted</Badge>
                            ) : (
                              table.isMissingFromPublication && (
                                <Badge variant="warning">No longer in publication</Badge>
                              )
                            )}
                          </div>
                        </MultiSelector.Item>
                      ))}
                    </MultiSelector.List>
                  </MultiSelector.Content>
                </MultiSelector>
              </FormControl>
              {missingConfiguredTables.length > 0 && (
                <Admonition type="warning" className="mt-2">
                  <p className="leading-normal!">
                    {missingConfiguredTables.length === 1
                      ? 'A selected table is'
                      : `${missingConfiguredTables.length} selected tables are`}{' '}
                    no longer in this publication. The pipeline will keep the{' '}
                    {missingConfiguredTables.length === 1 ? 'table' : 'tables'} in its initial-copy
                    configuration until you deselect{' '}
                    {missingConfiguredTables.length === 1 ? 'it' : 'them'}.
                  </p>
                </Admonition>
              )}
            </FormItemLayout>
          )}
        />
      )}
    </div>
  )
}
