import changelogProductTags from '~/data/changelog-product-tags.json'

import type { ChangelogEntry, ChangeType } from './changelog-repo'

export type ChangelogTimelineIndexItem = {
  slug: string
  title: string
  summary: string
  sortDate: string
  changeType: ChangeType
  affectedProducts: string[]
}

export function toChangelogTimelineIndexItem(entry: ChangelogEntry): ChangelogTimelineIndexItem {
  return {
    slug: entry.slug,
    title: entry.frontmatter.title,
    summary: entry.summary,
    sortDate: entry.sortDate,
    changeType: entry.frontmatter.change_type,
    affectedProducts: entry.frontmatter.affected_products ?? [],
  }
}

export const CHANGE_TYPE_DISPLAY: Record<
  ChangeType,
  { label: string; badgeVariant: 'default' | 'warning' | 'success' | 'destructive' }
> = {
  'breaking-change': { label: 'Breaking Change', badgeVariant: 'destructive' },
  deprecation: { label: 'Deprecation', badgeVariant: 'warning' },
  'new-feature': { label: 'New Feature', badgeVariant: 'success' },
  improvement: { label: 'Improvement', badgeVariant: 'default' },
  'bug-fix': { label: 'Bug Fix', badgeVariant: 'warning' },
  security: { label: 'Security', badgeVariant: 'destructive' },
  policy: { label: 'Policy', badgeVariant: 'default' },
}

/** Internal changelog index URL with preselected tag filter (nuqs `tags` param). */
export function changelogTagFilterUrl(productSlug: string) {
  return `/changelog?tags=${encodeURIComponent(productSlug.toLowerCase())}`
}

/** Internal changelog index URL with preselected change-type filter (nuqs `types` param). */
export function changelogTypeFilterUrl(changeType: ChangeType) {
  return `/changelog?types=${encodeURIComponent(changeType)}`
}

export const CHANGE_TYPES = Object.keys(CHANGE_TYPE_DISPLAY) as ChangeType[]

export const CHANGELOG_PRODUCT_TAGS = changelogProductTags as Array<{
  slug: string
  label: string
}>

const CHANGELOG_PRODUCT_SLUG_SET = new Set<string>(CHANGELOG_PRODUCT_TAGS.map((tag) => tag.slug))

export function isChangelogProductSlug(value: string) {
  return CHANGELOG_PRODUCT_SLUG_SET.has(value)
}

export function isChangelogChangeType(value: string): value is ChangeType {
  return Object.prototype.hasOwnProperty.call(CHANGE_TYPE_DISPLAY, value)
}

export function itemMatchesChangelogSearch(item: ChangelogTimelineIndexItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true
  if (item.title.toLowerCase().includes(normalizedQuery)) return true
  return item.affectedProducts.some((product) => product.toLowerCase().includes(normalizedQuery))
}

export function itemMatchesChangelogSelectedTags(
  item: ChangelogTimelineIndexItem,
  selectedTags: Set<string>
) {
  if (selectedTags.size === 0) return true
  const productSlugs = new Set(item.affectedProducts.map((product) => product.toLowerCase()))
  for (const slug of selectedTags) {
    if (productSlugs.has(slug.toLowerCase())) return true
  }
  return false
}

export function itemMatchesChangelogSelectedTypes(
  item: ChangelogTimelineIndexItem,
  selectedTypes: Set<ChangeType>
) {
  if (selectedTypes.size === 0) return true
  return selectedTypes.has(item.changeType)
}
