/**
 * The home page: hero, why-it-exists, live playground, install.
 *
 * Unlike the docs pages this one has no sidebar and no prev/next — the shell
 * decides that from the route's empty path — so it is free to run full width.
 */
import { bundleArtifact, bundleGzipBytes, bundleGzipSize } from 'virtual:package-meta'
import { CodeBlock } from '../components/CodeBlock.ts'
import { InstallBox } from '../components/InstallBox.ts'
import { icon, type IconId } from '../components/icons.ts'
import { demoInputAttributes } from '../components/demo-input-attributes.ts'
import { href } from '../router/url.ts'
import { countHint, createDemos, digits } from '../demos/live.ts'
import type { PageTeardown } from '../router/page.ts'

function Feature(badge: string, iconId: IconId, heading: string, body: NodeModLike<'p'>) {
  return article({ className: 'feature' }, div({ className: `icon-badge ${badge}` }, icon(iconId)), div(h2(heading), body))
}

function PlaygroundField(iconId: IconId, text: string, id: string, attrs: Record<string, unknown>, note: NodeModLike<'label'>) {
  return label({ className: 'playground-field' }, icon(iconId), span(text), input({ ...demoInputAttributes, id, ...attrs }), note)
}

export function view() {
  return div(
    { className: 'page' },

    section(
      { className: 'hero', id: 'top' },
      div(
        { className: 'hero-inner' },

        div(
          { className: 'hero-copy' },
          h1('Input masks that feel ', span({ className: 'hero-highlight' }, 'effortless.')),
          p('A tiny, fully typed library for input that stays natural while people type, paste, and edit.'),
          div(
            { className: 'hero-actions' },
            a({ className: 'button-link', href: href('quick-start.html') }, 'Get started', icon('arrow-right-icon')),
          ),
        ),

        div(
          { className: 'hero-demo', 'aria-label': 'Live phone mask example' },
          div(
            { className: 'hero-demo-stage' },
            label({ className: 'hero-field', for: 'hero-live-phone' }, 'Try the phone mask'),
            div(
              { className: 'hero-input-wrap' },
              icon('phone-icon'),
              input({
                ...demoInputAttributes,
                id: 'hero-live-phone',
                'aria-describedby': 'hero-live-phone-hint',
                inputmode: 'tel',
                value: '(11) 98765-4321',
              }),
            ),
            div({ className: 'hero-demo-note' }, span({ id: 'hero-live-phone-hint' }, '✓ ready to edit')),
          ),
        ),
      ),
    ),

    section(
      { className: 'feature-strip', 'aria-label': 'Why mother-mask' },
      div(
        { className: 'feature-intro' },
        span({ className: 'section-kicker' }, 'Why mother-mask'),
        h2('Small API. Thoughtful behavior.'),
        p('Mask the value without getting in the user’s way—from the first keystroke to the final submit.'),
      ),

      div(
        { className: 'feature-grid' },
        Feature(
          'icon-badge-orange',
          'bolt-icon',
          'Ship less',
          p(
            { title: `${bundleArtifact}: ${bundleGzipBytes.toLocaleString('en-US')} bytes gzipped` },
            strong(bundleGzipSize),
            ' min+gz. No runtime baggage.',
          ),
        ),
        Feature('icon-badge-purple', 'code-icon', 'Meet users anywhere', p('One API for vanilla JS, React, Vue, and more.')),
        Feature('icon-badge-teal', 'puzzle-icon', 'Model real formats', p('Compose tokens, transforms, locales, and dynamic patterns.')),
        Feature('icon-badge-pink', 'heart-icon', 'Respect the caret', p('Typing, pasting, selection, and replacement stay predictable.')),
      ),
    ),

    section(
      { className: 'playground-section', id: 'overview', 'aria-labelledby': 'playground-heading' },
      div(
        { className: 'section-heading-row' },
        div(
          span({ className: 'section-kicker' }, 'Live playground'),
          h2({ id: 'playground-heading' }, 'Try the details that make the difference.'),
        ),
        p('Every field is live. Replace a selection, paste a messy value, or move the caret and keep typing.'),
      ),

      div(
        { className: 'playground-shell' },

        div(
          { className: 'playground-fields' },
          PlaygroundField(
            'phone-icon',
            'Phone number',
            'hero-phone',
            { 'aria-describedby': 'hero-phone-hint', inputmode: 'tel', value: '(11) 98765-4321' },
            small({ id: 'hero-phone-hint' }, '11 digits'),
          ),
          PlaygroundField('card-icon', 'Card number', 'hero-card', { inputmode: 'numeric', value: '1234 5678 9012 3456' }, small('16 digits')),
          PlaygroundField('calendar-icon', 'Date', 'hero-date', { inputmode: 'url', value: '28/08/2026' }, small('DD / MM / YYYY')),
          PlaygroundField('currency-icon', 'Currency', 'hero-currency', { inputmode: 'decimal', value: 'R$ 1.234,56' }, small('Brazilian real')),
          a({ className: 'more-examples', href: href('examples.html') }, 'Explore every example', icon('arrow-right-icon')),
        ),

        div(
          { className: 'playground-code-window' },
          div({ className: 'window-toolbar' }, span('TypeScript')),
          CodeBlock('home-playground'),
        ),
      ),
    ),

    section(
      { className: 'cta-banner' },
      div(
        { className: 'cta-banner-inner' },
        div(
          { className: 'cta-banner-copy' },
          span({ className: 'section-kicker' }, 'One command away'),
          h2('Make every keystroke feel considered.'),
          p('Install mother-mask and bring clarity to your forms.'),
        ),
        InstallBox(),
      ),
    ),
  )
}

export function setup(): PageTeardown {
  const demos = createDemos()

  const phoneHint = (hintId: string) => (value: string) => countHint(hintId, digits(value), 11, '11 digits')

  demos.mask('hero-live-phone', '(99) 99999-9999', phoneHint('hero-live-phone-hint'))
  demos.mask('hero-phone', '(99) 99999-9999', phoneHint('hero-phone-hint'))
  demos.mask('hero-card', '9999 9999 9999 9999')
  demos.mask('hero-date', '9{1,2}/9{1,2}/9{4}')
  demos.decimal('hero-currency', { prefix: 'R$ ', separator: '.', decimalSeparator: ',', decimalPlaces: 2 })

  return demos.teardown
}
