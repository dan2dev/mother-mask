/**
 * Previous/next links along the reading order in `routes.ts`.
 *
 * Both ends are state-dependent: the shell is built once and survives every
 * navigation, so these follow the active route rather than being rebuilt. The
 * empty `<span>` placeholders keep the first and last pages' single link on the
 * side it belongs on, without a second grid rule.
 */
import { neighbours } from '../router/routes.ts'
import { activeRoute } from '../router/active.ts'
import { href } from '../router/url.ts'

export function PageNav() {
  const prev = () => neighbours(activeRoute().slug).prev
  const next = () => neighbours(activeRoute().slug).next

  return nav(
    { className: 'page-nav', 'aria-label': 'Docs pages' },

    when(
      () => prev() !== undefined,
      a(
        { className: 'page-nav-link page-nav-prev', href: () => href(prev()?.path ?? '') },
        span({ className: 'page-nav-label' }, '← Previous'),
        span({ className: 'page-nav-title' }, () => prev()?.label ?? ''),
      ),
    ).else(span()),

    when(
      () => next() !== undefined,
      a(
        { className: 'page-nav-link page-nav-next', href: () => href(next()?.path ?? '') },
        span({ className: 'page-nav-label' }, 'Next →'),
        span({ className: 'page-nav-title' }, () => next()?.label ?? ''),
      ),
    ).else(span()),
  )
}
