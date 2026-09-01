/**
 * The docs page list, rendered into either the desktop sidebar or the mobile
 * menu. `aria-current` is a state-dependent value so the highlight follows a
 * client-side navigation without the links being rebuilt.
 */
import { ROUTES } from '../router/routes.ts'
import { ariaCurrent } from './aria-current.ts'
import { href } from '../router/url.ts'

export function NavLinks(className: string) {
  return nav(
    { className, 'aria-label': 'Primary' },
    ...ROUTES.map((route) =>
      a(
        {
          href: href(route.path),
          'aria-current': () => ariaCurrent(route.slug),
        },
        route.label,
      ),
    ),
  )
}
