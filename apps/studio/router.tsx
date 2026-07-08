import * as Sentry from '@sentry/tanstackstart-react'
import type { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

import { routeTree } from './routeTree.gen'
import { getQueryClient } from '@/data/query-client'
import { BASE_PATH, IS_PLATFORM } from '@/lib/constants'
import { buildSentryClientOptions } from '@/lib/sentry-client-config'

export interface RouterContext {
  queryClient: QueryClient
}

// Skew protection: pin this browser session to the deployment that served it,
// so a long-lived dashboard session never 404s on a lazily-loaded JS chunk or
// gets a surprise version change mid-session. It's a session cookie (no
// expiry) — cleared when the tab/window closes, so the next visit gets the
// latest deploy. Scoped to BASE_PATH so the version check (hit at the root
// `/api/...`, outside this Path) stays unpinned and can still detect new
// deploys; the "Refresh" toast clears it before reloading (see
// use-check-latest-deploy). No-op unless we're on a Vercel deploy with Skew
// Protection enabled.
function pinDeploymentForSession() {
  if (typeof document === 'undefined') return
  if (!IS_PLATFORM) return
  if (process.env.NEXT_PUBLIC_VERCEL_SKEW_PROTECTION_ENABLED !== '1') return
  const deploymentId = process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID
  if (!deploymentId) return
  if (document.cookie.includes('__vdpl=')) return
  document.cookie = `__vdpl=${deploymentId}; Path=${BASE_PATH || '/'}; SameSite=Lax; Secure`
}

// Backstop for the pin above: if a lazily-loaded chunk 404s — most likely the
// pinned deployment aged out of Skew Protection's Maximum Age, so its hashed
// chunks are gone — Vite emits `vite:preloadError`. Drop the pin and reload so
// we land on the latest deployment (a plain reload wouldn't recover, since the
// cookie would just re-pin to the dead deployment). A short time-window guard
// prevents a reload loop if the latest deployment is itself broken.
function registerChunkErrorBackstop() {
  if (typeof window === 'undefined') return
  window.addEventListener('vite:preloadError', (event) => {
    const KEY = 'studio:chunk-error-reload-at'
    let last = 0
    try {
      last = Number(sessionStorage.getItem(KEY) || 0)
    } catch {
      // sessionStorage unavailable — fall through and attempt a reload anyway.
    }
    // Reloaded very recently → likely a loop; let Vite surface the error.
    if (Date.now() - last < 10_000) return
    event.preventDefault()
    try {
      sessionStorage.setItem(KEY, String(Date.now()))
    } catch {
      // ignore — worst case we lose loop protection for this reload.
    }
    document.cookie = `__vdpl=; Path=${BASE_PATH || '/'}; Max-Age=0`
    window.location.reload()
  })
}

function getContext(): RouterContext {
  return {
    queryClient: getQueryClient(),
  }
}

export function getRouter() {
  pinDeploymentForSession()
  registerChunkErrorBackstop()

  const context = getContext()

  const router = createRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Inlined via Vite's `define` at build time; stays undefined (= app at `/`)
    // unless NEXT_PUBLIC_BASE_PATH is set. Must agree with Vite `base`
    basepath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  })

  // @tanstack/react-router-ssr-query@1.166.12 pulls in @tanstack/query-core@5.100
  // as a peer, but our app pins react-query to 5.83. The QueryClient class is
  // structurally identical between the two, but TS treats them as nominally
  // distinct types because each version has its own `#private` field.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient as any })

  // Initialize Sentry on the client only. Mirrors the exact gating of the
  // Next.js client (instrumentation-client.ts) via the shared factory, so the
  // two runtimes report identically. `router.isServer` is true during the SPA
  // shell prerender / SSR handler — we must not double-init there (the server
  // Sentry is initialized separately in instrument.server.mjs).
  if (!router.isServer) {
    // NOTE (spike finding): the canonical recipe uses
    // `Sentry.tanstackRouterBrowserTracingIntegration(router)`, but that symbol
    // is NOT exported from the SDK's *browser* build in 10.59.0 / 10.64.0 — it
    // exists only as a no-op stub on the server entry. The types (index.types)
    // still declare it, so `tsc` passes while the browser bundle gets
    // `undefined`. Fall back to the plain browser tracing integration when the
    // TanStack-specific one is missing so navigations are still traced.
    const routerTracing =
      typeof Sentry.tanstackRouterBrowserTracingIntegration === 'function'
        ? Sentry.tanstackRouterBrowserTracingIntegration(router)
        : Sentry.browserTracingIntegration()

    const baseOptions = buildSentryClientOptions(Sentry)
    Sentry.init({
      ...baseOptions,
      integrations: [...((baseOptions.integrations as unknown[]) ?? []), routerTracing] as any,
    })
  }

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
