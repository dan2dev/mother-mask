/**
 * "On this page" — the docs pages' right rail.
 *
 * The rail knows nothing about what a page contains. Each `SectionHeading`
 * and `ExampleCard` adds its own link with Nuclo's `into()`, so the list is in
 * reading order, is server-rendered with the page, and leaves with it when the
 * router swaps the page out. A page with no linkable sections leaves the list
 * empty, and global.css hides the rail.
 */
const REGION = 'toc'

/** Ask the rail for a link to `#id`. Leaves only a comment where it is written. */
export function tocEntry(id: string, ...label: NodeModLike<'a'>[]) {
  return into(REGION, li(a({ href: `#${id}` }, ...label)))
}

export function Toc() {
  return nav(
    { className: 'toc', 'aria-label': 'On this page' },
    p({ className: 'toc-label' }, 'On this page'),
    ol(region({ id: REGION, type: 'stack' })),
  )
}

/** A section counts as being read once its top passes under the sticky header. */
const READING_LINE = 120

/** Mark the entry for the section being read — the last one scrolled past. */
export function syncToc(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>('.toc a')
  let current: HTMLAnchorElement | undefined

  for (const link of links) {
    const target = document.getElementById(link.hash.slice(1))
    if (!target || target.getBoundingClientRect().top > READING_LINE) break
    current = link
  }

  for (const link of links) {
    if (link === current) link.setAttribute('aria-current', 'location')
    else link.removeAttribute('aria-current')
  }
}

/** Bound once: the listener reads whatever rail is on screen, so navigation needs only a `syncToc()`. */
export function initToc(): void {
  let frame = 0
  addEventListener(
    'scroll',
    () => {
      frame ||= requestAnimationFrame(() => {
        frame = 0
        syncToc()
      })
    },
    { passive: true },
  )
  syncToc()
}
