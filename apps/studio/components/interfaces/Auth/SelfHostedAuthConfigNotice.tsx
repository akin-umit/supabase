import { Admonition } from 'ui-patterns/admonition'

import { DocsButton } from '@/components/ui/DocsButton'
import { DOCS_URL } from '@/lib/constants'

type SelfHostedAuthConfigNoticeProps = {
  title?: string
  settings?: string[]
}

export const SelfHostedAuthConfigNotice = ({
  title = 'Manage these Auth settings from your self-hosted configuration',
  settings = [],
}: SelfHostedAuthConfigNoticeProps) => {
  return (
    <Admonition type="default" title={title}>
      <div className="space-y-3 text-sm text-foreground-light">
        <p>
          This Studio build does not have the Supabase Cloud Auth configuration API. Update the
          GoTrue/Auth service environment variables in your compose, Kubernetes, or service manager
          configuration, then restart the Auth service for changes to take effect.
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
