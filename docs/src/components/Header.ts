import { packageVersion } from '../generated/package-meta.ts'
import { NavLinks } from './NavLinks.ts'
import { icon } from './icons.ts'
import { activeRoute } from '../router/active.ts'
import { href } from '../router/url.ts'
import { NPM_URL, REPO_URL } from '../site.ts'

// mother-mask-design's navbar has exactly two primary links — "Docs" and
// "Examples" — not a row of page shortcuts. "Docs" covers every page with a
// sidebar (i.e. everything except the home page and Examples itself); it
// lands on Quick start, the first page actually about using the library.
function isDocsActive(): 'page' | 'false' {
  const slug = activeRoute().slug
  return slug !== 'overview' && slug !== 'examples' ? 'page' : 'false'
}

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
        span({ className: 'version-pill' }, span({ className: 'version-dot', 'aria-hidden': 'true' }), `v${packageVersion}`),
      ),

      nav(
        { className: 'header-nav', 'aria-label': 'Primary' },
        a({ href: href('quick-start.html'), 'aria-current': isDocsActive }, 'Docs'),
        a({ href: href('examples.html'), 'aria-current': () => (activeRoute().slug === 'examples' ? 'page' : 'false') }, 'Examples'),
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
