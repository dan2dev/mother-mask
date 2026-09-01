/**
 * Serves `virtual:page-dates`: when each page was actually written and last
 * changed, taken from git.
 *
 * This exists because a sitemap that stamps every page with the build date is
 * worse than one with no dates at all — search engines learn that a `lastmod`
 * which changes on every deploy carries no information and stop trusting it.
 * The commit history is the only place that knows which page really changed,
 * so that is where the answer comes from, and a page with no answer gets no
 * `lastmod` rather than a fabricated one.
 *
 * The same dates fill in `datePublished` / `dateModified` on each page's
 * structured data, so the build has one source for both.
 *
 * A page's date is its own module's history, not that of the components or
 * stylesheet around it: a change to the shared header is not a change to what
 * the API reference says.
 */
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const VIRTUAL_ID = 'virtual:page-dates'
const RESOLVED_ID = '\0virtual:page-dates'

const PAGES_DIR = resolve(import.meta.dirname, '../src/pages')

export interface PageDates {
  /** ISO date of the commit that added the page, or null if it has none yet. */
  created: string | null
  /** ISO date of the last commit to touch it, or null. */
  modified: string | null
}

function git(...args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: PAGES_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

function collect(): Record<string, PageDates> {
  const pages = readdirSync(PAGES_DIR)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => file.replace(/\.ts$/, ''))

  const dates: Record<string, PageDates> = {}
  const empty = { created: null, modified: null }

  // A shallow clone only knows about the tip commit, so every file would come
  // back with the same date — exactly the useless signal this module exists to
  // avoid. Say so loudly and emit nothing.
  if (git('rev-parse', '--is-shallow-repository') === 'true') {
    console.warn(
      '[page-dates] shallow git clone: no per-page history, so sitemap lastmod and ' +
        'structured-data dates are omitted. Set `fetch-depth: 0` on the checkout step.',
    )
    for (const page of pages) dates[page] = empty
    return dates
  }

  for (const page of pages) {
    const file = `${page}.ts`
    const modified = git('log', '-1', '--format=%cs', '--', file)
    // `--diff-filter=A` finds the commit that added the file; the oldest such
    // commit is its birth, even if it has been deleted and restored since.
    const created = git('log', '--diff-filter=A', '--format=%cs', '--', file).split('\n').filter(Boolean).at(-1)

    dates[page] = modified ? { created: created ?? modified, modified } : empty
  }

  return dates
}

export function pageDatesPlugin(): Plugin {
  return {
    name: 'mother-mask-docs:page-dates',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },
    load(id) {
      return id === RESOLVED_ID ? `export default ${JSON.stringify(collect())}` : undefined
    },
  }
}
