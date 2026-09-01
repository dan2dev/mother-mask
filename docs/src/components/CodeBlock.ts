/**
 * Code samples, highlighted at build time.
 *
 * `virtual:snippets` hands over each sample already tokenized — a list of
 * lines, each a list of `[text, class]` pairs — so rendering is a plain walk
 * over arrays. Nothing about a code block is state-dependent, and no
 * highlighter reaches the browser: Shiki's grammars are larger than this entire
 * site, and the colors never change once the build has run.
 *
 * The markup is ordinary elements rather than an HTML string, which is what
 * lets `hydrate()` claim the prerendered code instead of re-creating it, and
 * keeps `textContent` equal to the original source — the copy button just reads
 * the element.
 */
import snippets from 'virtual:snippets'
import type { SnippetName, SnippetToken } from '../content/snippets.ts'
import { icon } from './icons.ts'

function tokens(line: readonly SnippetToken[]) {
  return line.map(([text, className]) => (className ? span({ className }, text) : text))
}

/** A full, multi-line block with a copy button. */
export function CodeBlock(name: SnippetName) {
  const lines = snippets[name]

  return div(
    { className: 'code-block' },
    // Lines are joined with real newlines rather than wrapped in per-line
    // elements, so `textContent` is the original source and the copy button
    // needs nothing but the element.
    pre({ className: 'shiki' }, code(...lines.flatMap((line, i) => (i === 0 ? tokens(line) : ['\n', ...tokens(line)])))),
    CopyButton('Copy code'),
  )
}

/**
 * A one-line sample rendered inline, as used on the demo cards. Falls back to
 * the block renderer's tokens; only the element and the wrapping differ.
 */
export function InlineCode(name: SnippetName, className: string) {
  return code({ className: `shiki ${className}` }, ...snippets[name].flatMap((line) => tokens(line)))
}

export function CopyButton(label: string) {
  return button({ className: 'copy-btn', type: 'button', 'aria-label': label }, icon('copy-icon'))
}
