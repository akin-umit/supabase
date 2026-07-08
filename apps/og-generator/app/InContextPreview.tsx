'use client'

/**
 * "View in situ" mockups (Supaimage in-context preview follow-up).
 *
 * Today's platform-crop preview only shows a cropped rectangle — not what the
 * image looks like in actual use. These are rough, illustrative approximations
 * of real post/listing UI (not pixel-matches to the live platforms/site),
 * embedding the currently-rendered image so switching Brand/Format instantly
 * shows how it reads in context. Twitter/X and LinkedIn use each platform's
 * real light/dark palette (not our app's semantic tokens) so the colors read
 * as authentic, not just "dark card on our UI".
 */

export type InContextMode = 'none' | 'twitter' | 'linkedin' | 'blog'
type PreviewTheme = 'light' | 'dark'

export const IN_CONTEXT_OPTS: { value: InContextMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'blog', label: 'Blog listing' },
]

interface Props {
  imgUrl: string | null
  headline: string
  eyebrow: string | null
  aspect: string
}

interface ThemedProps extends Props {
  theme: PreviewTheme
}

// Real platform palettes (brief follow-up: "as accurate as possible") —
// deliberately hardcoded hex, not our app's semantic tokens, since the goal
// is to look like the actual X/LinkedIn UI, not our own design system.
const TWITTER_PALETTE = {
  light: { bg: '#ffffff', text: '#0f1419', secondary: '#536471', border: '#eff3f4', icon: '#536471' },
  dark: { bg: '#000000', text: '#e7e9ea', secondary: '#71767b', border: '#2f3336', icon: '#71767b' },
}
const TWITTER_BLUE = '#1d9bf0'

const LINKEDIN_PALETTE = {
  light: { bg: '#ffffff', text: 'rgba(0,0,0,0.9)', secondary: 'rgba(0,0,0,0.6)', border: '#e0e0e0', avatar: '#e0e0e0' },
}
const LINKEDIN_BLUE = '#0a66c2'

function ActionIcon({ d, color }: { d: string; color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const ICONS = {
  reply: 'M21 12a8 8 0 1 1-3.2-6.4M21 5v5h-5',
  retweet: 'M17 2l4 4-4 4M3 6h13a4 4 0 0 1 4 4v2M7 22l-4-4 4-4M21 18H8a4 4 0 0 1-4-4v-2',
  like: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z',
  share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14',
}

function VerifiedBadge({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l2.4 1.2 2.6-.6 1.4 2.3 2.3 1.4-.6 2.6L21.3 11l-1.2 2.4.6 2.6-2.3 1.4-1.4 2.3-2.6-.6L12 20.3l-2.4-1.2-2.6.6-1.4-2.3-2.3-1.4.6-2.6L2.7 11l1.2-2.4-.6-2.6 2.3-1.4 1.4-2.3 2.6.6z" />
      <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TwitterCardMockup({ imgUrl, headline, aspect, theme }: ThemedProps) {
  const c = TWITTER_PALETTE[theme]
  return (
    <div
      className="w-full max-w-[500px] rounded-2xl border p-4"
      style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text, fontFamily: 'Helvetica, Arial, sans-serif' }}
    >
      <div className="flex gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full" style={{ backgroundColor: c.border }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[15px]">
            <span className="font-bold">Supabase</span>
            <VerifiedBadge color={TWITTER_BLUE} />
            <span style={{ color: c.secondary }}>@supabase · 2h</span>
          </div>
          <p className="mt-0.5 text-[15px] leading-snug">{headline}</p>
          {imgUrl && (
            <div className="mt-3 w-full overflow-hidden rounded-2xl border" style={{ aspectRatio: aspect, borderColor: c.border }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="mt-3 flex max-w-[320px] items-center justify-between">
            <ActionIcon d={ICONS.reply} color={c.icon} />
            <ActionIcon d={ICONS.retweet} color={c.icon} />
            <ActionIcon d={ICONS.like} color={c.icon} />
            <ActionIcon d={ICONS.share} color={c.icon} />
          </div>
        </div>
      </div>
    </div>
  )
}

function LinkedInCardMockup({ imgUrl, headline, aspect }: Props) {
  const c = LINKEDIN_PALETTE.light
  return (
    <div
      className="w-full max-w-[500px] rounded-lg border p-4"
      style={{
        backgroundColor: c.bg,
        borderColor: c.border,
        color: c.text,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div className="flex gap-2">
        <div className="h-12 w-12 shrink-0 rounded-full" style={{ backgroundColor: c.avatar }} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Supabase</div>
          <div className="text-xs" style={{ color: c.secondary }}>
            148,203 followers
          </div>
          <div className="text-xs" style={{ color: c.secondary }}>
            2h · 🌐
          </div>
        </div>
        <button
          className="h-fit shrink-0 rounded-full border px-3 py-1 text-sm font-semibold"
          style={{ borderColor: LINKEDIN_BLUE, color: LINKEDIN_BLUE }}
        >
          + Follow
        </button>
      </div>
      <p className="mt-3 text-sm leading-snug">{headline}</p>
      {imgUrl && (
        <div className="mt-3 -mx-4 w-[calc(100%+2rem)] overflow-hidden border-y" style={{ aspectRatio: aspect, borderColor: c.border }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: c.secondary }}>
        <ActionIcon d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14" color={c.secondary} />
        Like
        <span className="ml-3">Comment</span>
        <span className="ml-3">Share</span>
      </div>
    </div>
  )
}

function BlogListingMockup({ imgUrl, headline, eyebrow, aspect }: Props) {
  const fillerCards = [
    { eyebrow: 'Engineering', title: 'Scaling Postgres connections with Supavisor' },
    { eyebrow: 'Launch Week', title: 'Introducing Edge Functions v2' },
  ]
  return (
    <div className="grid w-full max-w-[760px] grid-cols-1 gap-4 sm:grid-cols-3">
      {[
        { yours: true, eyebrow: eyebrow ?? 'Engineering', title: headline },
        fillerCards[0],
        fillerCards[1],
      ].map((c, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div
            className="w-full overflow-hidden rounded-lg border border-default bg-surface-100"
            style={{ aspectRatio: aspect }}
          >
            {i === 0 && imgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-surface-200" />
            )}
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wide text-brand">{c.eyebrow}</span>
          <span className="text-sm font-medium leading-snug text-foreground">{c.title}</span>
          <span className="text-xs text-foreground-lighter">Jul 2, 2026 · 4 min read</span>
        </div>
      ))}
    </div>
  )
}

export function InContextPreview({ mode, ...rest }: Props & { mode: InContextMode }) {
  if (mode === 'none') return null
  if (mode === 'twitter') {
    // Twitter/X always shows both themes side by side — no toggle needed.
    return (
      <div className="flex w-full flex-wrap justify-center gap-4 rounded-lg bg-surface-100 p-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-foreground-lighter">Light</span>
          <TwitterCardMockup {...rest} theme="light" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-foreground-lighter">Dark</span>
          <TwitterCardMockup {...rest} theme="dark" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex w-full justify-center rounded-lg bg-surface-100 p-6">
      {mode === 'linkedin' && <LinkedInCardMockup {...rest} />}
      {mode === 'blog' && <BlogListingMockup {...rest} />}
    </div>
  )
}
