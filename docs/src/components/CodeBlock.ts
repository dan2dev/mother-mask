/**
 * Code samples, highlighted at build time.
 *
 * `virtual:snippets` hands over each sample already tokenized — a list of
 * lines, each a list of `[text, class]` pairs — so rendering is a plain walk
 * over arrays. Framework selection replaces only the token contents, and no
 * highlighter reaches the browser: Shiki's grammars are larger than this entire
 * site, and the colors never change once the build has run.
 *
 * The markup is ordinary elements rather than an HTML string, which is what
 * lets `hydrate()` claim the prerendered code instead of re-creating it, and
 * keeps `textContent` equal to the original source — the copy button just reads
 * the element.
 */
import snippets from 'virtual:snippets'
import snippetLangs from 'virtual:snippet-langs'
import type { SnippetLang, SnippetName, SnippetToken } from '../content/snippets.ts'
import { icon } from './icons.ts'

function tokens(line: readonly SnippetToken[]) {
  return line.map(([text, className]) => (className ? span({ className }, text) : text))
}

// A generic "index.<ext>" reads fine for every docs snippet (matches the
// Figma docs-editor mocks exactly for html/ts). Pass an explicit `filename`
// to CodeBlock() for a spot that names a real file instead (a framework
// component, a landing-page "main.ts"). This is only the *initial* tab: the
// Frameworks page's own `framework-guide` block relabels it too when another
// framework is picked (see refreshFrameworkCode in src/lib/framework.ts).
const DEFAULT_FILENAME: Record<SnippetLang, string> = {
  html: 'index.html',
  ts: 'index.ts',
  tsx: 'App.tsx',
  vue: 'App.vue',
  svelte: 'App.svelte',
  bash: 'terminal',
}

/** A full, multi-line block with editor chrome and a copy button. */
export function CodeBlock(name: SnippetName, filename?: string) {
  const lines = snippets[name]
  const tab = filename ?? DEFAULT_FILENAME[snippetLangs[name]]

  return div(
    { className: 'code-block', 'data-snippet': name },
    div(
      { className: 'code-chrome' },
      div(
        { className: 'window-dots', 'aria-hidden': 'true' },
        span({ className: 'window-dot window-dot-red' }),
        span({ className: 'window-dot window-dot-yellow' }),
        span({ className: 'window-dot window-dot-green' }),
      ),
      span({ className: 'code-chrome-filename' }, tab),
      CopyButton('Copy code'),
    ),
    // Lines are joined with real newlines rather than wrapped in per-line
    // elements, so `textContent` is the original source and the copy button
    // needs nothing but the element.
    pre({ className: 'shiki' }, code(...lines.flatMap((line, i) => (i === 0 ? tokens(line) : ['\n', ...tokens(line)])))),
  )
}

export function CopyButton(label: string) {
  return button({ className: 'copy-btn', type: 'button', 'aria-label': label }, icon('copy-icon'))
}
