import { useQueryClient } from '@tanstack/react-query'
import { useParams } from 'common'
import { Play } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button, Card, Input, TextArea } from 'ui'

import { databaseKeys } from '@/data/database/keys'

export async function applySelfHostedMigration({
  projectRef,
  name,
  sql,
}: {
  projectRef: string
  name: string
  sql: string
}) {
  const response = await fetch(
    `/api/v1/projects/${encodeURIComponent(projectRef)}/database/migrations`,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, query: sql }),
    }
  )
  const payload = await response.json().catch(() => undefined)

  if (!response.ok) {
    throw new Error(payload?.formattedError ?? payload?.message ?? 'Unable to apply migration')
  }

  return payload
}

export function SelfHostedMigrationApply() {
  const { ref } = useParams()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [sql, setSql] = useState('')
  const [isApplying, setIsApplying] = useState(false)

  return (
    <Card className="mb-6 p-5 space-y-4">
      <div>
        <h3 className="text-lg">Apply migration</h3>
        <p className="text-sm text-foreground-light">
          Apply one audited transaction and record it in the local
          supabase_migrations.schema_migrations history table.
        </p>
      </div>
      <Input
        placeholder="Migration name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <TextArea
        className="font-mono min-h-40"
        placeholder="create table ..."
        value={sql}
        onChange={(event) => setSql(event.target.value)}
      />
      <Button
        icon={<Play />}
        disabled={!name.trim() || !sql.trim()}
        loading={isApplying}
        onClick={async () => {
          try {
            setIsApplying(true)
            await applySelfHostedMigration({ projectRef: ref, name: name.trim(), sql })
            toast.success('Migration applied')
            setName('')
            setSql('')
            await queryClient.invalidateQueries({ queryKey: databaseKeys.migrations(ref) })
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Migration failed')
          } finally {
            setIsApplying(false)
          }
        }}
      >
        Apply migration
      </Button>
    </Card>
  )
}
