import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAiSkillsImpl } from './AiSkills.utils'

const { requestMock, getGitHubFileContentsMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  getGitHubFileContentsMock: vi.fn(),
}))

vi.mock('~/lib/octokit', () => ({
  OCTOKIT_RETRY_OPTIONS: { retries: 5, retryAfter: 1 },
  octokit: () => ({ request: requestMock }),
  getGitHubFileContents: getGitHubFileContentsMock,
}))

describe('getAiSkillsImpl', () => {
  beforeEach(() => {
    requestMock.mockReset()
    getGitHubFileContentsMock.mockReset()
  })

  it('lists dirs, parses frontmatter, and builds sorted skill summaries', async () => {
    requestMock.mockResolvedValue({
      data: [
        { name: 'supabase', type: 'dir' },
        { name: 'supabase-postgres-best-practices', type: 'dir' },
        { name: 'README.md', type: 'file' }, // must be ignored
      ],
    })
    getGitHubFileContentsMock.mockImplementation(({ path }: { path: string }) => {
      if (path.includes('supabase-postgres-best-practices')) {
        return Promise.resolve('---\ndescription: Postgres best practices\n---\nbody')
      }
      return Promise.resolve('---\ndescription: Work with Supabase\n---\nbody')
    })

    const skills = await getAiSkillsImpl()

    expect(skills).toEqual([
      {
        name: 'supabase',
        description: 'Work with Supabase',
        installCommand: 'npx skills add supabase/agent-skills --skill supabase',
      },
      {
        name: 'supabase-postgres-best-practices',
        description: 'Postgres best practices',
        installCommand:
          'npx skills add supabase/agent-skills --skill supabase-postgres-best-practices',
      },
    ])

    expect(getGitHubFileContentsMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'skills/supabase/SKILL.md' })
    )
  })

  it('falls back to an empty description when frontmatter has none', async () => {
    requestMock.mockResolvedValue({ data: [{ name: 'supabase', type: 'dir' }] })
    getGitHubFileContentsMock.mockResolvedValue('no frontmatter here')

    const [skill] = await getAiSkillsImpl()

    expect(skill.description).toBe('')
  })

  it('throws when the repo response is not a directory listing', async () => {
    requestMock.mockResolvedValue({ data: { name: 'SKILL.md', type: 'file' } })

    await expect(getAiSkillsImpl()).rejects.toThrow('Expected directory listing')
  })
})
