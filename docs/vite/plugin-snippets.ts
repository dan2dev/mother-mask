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
import { snippets, type RawSnippet, type HighlightedSnippet, type SnippetToken } from '../src/content/snippets.ts'
import { codeTheme, TOKEN_CLASS } from '../src/styles/code-theme.ts'

import { frameworkSamples } from './framework-samples.ts'
import { isFramework } from '../src/content/frameworks.ts'

const VIRTUAL_ID = 'virtual:snippets'
const RESOLVED_ID = '\0virtual:snippets'

type SentinelColor = keyof typeof TOKEN_CLASS

function classFor(color: string | undefined): string {
  if (!color) return ''
  return TOKEN_CLASS[color.toLowerCase() as SentinelColor] ?? ''
}

async function highlightAll(source: Record<string, RawSnippet>): Promise<Record<string, HighlightedSnippet>> {
  const out: Record<string, HighlightedSnippet> = {}

  for (const [name, snippet] of Object.entries(source)) {
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
  const generated = new Map<string, Promise<string>>()

  return {
    name: 'mother-mask-docs:snippets',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      if (id.startsWith(`${VIRTUAL_ID}/`) && isFramework(id.slice(VIRTUAL_ID.length + 1))) return `\0${id}`
      return undefined
    },
    load(id) {
      if (id !== RESOLVED_ID && !id.startsWith(`${RESOLVED_ID}/`)) return undefined
      const framework = id.slice(RESOLVED_ID.length + 1)
      if (id !== RESOLVED_ID && (!isFramework(framework) || framework === 'vanilla')) return undefined
      if (!generated.has(id)) {
        const source = isFramework(framework) && framework !== 'vanilla' ? frameworkSamples(framework) : snippets
        generated.set(id, highlightAll(source).then((data) => `export default ${JSON.stringify(data)}`))
      }
      return generated.get(id)
    },
  }
}
