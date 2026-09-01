import { href } from '../router/url.ts'
import { AUTHOR, NPM_URL, NUCLO_URL, REPO_URL } from '../site.ts'

export function Footer() {
  return footer(
    div(
      { className: 'footer-brand' },
      a(
        { className: 'brand-mark footer-brand-mark', href: href(''), 'aria-label': 'mother-mask home' },
        img({ src: href('mother-mask-logo.svg'), alt: '', width: 40, height: 40, loading: 'lazy' }),
      ),
      div(
        { className: 'footer-brand-copy' },
        span({ className: 'footer-brand-name' }, 'mother-mask'),
        p(
          'Crafted with care by  ',
          a({ className: 'footer-author', href: AUTHOR.url, target: '_blank', rel: 'noreferrer' }, 'dan2dev ', span({ 'aria-hidden': 'true' }, '↗')),
        ),
        p(
          'This site is built with ',
          a({ className: 'footer-tech', href: NUCLO_URL, target: '_blank', rel: 'noreferrer' }, 'Nuclo'),
        ),
      ),
    ),

    div(
      { className: 'footer-columns' },

      div(
        { className: 'footer-column' },
        span({ className: 'footer-column-label' }, 'Resources'),
        a({ href: href('quick-start.html') }, 'Quick start'),
        a({ href: href('examples.html') }, 'Examples'),
        a({ href: href('api.html') }, 'API reference'),
      ),

      div(
        { className: 'footer-column' },
        span({ className: 'footer-column-label' }, 'Community'),
        a({ href: REPO_URL, target: '_blank', rel: 'noreferrer' }, 'GitHub'),
        a({ href: `${REPO_URL}/issues`, target: '_blank', rel: 'noreferrer' }, 'Issues'),
      ),

      div(
        { className: 'footer-column' },
        span({ className: 'footer-column-label' }, 'Support'),
        a({ href: NPM_URL, target: '_blank', rel: 'noreferrer' }, 'npm'),
        a({ href: `${REPO_URL}/blob/main/LICENSE`, target: '_blank', rel: 'noreferrer' }, 'License (MIT)'),
      ),
    ),
  )
}
