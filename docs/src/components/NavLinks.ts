/**
 * The docs page list, grouped by section, rendered into either the desktop
 * sidebar or the mobile menu. `aria-current` is a state-dependent value so the
 * highlight follows a client-side navigation without the links being rebuilt.
 */
import { ROUTES } from '../router/routes.ts'
import { ariaCurrent } from './aria-current.ts'
import { href } from '../router/url.ts'

const GROUPS = [...new Set(ROUTES.map((route) => route.group))]

export function NavLinks(className: string) {
  return nav(
    { className, 'aria-label': 'Docs' },
    ...GROUPS.map((group) =>
      div(
        { className: 'nav-group' },
        span({ className: 'nav-group-label' }, group),
        ...ROUTES.filter((route) => route.group === group).map((route) =>
          a({ href: href(route.path), 'aria-current': () => ariaCurrent(route.slug) }, route.label),
        ),
      ),
    ),
  )
}
