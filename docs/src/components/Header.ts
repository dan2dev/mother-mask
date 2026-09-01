import { packageVersion } from 'virtual:package-meta'
import { NavLinks } from './NavLinks.ts'
import { icon } from './icons.ts'
import { ariaCurrent } from './aria-current.ts'
import { href } from '../router/url.ts'
import { NPM_URL, REPO_URL } from '../site.ts'

const featured = [
  { slug: 'quick-start', path: 'quick-start.html', label: 'Get started' },
  { slug: 'examples', path: 'examples.html', label: 'Examples' },
  { slug: 'api', path: 'api.html', label: 'API' },
] as const

export function Header() {
  return header(
    div(
      { className: 'bar' },

      div(
        { className: 'brand-group' },
        a(
          { className: 'brand', href: href('') },
          span(
            { className: 'brand-mark', 'aria-hidden': 'true' },
            img({ src: href('mother-mask-logo.svg'), alt: '', width: 40, height: 40 }),
          ),
          'mother-mask',
        ),
        span({ className: 'version-pill' }, `v${packageVersion}`),
      ),

      nav(
        { className: 'header-nav', 'aria-label': 'Featured documentation' },
        ...featured.map((item) =>
          a(
            {
              href: href(item.path),
              'aria-current': () => ariaCurrent(item.slug),
            },
            item.label,
          ),
        ),
      ),

      // A <details> menu works before the bundle arrives and needs no state of
      // its own; the router closes it on navigation.
      details({ className: 'mobile-menu', id: 'mobile-menu' }, summary(icon('menu-icon'), span('Menu')), NavLinks('mobile-menu-nav')),

      div(
        { className: 'header-links' },
        button(
          { className: 'icon-link', id: 'theme-toggle', type: 'button', 'aria-label': 'Toggle dark mode' },
          icon('moon-icon'),
        ),
        a(
          { className: 'icon-link', href: REPO_URL, target: '_blank', rel: 'noreferrer', 'aria-label': 'GitHub repository' },
          icon('github-icon'),
        ),
        a(
          { className: 'icon-link', href: NPM_URL, target: '_blank', rel: 'noreferrer', 'aria-label': 'npm package' },
          icon('npm-icon'),
        ),
      ),
    ),
  )
}
