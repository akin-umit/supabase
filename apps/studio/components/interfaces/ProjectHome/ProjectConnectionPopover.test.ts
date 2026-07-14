import { describe, expect, it } from 'vitest'

import {
  buildSafeDirectConnectionString,
  getSelfHostedCliCommands,
} from './ProjectConnectionPopover'

describe('getSelfHostedCliCommands', () => {
  it('uses redacted self-host database placeholders', () => {
    const commands = getSelfHostedCliCommands()

    expect(commands).toContain('supabase init')
    expect(commands).toContain('postgresql://postgres:[YOUR-PASSWORD]@db:5432/postgres')
    expect(commands).not.toContain('supabase login')
    expect(commands).not.toContain('supabase link')
  })
})

describe('buildSafeDirectConnectionString', () => {
  it('returns an empty string when required database metadata is missing', () => {
    expect(buildSafeDirectConnectionString(undefined, 'default')).toBe('')
    expect(
      buildSafeDirectConnectionString(
        {
          db_host: 'localhost',
          db_name: 'postgres',
          db_user: 'postgres',
        },
        'default'
      )
    ).toBe('')
  })

  it('builds a direct connection string with a password placeholder', () => {
    expect(
      buildSafeDirectConnectionString(
        {
          db_host: 'db.example.test',
          db_name: 'postgres',
          db_port: 5432,
          db_user: 'postgres',
        },
        'default'
      )
    ).toBe('postgresql://postgres:[YOUR-PASSWORD]@db.example.test:5432/postgres')
  })

  it('does not use a provided connectionString secret', () => {
    expect(
      buildSafeDirectConnectionString(
        {
          connectionString: 'postgresql://postgres:real-password@db.example.test:5432/postgres',
          db_host: 'db.example.test',
          db_name: 'postgres',
          db_port: 5432,
          db_user: 'postgres',
        },
        'default'
      )
    ).toBe('postgresql://postgres:[YOUR-PASSWORD]@db.example.test:5432/postgres')
  })
})
