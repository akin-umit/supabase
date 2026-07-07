import type { ContentListingGroup } from '~/lib/content-listings.schema'

export const selfHostingGetStarted: ContentListingGroup = {
  id: 'self-hosting-get-started',
  heading: 'Get started',
  headingLevel: 'h2',
  type: 'grid',
  columns: 2,
  description: 'The fastest and recommended way to self-host Supabase is to use Docker.',
  items: [
    {
      title: 'Docker',
      href: '/guides/self-hosting/docker',
      icon: '/docs/img/icons/docker',
      description: 'Deploy Supabase within your own infrastructure using Docker Compose.',
      badge: 'Official',
    },
  ],
}

export const selfHostingNextSteps: ContentListingGroup = {
  id: 'self-hosting-next-steps',
  heading: 'Next steps',
  headingLevel: 'h2',
  type: 'grid',
  items: [
    {
      title: 'Manage API keys',
      href: '/guides/self-hosting/self-hosted-auth-keys',
      description: 'Rotate and manage your self-hosted project API keys.',
    },
    {
      title: 'Configure HTTPS',
      href: '/guides/self-hosting/self-hosted-proxy-https',
      description: 'Set up HTTPS with a reverse proxy for your self-hosted deployment.',
    },
    {
      title: 'Edge Functions',
      href: '/guides/self-hosting/self-hosted-functions',
      description: 'Deploy and configure Edge Functions in your self-hosted environment.',
    },
  ],
}

export const selfHostingCommunity: ContentListingGroup = {
  id: 'self-hosting-community',
  heading: 'Community-driven projects',
  headingLevel: 'h2',
  type: 'grid',
  columns: 2,
  items: [
    {
      title: 'Kubernetes',
      href: 'https://github.com/supabase-community/supabase-kubernetes',
      description: 'Helm charts to deploy a Supabase on Kubernetes.',
    },
    {
      title: 'Traefik',
      href: 'https://github.com/supabase-community/supabase-traefik',
      description: 'A self-hosted Supabase setup with Traefik as a reverse proxy.',
    },
  ],
}
