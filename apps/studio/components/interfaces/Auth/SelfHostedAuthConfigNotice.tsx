import { Admonition } from 'ui-patterns/admonition'

import { DocsButton } from '@/components/ui/DocsButton'
import { DOCS_URL } from '@/lib/constants'

type SelfHostedAuthConfigNoticeProps = {
  title?: string
  settings?: string[]
}

export const SelfHostedAuthConfigNotice = ({
  title = 'Auth settings are applied through the self-host management bridge',
  settings = [],
}: SelfHostedAuthConfigNoticeProps) => {
  return (
    <Admonition type="default" title={title}>
      <div className="space-y-3 text-sm text-foreground-light">
        <p>
          Studio reads and saves these values through the local management API. Configure
          INTERNAL_MANAGEMENT_API_URL and INTERNAL_MANAGEMENT_API_WRITE_TOKEN so changes are
          persisted to the GoTrue/Auth runtime and applied without calling Supabase Cloud.
        </p>
        {settings.length > 0 && (
          <div>
            <p className="mb-2 text-foreground">Relevant settings for this page:</p>
            <ul className="list-disc space-y-1 pl-5">
              {settings.map((setting) => (
                <li key={setting}>
                  <code className="text-code-inline">{setting}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
        <DocsButton href={`${DOCS_URL}/guides/self-hosting/auth/config`} />
      </div>
    </Admonition>
  )
}
