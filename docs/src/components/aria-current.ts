/**
 * `aria-current` is spelled `'false'` rather than left off when a link is not
 * the current page. Both are correct ARIA — `false` is the attribute's own
 * default — but Nuclo (0.2.30) applies a state-dependent attribute and never
 * removes one, so a value that becomes `undefined` would leave the previous
 * page's marker behind on every navigation. Two real values, always applied.
 */
import { activeRoute } from '../router/active.ts'

export function ariaCurrent(slug: string): 'page' | 'false' {
  return activeRoute().slug === slug ? 'page' : 'false'
}
