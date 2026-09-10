import baseSnippets from 'virtual:snippets'
import { FRAMEWORKS, isFramework, type Adapter, type Framework } from '../content/frameworks.ts'
import type { HighlightedSnippet, SnippetName } from '../content/snippets.ts'

export type Catalog = Partial<Record<SnippetName, HighlightedSnippet>>
export const loaders = {
  'react': () => import('virtual:snippets/react'),
  'vue': () => import('virtual:snippets/vue'),
  'angular': () => import('virtual:snippets/angular'),
  'svelte': () => import('virtual:snippets/svelte'),
  'solid': () => import('virtual:snippets/solid'),
  'preact': () => import('virtual:snippets/preact'),
  'lit': () => import('virtual:snippets/lit'),
  'stencil': () => import('virtual:snippets/stencil'),
  'alpine': () => import('virtual:snippets/alpine'),
  'web-components': () => import('virtual:snippets/web-components'),
  'qwik': () => import('virtual:snippets/qwik'),
  'inferno': () => import('virtual:snippets/inferno'),
  'octane': () => import('virtual:snippets/octane'),
  'mithril': () => import('virtual:snippets/mithril'),
  'ember': () => import('virtual:snippets/ember'),
  'knockout': () => import('virtual:snippets/knockout'),
  'riot': () => import('virtual:snippets/riot'),
} satisfies Record<Adapter, () => Promise<{ default: Catalog }>>

// Exported so the home page's own framework teaser (lib/home-framework-teaser.ts)
// can read/write the same preference — one persisted choice for the whole
// site, not two competing ones.
export const STORAGE_KEY = 'mother-mask:framework'
let selected: Framework = 'vanilla'
let catalog: Catalog = baseSnippets
let request = 0

/** Mutate code contents only; never rerender or rebind a demo input. */
export function paint(code: HTMLElement, lines: HighlightedSnippet): void {
  const content = document.createDocumentFragment()
  lines.forEach((line, index) => {
    if (index) content.append('\n')
    for (const [text, className] of line) {
      if (!className) content.append(text)
      else {
        const token = document.createElement('span')
        token.className = className
        token.textContent = text
        content.append(token)
      }
    }
  })
  code.replaceChildren(content)
}

/**
 * Repaints the Frameworks page's own code blocks and guide panels to match
 * `selected`. Everywhere else in the docs always shows the vanilla snippet
 * already baked into the prerendered markup, so this never runs there — see
 * `setup()` in src/pages/frameworks.ts, the only caller.
 */
export function refreshFrameworkCode(): void {
  document.querySelectorAll<HTMLElement>('[data-snippet]').forEach((block) => {
    const name = block.dataset.snippet as SnippetName
    if (block.dataset.renderedFramework === selected) return
    const code = block.querySelector<HTMLElement>('pre code')
    if (code) paint(code, catalog[name] ?? baseSnippets[name])
    // Only this one block's content actually changes language per framework
    // (the install command next to it is always the same `bash` line) — keep
    // its editor-chrome tab labeled with the file that framework is shown in.
    if (name === 'framework-guide') {
      const tab = block.querySelector('.code-chrome-filename')
      if (tab) tab.textContent = FRAMEWORKS.find((framework) => framework.id === selected)?.filename ?? tab.textContent
    }
    block.dataset.renderedFramework = selected
  })
  document.querySelectorAll<HTMLElement>('[data-framework-guide]').forEach((panel) => {
    panel.hidden = panel.dataset.frameworkGuide !== selected
  })
}

export function initFrameworkSelection(): void {
  const dropdown = document.getElementById('framework-select') as HTMLSelectElement
  const status = document.getElementById('framework-status')!

  async function choose(framework: Framework): Promise<void> {
    const current = ++request
    status.textContent = 'Loading…'
    dropdown.setAttribute('aria-busy', 'true')
    try {
      const next = framework === 'vanilla' ? baseSnippets : (await loaders[framework]()).default
      if (current !== request) return
      selected = framework
      catalog = next
      dropdown.value = framework
      refreshFrameworkCode()
      try { localStorage.setItem(STORAGE_KEY, framework) } catch { /* Storage can be disabled. */ }
      status.textContent = ''
    } catch {
      if (current !== request) return
      dropdown.value = selected
      status.textContent = 'Could not load examples. Try again.'
    } finally {
      if (current === request) dropdown.removeAttribute('aria-busy')
    }
  }

  dropdown.addEventListener('change', () => {
    if (isFramework(dropdown.value)) void choose(dropdown.value)
  })
  // Restore only after hydration so server and client initially render the same tree.
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isFramework(saved) && saved !== 'vanilla') void choose(saved)
  } catch { /* Vanilla remains available when storage is disabled. */ }
}
