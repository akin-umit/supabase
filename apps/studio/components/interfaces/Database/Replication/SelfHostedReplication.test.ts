import { describe, expect, it } from 'vitest'

import { normalizeReplicationState } from './SelfHostedReplication'

describe('normalizeReplicationState', () => {
  it('normalizes snake_case replication fields from the management API', () => {
    const result = normalizeReplicationState({
      wal_level: 'logical',
      configured: true,
      publications: [
        {
          name: 'supabase_realtime',
          all_tables: true,
          tables: [{ schema: 'public', name: 'messages' }],
        },
      ],
      slots: [{ name: 'slot_1', plugin: 'pgoutput', active: true, retained_bytes: 2048 }],
      destinations: [
        {
          id: 'dest_1',
          name: 'warehouse',
          type: 'postgres',
          status: 'active',
          publication: 'supabase_realtime',
        },
      ],
    })

    expect(result.walLevel).toBe('logical')
    expect(result.publications[0].allTables).toBe(true)
    expect(result.publications[0].tables).toEqual(['public.messages'])
    expect(result.slots[0].retainedBytes).toBe(2048)
    expect(result.destinations[0].status).toBe('active')
  })

  it('falls back to an unavailable state when the runtime returns no data', () => {
    const result = normalizeReplicationState(undefined)

    expect(result).toMatchObject({
      configured: false,
      status: 'unavailable',
      publications: [],
      slots: [],
      destinations: [],
    })
  })

  it('keeps partial responses read-only until the runtime reports configured', () => {
    const result = normalizeReplicationState({ wal_level: 'logical' })

    expect(result).toMatchObject({
      configured: false,
      status: 'configured',
      walLevel: 'logical',
    })
  })

  it('preserves operator-managed state so self-hosted write actions stay disabled', () => {
    const result = normalizeReplicationState({
      status: 'operator_managed',
      wal_level: 'logical',
      configured: true,
    })

    expect(result.status).toBe('operator_managed')
  })
})
