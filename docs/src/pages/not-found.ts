import { href } from '../router/url.ts'
import { ROUTES } from '../router/routes.ts'

/**
 * What a static host shows for a URL with no file behind it.
 *
 * It lists the whole site rather than apologising and stopping: someone who
 * mistyped a URL, or followed a link to a page that has since been renamed, is
 * one click from wherever they meant to go.
 */
export function view() {
  return div(
    { className: 'page' },
    section(
      { id: 'not-found' },
      h1({ className: 'page-title' }, 'Page not found'),
      p({ className: 'section-sub' }, 'That URL is not part of the mother-mask documentation. These pages are:'),
      nav(
        { className: 'route-list', 'aria-label': 'All documentation pages' },
        ...ROUTES.map((route) => a({ href: href(route.path) }, route.label)),
      ),
    ),
  )
}
