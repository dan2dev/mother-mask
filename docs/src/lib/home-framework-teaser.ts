/**
 * The framework-integrations pill row on the home page (mother-mask-design
 * node 2:497) — a self-contained UI (its own pill row + popover, its own
 * paint of the one code block), but its *choice* is shared with the
 * Frameworks page: both read and write `STORAGE_KEY` from lib/framework.ts,
 * so picking a framework on either page is remembered site-wide. Only a
 * first-ever visit (nothing in storage yet) defaults to React, matching the
 * mock's first impression — after that, whatever was last picked wins.
 *
 * Figma's row only has room for 6 pills before "+ N more"; the rest live in
 * a popover menu opened from that pill, not a link out to /frameworks.html.
 */
import baseSnippets from 'virtual:snippets'
import { paint, loaders, STORAGE_KEY, type Catalog } from './framework.ts'
import { FRAMEWORKS, isFramework, type Adapter, type Framework } from '../content/frameworks.ts'
import type { SnippetName } from '../content/snippets.ts'

const SNIPPET: SnippetName = 'framework-guide'
const DEFAULT_PILL: Adapter = 'react'

function readSavedFramework(): Framework | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return isFramework(saved) ? saved : null
  } catch {
    return null // Storage can be disabled — fall back to the default pill.
  }
}

function saveFramework(id: Framework): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* Storage can be disabled; the pick just won't survive a reload. */
  }
}

export function initHomeFrameworkTeaser(): void {
  const root = document.querySelector<HTMLElement>('[data-home-framework-teaser]')
  if (!root) return
  const block = root.querySelector<HTMLElement>('[data-snippet]')
  const codeEl = block?.querySelector<HTMLElement>('pre code')
  const tab = block?.querySelector<HTMLElement>('.code-chrome-filename')
  if (!codeEl) return
  const code: HTMLElement = codeEl

  const pillRow = root.querySelector<HTMLElement>('.framework-selector')
  const trigger = root.querySelector<HTMLButtonElement>('#framework-more-trigger')
  const triggerLabel = trigger?.querySelector<HTMLElement>('.framework-more-label')
  const menu = root.querySelector<HTMLElement>('#framework-more-menu')
  // The "+ N more" text, captured once before anything might overwrite it.
  const moreLabel = triggerLabel?.textContent ?? '+ more'

  const visiblePills = new Set(
    [...root.querySelectorAll<HTMLButtonElement>('.framework-selector > [data-framework]')].map((pill) => pill.dataset.framework),
  )

  function closeMenu(): void {
    if (!trigger || !menu) return
    menu.hidden = true
    trigger.setAttribute('aria-expanded', 'false')
  }

  function openMenu(): void {
    if (!trigger || !menu) return
    menu.hidden = false
    trigger.setAttribute('aria-expanded', 'true')
  }

  if (trigger && menu) {
    trigger.addEventListener('click', (event) => {
      event.stopPropagation()
      if (menu.hidden) openMenu()
      else closeMenu()
    })
    document.addEventListener('click', (event) => {
      if (!menu.hidden && !pillRow?.contains(event.target as Node)) closeMenu()
    })
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) {
        closeMenu()
        trigger.focus()
      }
    })
  }

  let request = 0

  async function choose(id: Framework, button: HTMLButtonElement, persist: boolean): Promise<void> {
    const current = ++request
    root!.querySelectorAll<HTMLButtonElement>('.framework-selector > [data-framework]').forEach((pill) => {
      pill.setAttribute('aria-pressed', String(pill === button))
    })
    menu?.querySelectorAll<HTMLButtonElement>('.framework-more-item').forEach((item) => item.setAttribute('aria-pressed', String(item === button)))
    // A hidden-tier pick has nothing in the visible row to mark "pressed" —
    // the trigger stands in for it instead, showing the framework it picked.
    const fromMenu = !visiblePills.has(id)
    if (triggerLabel) triggerLabel.textContent = fromMenu ? FRAMEWORKS.find((framework) => framework.id === id)?.label ?? moreLabel : moreLabel
    trigger?.classList.toggle('is-active', fromMenu)
    closeMenu()
    if (persist) saveFramework(id)

    try {
      const catalog: Catalog = id === 'vanilla' ? baseSnippets : (await loaders[id]()).default
      if (current !== request) return
      const lines = catalog[SNIPPET] ?? baseSnippets[SNIPPET]
      if (lines) paint(code, lines)
      if (tab) tab.textContent = FRAMEWORKS.find((framework) => framework.id === id)?.filename ?? tab.textContent
    } catch {
      // Leave whatever was last shown — a failed fetch here is cosmetic, not
      // worth an error state in a homepage teaser.
    }
  }

  root.querySelectorAll<HTMLButtonElement>('[data-framework]').forEach((pill) => {
    pill.addEventListener('click', () => {
      const id = pill.dataset.framework as Adapter | 'vanilla'
      void choose(id, pill, true)
    })
  })

  // Reader's remembered pick wins over the mock's React default; a
  // first-ever visit (nothing saved yet) still opens on React. Either way
  // this is a restore, not a new choice, so it doesn't re-write storage.
  const initial = readSavedFramework() ?? DEFAULT_PILL
  const initialButton =
    root.querySelector<HTMLButtonElement>(`.framework-selector > [data-framework="${initial}"]`) ??
    menu?.querySelector<HTMLButtonElement>(`[data-framework="${initial}"]`) ??
    root.querySelector<HTMLButtonElement>(`[data-framework="${DEFAULT_PILL}"]`)
  if (initialButton) void choose((initialButton.dataset.framework as Framework) ?? DEFAULT_PILL, initialButton, false)
}
