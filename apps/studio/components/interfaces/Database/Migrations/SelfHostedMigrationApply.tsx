import { useParams } from 'common'
import { Play } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button, Card, Input, TextArea } from 'ui'

import { useSelfHostedManagementMutation } from '@/data/self-hosted/management'

export function SelfHostedMigrationApply() {
  const { ref } = useParams()
  const [name, setName] = useState('')
  const [sql, setSql] = useState('')
  const apply = useSelfHostedManagementMutation<unknown, { name: string; sql: string }>({
    projectRef: ref,
    resource: ['migrations', 'apply'],
  })

  return (
    <Card className="mb-6 p-5 space-y-4">
      <div>
        <h3 className="text-lg">Apply migration</h3>
        <p className="text-sm text-foreground-light">
          Apply one audited transaction and record it in migration history.
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
        loading={apply.isPending}
        onClick={async () => {
          try {
            await apply.mutateAsync({ name: name.trim(), sql })
            toast.success('Migration applied')
            setName('')
            setSql('')
            window.location.reload()
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Migration failed')
          }
        }}
      >
        Apply migration
      </Button>
    </Card>
  )
}
