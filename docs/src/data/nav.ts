// Single source of truth for every docs nav surface: the desktop sidebar, the
// mobile menu, the prev/next page-nav links, and the JSON-LD breadcrumb name
// for each page. Add a page by adding one entry here.

export interface NavItem {
  /** Matches a page's `current` prop to Layout. */
  slug: string
  /** Appended to `import.meta.env.BASE_URL` to build the link. '' = home. */
  path: string
  /** Sidebar / mobile-menu / breadcrumb label. */
  label: string
}

export const NAV: NavItem[] = [
  { slug: 'index', path: '', label: 'Overview' },
  { slug: 'quick-start', path: 'quick-start.html', label: 'Quick start' },
  { slug: 'examples', path: 'examples.html', label: 'Examples' },
  { slug: 'advanced-patterns', path: 'advanced-patterns.html', label: 'Custom patterns' },
  { slug: 'editing', path: 'editing.html', label: 'Editing' },
  { slug: 'decimals', path: 'decimals.html', label: 'Decimals' },
  { slug: 'regional', path: 'regional.html', label: 'Regional' },
  { slug: 'patterns', path: 'patterns.html', label: 'Patterns' },
  { slug: 'cdn', path: 'cdn.html', label: 'CDN' },
  { slug: 'api', path: 'api.html', label: 'API' },
]

/** Build a site-relative href for a nav path, honoring astro.config's `base`. */
export function navHref(path: string): string {
  // BASE_URL's trailing slash depends on trailingSlash config — don't assume
  // either way, just guarantee exactly one slash between base and path.
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return path ? `${base}/${path}` : `${base}/`
}

/** Absolute production URL for a nav path — used in canonical tags and JSON-LD. */
export function canonicalFor(path: string): string {
  return `https://dan2dev.github.io/mother-mask/${path}`
}

export function navIndex(slug: string): number {
  const i = NAV.findIndex((item) => item.slug === slug)
  if (i === -1) throw new Error(`Unknown nav slug: ${slug}`)
  return i
}
