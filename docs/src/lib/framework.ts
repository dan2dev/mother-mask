import baseSnippets from 'virtual:snippets'
import { FRAMEWORKS, isFramework, type Adapter, type Framework } from '../content/frameworks.ts'
import type { HighlightedSnippet, SnippetName } from '../content/snippets.ts'

type Catalog = Partial<Record<SnippetName, HighlightedSnippet>>
const loaders = {
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

const STORAGE_KEY = 'mother-mask:framework'
let selected: Framework = 'vanilla'
let catalog: Catalog = baseSnippets
let request = 0

/** Mutate code contents only; never rerender or rebind a demo input. */
function paint(code: HTMLElement, lines: HighlightedSnippet): void {
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

/** Also called after navigation, when new blocks have been inserted. */
export function refreshFrameworkCode(): void {
  document.querySelectorAll<HTMLElement>('[data-snippet]').forEach((block) => {
    const name = block.dataset.snippet as SnippetName
    // Framework components include their markup; the raw HTML starter is redundant.
    block.hidden = name === 'quick-start-html' && selected !== 'vanilla'
    if (block.dataset.renderedFramework === selected) return
    const code = block.querySelector<HTMLElement>('pre code')
    if (code) paint(code, catalog[name] ?? baseSnippets[name])
    block.dataset.renderedFramework = selected
  })
  document.querySelectorAll<HTMLElement>('[data-framework-guide]').forEach((panel) => {
    panel.hidden = panel.dataset.frameworkGuide !== selected
  })
  document.querySelectorAll<HTMLElement>('[data-framework-label]').forEach((label) => {
    label.textContent = FRAMEWORKS.find((framework) => framework.id === selected)!.label
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
