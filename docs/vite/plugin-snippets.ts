/**
 * Serves `virtual:snippets`: every sample in src/content/snippets.ts, already
 * run through Shiki.
 *
 * Highlighting is a build-time step on purpose. Shiki's grammars and WASM
 * regex engine are far larger than the whole site, and the tokens for a given
 * snippet never change at runtime — so the browser gets a small array of
 * `[text, className]` pairs and renders them with ordinary spans. That keeps
 * the server-rendered markup and the SPA-rendered markup byte-identical, which
 * is what lets `hydrate()` claim the prerendered code blocks instead of
 * rebuilding them.
 *
 * Colors are not in the payload: `codeTheme` marks each scope group with a
 * sentinel that maps to a `tk-*` class, and global.css points those at the
 * site's CSS variables. See src/styles/code-theme.ts.
 */
import type { Plugin } from 'vite'
import { codeToTokens, type BuiltinLanguage, type ThemeRegistrationRaw } from 'shiki'
import { snippets, type HighlightedSnippet, type SnippetToken } from '../src/content/snippets.ts'
import { codeTheme, TOKEN_CLASS } from '../src/styles/code-theme.ts'

const VIRTUAL_ID = 'virtual:snippets'
const RESOLVED_ID = '\0virtual:snippets'

type SentinelColor = keyof typeof TOKEN_CLASS

function classFor(color: string | undefined): string {
  if (!color) return ''
  return TOKEN_CLASS[color.toLowerCase() as SentinelColor] ?? ''
}

async function highlightAll(): Promise<Record<string, HighlightedSnippet>> {
  const out: Record<string, HighlightedSnippet> = {}

  for (const [name, snippet] of Object.entries(snippets)) {
    const { tokens } = await codeToTokens(snippet.code, {
      lang: snippet.lang as BuiltinLanguage,
      theme: codeTheme as unknown as ThemeRegistrationRaw,
    })

    out[name] = tokens.map((line) => {
      const merged: SnippetToken[] = []
      for (const token of line) {
        const cls = classFor(token.color)
        // Shiki splits on every scope change; neighbouring runs that land on
        // the same class render identically, so fold them into one span.
        const last = merged[merged.length - 1]
        if (last && last[1] === cls) merged[merged.length - 1] = [last[0] + token.content, cls]
        else merged.push([token.content, cls])
      }
      return merged
    })
  }

  return out
}

export function snippetsPlugin(): Plugin {
  let generated: Promise<string> | null = null

  return {
    name: 'mother-mask-docs:snippets',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined
      generated ??= highlightAll().then((data) => `export default ${JSON.stringify(data)}`)
      return generated
    },
  }
}
