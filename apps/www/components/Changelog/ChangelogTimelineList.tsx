import type { ChangeType } from '~/lib/changelog-repo'
import {
  CHANGE_TYPE_DISPLAY,
  changelogTagFilterUrl,
  changelogTypeFilterUrl,
  type ChangelogTimelineIndexItem,
} from '~/lib/changelog.utils'
import dayjs from 'dayjs'
import { GitCommit } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Badge, cn } from 'ui'

const DEFAULT_PAGE_SIZE = 40

function groupChangelogIndexByYear(
  items: ChangelogTimelineIndexItem[]
): [number, ChangelogTimelineIndexItem[]][] {
  const map = new Map<number, ChangelogTimelineIndexItem[]>()
  for (const item of items) {
    const y = dayjs(item.sortDate).year()
    if (!map.has(y)) map.set(y, [])
    map.get(y)!.push(item)
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0])
}

export function ChangeTypeBadge({
  type,
  onBadgeClick,
  className,
}: {
  type: ChangeType
  onBadgeClick?: (e: MouseEvent) => void
  className?: string
}) {
  const { label, badgeVariant } = CHANGE_TYPE_DISPLAY[type]
  return (
    <a
      href={changelogTypeFilterUrl(type)}
      className="inline-flex shrink-0 no-underline focus-visible:ring-brand-default rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
      onClick={onBadgeClick}
    >
      <Badge variant={badgeVariant} className={className}>
        {label}
      </Badge>
    </a>
  )
}

export function ProductBadges({
  products,
  onBadgeClick,
  tiny,
  className,
}: {
  products: string[]
  onBadgeClick?: (e: MouseEvent) => void
  tiny?: boolean
  className?: string
}) {
  if (products.length === 0) return null
  return (
    <div className={cn('flex flex-wrap items-center', tiny ? 'gap-0.5' : 'gap-1', className)}>
      {products.map((product) => (
        <a
          key={product}
          href={changelogTagFilterUrl(product)}
          className={
            tiny
              ? 'inline-flex shrink-0 no-underline focus-visible:ring-brand-default rounded-sm focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden'
              : 'inline-flex shrink-0 no-underline focus-visible:ring-brand-default rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden'
          }
          onClick={onBadgeClick}
        >
          <Badge
            variant="default"
            className={cn(
              'tracking-normal lowercase border-default',
              tiny
                ? 'text-foreground-lighter hover:text-foreground-light px-0.5 py-px text-[8px] leading-none'
                : 'text-foreground-light hover:text-foreground px-1.5 py-px text-[11px] leading-tight'
            )}
          >
            {product}
          </Badge>
        </a>
      ))}
    </div>
  )
}

function TimelineRow({ item, href }: { item: ChangelogTimelineIndexItem; href: string }) {
  const dateLabel = dayjs(item.sortDate).format('MMM D')

  return (
    <div
      className="group border-default flex w-full flex-col gap-0.5 border-b py-3 text-left scroll-mt-16"
      id={item.slug}
    >
      <div className="min-w-0">
        <Link href={href} prefetch={false} className="min-w-0 text-left">
          <h3 className="text-foreground text-lg leading-snug hover:underline">{item.title}</h3>
        </Link>
      </div>
      {item.summary && <p className="text-foreground-lighter text-sm">{item.summary}</p>}
      <div className="flex min-w-0 gap-2 pt-0.5">
        <time
          dateTime={item.sortDate}
          className="text-foreground-lighter text-xs font-mono tracking-normal"
        >
          {dateLabel}
        </time>
        <ChangeTypeBadge type={item.changeType} onBadgeClick={(e) => e.stopPropagation()} />
        <ProductBadges products={item.affectedProducts} onBadgeClick={(e) => e.stopPropagation()} />
      </div>
    </div>
  )
}

type Props = {
  items: ChangelogTimelineIndexItem[]
  omitOuterTimelineBorder?: boolean
  pageSize?: number
}

export function ChangelogTimelineList(props: Props) {
  const { items, omitOuterTimelineBorder, pageSize = DEFAULT_PAGE_SIZE } = props
  const [visibleCount, setVisibleCount] = useState(() => Math.min(pageSize, items.length))
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Reset the window whenever the underlying item set changes (e.g. a new search/filter).
  useEffect(() => {
    setVisibleCount(Math.min(pageSize, items.length))
  }, [items, pageSize])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || visibleCount >= items.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + pageSize, items.length))
        }
      },
      { rootMargin: '600px 0px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [items.length, pageSize, visibleCount])

  const visibleItems = items.slice(0, visibleCount)
  const yearGroups = groupChangelogIndexByYear(visibleItems)

  return (
    <div
      className={
        omitOuterTimelineBorder ? 'relative' : 'border-muted relative lg:border-l lg:ml-2 lg:pl-8'
      }
    >
      {yearGroups.map(([year, yearItems], yearIndex) => (
        <section
          key={year}
          id={year.toString()}
          aria-labelledby={`${year}`}
          className="relative scroll-mt-20"
        >
          <Link
            href={`#${year}`}
            prefetch={false}
            id={`${year}`}
            className="lg:hidden block border-default bg-default text-foreground-light sticky top-[65px] scroll-mt-10 z-20 border-b py-2 pl-0 font-mono text-sm tracking-wide"
          >
            {year}
          </Link>

          <div
            className={
              yearIndex === yearGroups.length - 1
                ? 'grid lg:grid-cols-12 lg:gap-4 pt-2 lg:pt-2'
                : 'grid lg:grid-cols-12 lg:gap-4 pb-8 lg:pb-20 lg:py-2'
            }
          >
            <div className="relative hidden lg:col-span-2 lg:block">
              <div className="ml-[-42px] text-foreground lg:sticky lg:top-[calc(65px+1rem)] lg:pt-4">
                <div className="text-foreground-light mb-1 flex items-center gap-2">
                  <div className="bg-border border-muted flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border drop-shadow-xs">
                    <GitCommit size={14} strokeWidth={1.5} />
                  </div>
                  <Link
                    href={`#${year}`}
                    prefetch={false}
                    className="font-mono text-base leading-none"
                  >
                    {year}
                  </Link>
                </div>
              </div>
            </div>

            <div className="min-w-0 lg:col-span-10 [&>*:last-child]:border-b-0">
              {yearItems.map((item) => (
                <TimelineRow key={item.slug} item={item} href={`/changelog/${item.slug}`} />
              ))}
            </div>
          </div>
        </section>
      ))}
      {visibleCount < items.length && <div ref={sentinelRef} aria-hidden className="h-1" />}
    </div>
  )
}
