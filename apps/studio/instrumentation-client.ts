// This file configures the initialization of Sentry on the client (Next.js).
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// The init options + noise-filtering predicates now live in
// lib/sentry-client-config.ts so the TanStack Start build (router.tsx) can
// initialize Sentry with the exact same gating. This file stays Next-only.

import * as Sentry from '@sentry/nextjs'

import { buildSentryClientOptions } from '@/lib/sentry-client-config'

// Re-exported for instrumentation-client.test.ts and any consumers that
// imported the predicates from here before the extraction.
export {
  isBrowserWalletExtensionError,
  isCancellationRejection,
  isChallengeExpiredError,
  isUserAbortedOperation,
} from '@/lib/sentry-client-config'

Sentry.init(buildSentryClientOptions(Sentry))

// This export will instrument router navigations, and is only relevant if you enable tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
