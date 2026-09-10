import { href } from '../router/url.ts'
import { AUTHOR, NPM_URL, NUCLO_URL, REPO_URL } from '../site.ts'

export function Footer() {
  return footer(
    div(
      { className: 'footer-top' },
      div(
        { className: 'footer-brand' },
        a(
          { className: 'brand-mark footer-brand-mark', href: href(''), 'aria-label': 'mother-mask home' },
          img({ src: href('mother-mask-logo.svg'), alt: '', width: 40, height: 40, loading: 'lazy' }),
        ),
        div(
          { className: 'footer-brand-copy' },
          span({ className: 'footer-brand-name' }, 'mother-mask'),
          p('Zero-dependency TypeScript input masks for browser forms.'),
          p(
            { className: 'footer-brand-fine-print' },
            'MIT License • By ',
            a({ href: AUTHOR.url, target: '_blank', rel: 'noreferrer' }, 'dan2dev'),
            ' • Built with ',
            a({ href: NUCLO_URL, target: '_blank', rel: 'noreferrer' }, 'Nuclo'),
          ),
        ),
      ),

      div(
        { className: 'footer-columns' },

        div(
          { className: 'footer-column' },
          span({ className: 'footer-column-label' }, 'Library'),
          a({ href: href('quick-start.html') }, 'Quick start'),
          a({ href: href('examples.html') }, 'Examples'),
          a({ href: href('api.html') }, 'API reference'),
        ),

        div(
          { className: 'footer-column' },
          span({ className: 'footer-column-label' }, 'Community'),
          a({ href: REPO_URL, target: '_blank', rel: 'noreferrer' }, 'GitHub'),
          a({ href: `${REPO_URL}/issues`, target: '_blank', rel: 'noreferrer' }, 'Issues'),
          a({ href: NPM_URL, target: '_blank', rel: 'noreferrer' }, 'npm Registry'),
        ),
      ),
    ),

    div(
      { className: 'footer-bottom' },
      // Static, not `new Date()` — this page is prerendered at build time, and
      // a client/server year mismatch would just be a hydration bug waiting
      // to happen for one day a year. Bump by hand alongside a release.
      p('© 2026 mother-mask. All rights reserved.'),
      p('Crafted with care by ', a({ className: 'footer-author', href: AUTHOR.url, target: '_blank', rel: 'noreferrer' }, 'dan2dev')),
    ),
  )
}
