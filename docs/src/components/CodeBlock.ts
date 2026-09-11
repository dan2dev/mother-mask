/**
 * Code samples, highlighted at build time.
 *
 * `generated/snippets/index.ts` (written by scripts/build-snippets.ts) hands
 * over each sample already tokenized — a list of lines, each a list of
 * `[text, class]` pairs — so rendering is a plain walk over arrays. Framework
 * selection replaces only the token contents, and no highlighter reaches the
 * browser: Shiki's grammars are larger than this entire site, and the colors
 * never change once the build has run.
 *
 * The markup is ordinary elements rather than an HTML string, which is what
 * lets `hydrate()` claim the server-rendered code instead of re-creating it,
 * and keeps `textContent` equal to the original source — the copy button just
 * reads the element.
 */
import snippets, { snippetLangs } from '../generated/snippets/index.ts'
import type { HighlightedSnippet, SnippetLang, SnippetName, SnippetToken } from '../content/snippets.ts'
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

/**
 * A full, multi-line block with editor chrome and a copy button.
 *
 * `initialLines` overrides the vanilla content this snippet's key normally
 * resolves to — for a spot whose *default displayed state* isn't vanilla (the
 * home page's framework teaser starts on React, not vanilla; see
 * src/pages/overview.ts). Without it, the very first paint would show
 * vanilla content next to a pill row that already marks another framework
 * active, and hydration would immediately swap it — a visible flash on every
 * first-ever visit. Passing the matching framework's highlighted lines here
 * means the first paint already shows what hydration would repaint anyway.
 */
export function CodeBlock(name: SnippetName, filename?: string, initialLines?: HighlightedSnippet) {
  const lines = initialLines ?? snippets[name]
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
