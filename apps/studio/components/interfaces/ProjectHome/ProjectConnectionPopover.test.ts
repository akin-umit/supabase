import { describe, expect, it } from 'vitest'

import { getSelfHostedCliCommands } from './ProjectConnectionPopover'

describe('getSelfHostedCliCommands', () => {
  it('uses redacted self-host database placeholders', () => {
    const commands = getSelfHostedCliCommands()

    expect(commands).toContain('supabase init')
    expect(commands).toContain('postgresql://postgres:[YOUR-PASSWORD]@db:5432/postgres')
    expect(commands).not.toContain('supabase login')
    expect(commands).not.toContain('supabase link')
  })
})
