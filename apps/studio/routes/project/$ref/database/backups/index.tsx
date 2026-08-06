import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/project/$ref/database/backups/')({
  beforeLoad: ({ params }) => {
    throw redirect({ href: `/project/${params.ref}/database/backups/scheduled` })
  },
  staticData: {
    databaseLayoutTitle: 'Backups',
  },
})
