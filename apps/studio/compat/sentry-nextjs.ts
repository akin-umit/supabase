// TanStack-build compat shim for `@sentry/nextjs`.
//
// App source imports `@sentry/nextjs` ubiquitously (captureException,
// startSpan, withScope, captureMessage, setTag, setUser, and the Event /
// Breadcrumb types). Under the Next.js build those resolve to the real
// package. Under the TanStack Start Vite build, vite.config.ts aliases
// `@sentry/nextjs` → this file so every call site funnels into the single
// unified SDK (`@sentry/tanstackstart-react`), which is a superset of
// `@sentry/react` on the client and `@sentry/node` on the server. This keeps
// one Sentry SDK (and one `@sentry/core` hub) in the TanStack bundle instead
// of shipping both `@sentry/nextjs` and the unified SDK side by side.
//
// Next-only entrypoints (`withSentryConfig`, `captureRouterTransitionStart`,
// `captureRequestError`) are intentionally absent — they live in Next-only
// files (next.config.ts, instrumentation.ts, instrumentation-client.ts) that
// are never pulled into the TanStack module graph.

export * from '@sentry/tanstackstart-react'
