/**
 * The home page: hero, why-it-exists, live playground, framework teaser,
 * install.
 *
 * Unlike the docs pages this one has no sidebar and no prev/next — the shell
 * decides that from the route's empty path — so it is free to run full width.
 */
import snippets from 'virtual:snippets'
import { paint } from '../lib/framework.ts'
import { bundleArtifact, bundleGzipBytes, bundleGzipSize } from 'virtual:package-meta'
import { CodeBlock } from '../components/CodeBlock.ts'
import { InstallBox } from '../components/InstallBox.ts'
import { icon, type IconId } from '../components/icons.ts'
import { demoInputAttributes } from '../components/demo-input-attributes.ts'
import { href } from '../router/url.ts'
import { createDemos, uppercaseAlphanumeric } from '../demos/live.ts'
import { initHomeFrameworkTeaser } from '../lib/home-framework-teaser.ts'
import { FRAMEWORKS, type Framework } from '../content/frameworks.ts'
import type { SnippetName } from '../content/snippets.ts'
import type { PageTeardown } from '../router/page.ts'

// The pill row only has room for a handful of frameworks before it needs a
// wide, oddly-shaped section — everything else lives behind "+ N more".
const VISIBLE_PILLS: readonly Framework[] = ['vanilla', 'react', 'vue', 'angular', 'svelte', 'solid']
const MORE_FRAMEWORKS = FRAMEWORKS.filter((framework) => !VISIBLE_PILLS.includes(framework.id))

function Feature(iconId: IconId, tag: string, heading: string, body: NodeModLike<'p'>) {
  return article(
    { className: 'feature' },
    div({ className: 'card-top' }, div({ className: 'icon-shell' }, icon(iconId)), span({ className: 'feature-tag' }, tag)),
    div({ className: 'card-copy' }, h3(heading), body),
  )
}

/** One live-bound field inside a "Try it live" card — mother-mask-design's
 * field rows are a static mock (a `<p>` standing in for the caret); these are
 * real inputs, so every field stays fully usable rather than dimming the
 * two the mock isn't "focused" on. */
function DemoField(label: string, hint: string, id: SnippetName, value: string) {
  return div(
    { className: 'demo-field' },
    div(
      { className: 'demo-field-label' },
      span({ className: 'demo-field-dot', 'aria-hidden': 'true' }),
      span({ className: 'demo-field-name' }, label),
      span({ className: 'demo-field-hint' }, hint),
    ),
    div({ className: 'demo-field-input-wrap' }, input({ ...demoInputAttributes, id, 'data-playground-snippet': id, 'aria-label': label, value })),
  )
}

function PlaygroundCard(label: string, snippet: SnippetName, ...fields: NodeModLike<'div'>[]) {
  return div(
    { className: 'playground-card-group' },
    span({ className: 'playground-card-label' }, label),
    div({ className: 'playground-card' }, div({ className: 'demo-fields' }, ...fields), CodeBlock(snippet, 'main.ts')),
  )
}

function FrameworkPill(frameworkId: string, label: string, active = false) {
  return button(
    { className: 'framework-pill', type: 'button', 'data-framework': frameworkId, 'aria-pressed': active ? 'true' : 'false' },
    label,
  )
}

export function view() {
  return div(
    { className: 'page' },

    section(
      { className: 'hero', id: 'top' },
      span(
        { className: 'hero-eyebrow' },
        span({ className: 'hero-eyebrow-tag' }, 'NEW RELEASE'),
        'Native decimal and currency formatting',
      ),
      h1('Input masks that feel effortless'),
      p(
        { className: 'hero-sub' },
        'A tiny, fully typed TypeScript library for formatting input that stays natural while people type, paste, and edit. Zero dependencies. ',
        bundleGzipSize,
        '.',
      ),
      div(
        { className: 'hero-actions' },
        a({ className: 'button-link', href: href('quick-start.html') }, icon('arrow-right-icon'), 'Get started'),
        InstallBox('npm install mother-mask', '-hero'),
      ),
    ),

    section(
      { className: 'feature-strip', 'aria-label': 'Why mother-mask' },
      div(
        { className: 'feature-header' },
        span({ className: 'section-kicker' }, 'Why mother-mask'),
        h2('Engineered for performance, flexibility, and polish.'),
      ),

      div(
        { className: 'feature-grid' },
        Feature(
          'bolt-icon',
          bundleGzipSize,
          'Ship less',
          p(
            { title: `${bundleArtifact}: ${bundleGzipBytes.toLocaleString('en-US')} bytes gzipped` },
            'Only ',
            strong(bundleGzipSize),
            ' min+gz. Zero dependencies to maintain, ensuring your bundle remains highly performant.',
          ),
        ),
        Feature(
          'code-icon',
          'Multiframework',
          'Meet users anywhere',
          p('Single unified API that plugs directly into Vanilla JS, React, Vue, or Svelte frameworks seamlessly.'),
        ),
        Feature(
          'puzzle-icon',
          'Flexible',
          'Model real formats',
          p('Easily compose custom tokens, character transforms, localized parameters, and dynamic conditions.'),
        ),
        Feature(
          'heart-icon',
          'Natural',
          'Respect the caret',
          p('Cursor positioning, pasting, selection blocks, and manual edits stay completely natural and expected.'),
        ),
      ),
    ),

    section(
      { className: 'playground-section', id: 'overview', 'aria-labelledby': 'playground-heading' },
      div(
        { className: 'feature-header feature-header--sm' },
        span({ className: 'section-kicker' }, 'Interactive Playground'),
        h2({ id: 'playground-heading' }, 'Try it live'),
        p('Preview how masks behave in a real form, then inspect the lightweight binding code on the right.'),
      ),

      PlaygroundCard(
        'Brazilian Masks',
        'pg-br-phone',
        DemoField('Phone', '+55 (99) 99999-9999', 'pg-br-phone', '(11) 98765-4321'),
        DemoField('CPF', '999.999.999-99', 'pg-br-cpf', '123.456.789-09'),
        DemoField('CNPJ', 'AA.AAA.AAA/AAAA-99', 'pg-br-cnpj', '12.ABC.345/01DE-35'),
      ),

      PlaygroundCard(
        'US Formats',
        'pg-us-phone',
        DemoField('US Phone', '+1 (999) 999-9999', 'pg-us-phone', '+1 (415) 555-0132'),
        DemoField('Credit Card', '9999 9999 9999 9999', 'pg-us-card', '1234 5678 9012 3456'),
        DemoField('USD Currency', 'Decimal USD', 'pg-us-usd', '$4,299.99'),
      ),

      PlaygroundCard(
        'Decimal Masks',
        'pg-eur',
        DemoField('EUR Currency', 'Decimal EUR', 'pg-eur', '1.234,56 €'),
        DemoField('Amount', 'Quantity units', 'pg-amount', '12,500 units'),
        DemoField('4-Digit Float', 'Scientific precision', 'pg-precision', '3.1415'),
      ),
    ),

    section(
      { className: 'framework-integrations-section', 'aria-labelledby': 'framework-integrations-heading', 'data-home-framework-teaser': '' },
      div(
        { className: 'feature-header feature-header--sm' },
        span({ className: 'section-kicker' }, 'Framework Support'),
        h2({ id: 'framework-integrations-heading' }, 'Framework Integrations'),
        p('Pick a framework below to see its install command and a full integration example.'),
      ),

      div(
        { className: 'framework-selector', role: 'group', 'aria-label': 'Framework example' },
        FrameworkPill('vanilla', 'Vanilla JS'),
        FrameworkPill('react', 'React', true),
        FrameworkPill('vue', 'Vue'),
        FrameworkPill('angular', 'Angular'),
        FrameworkPill('svelte', 'Svelte'),
        FrameworkPill('solid', 'SolidJS'),

        div(
          { className: 'framework-pill-more-wrap' },
          button(
            {
              className: 'framework-pill framework-pill-more',
              type: 'button',
              id: 'framework-more-trigger',
              'aria-haspopup': 'true',
              'aria-expanded': 'false',
              'aria-controls': 'framework-more-menu',
            },
            span({ className: 'framework-more-label' }, `+ ${MORE_FRAMEWORKS.length} more`),
          ),
          div(
            { className: 'framework-more-menu', id: 'framework-more-menu', role: 'menu', 'aria-label': 'More frameworks', hidden: true },
            ...MORE_FRAMEWORKS.map((framework) =>
              button({ className: 'framework-more-item', type: 'button', role: 'menuitem', 'data-framework': framework.id }, framework.label),
            ),
            a(
              { className: 'framework-more-viewall', href: href('frameworks.html'), role: 'menuitem' },
              'View all frameworks',
              icon('arrow-right-icon'),
            ),
          ),
        ),
      ),

      div({ className: 'framework-code-window' }, CodeBlock('framework-guide', 'PaymentForm.tsx')),
    ),

    section(
      { className: 'cta-banner' },
      div(
        { className: 'cta-banner-inner' },
        div(
          { className: 'cta-banner-copy' },
          h2('Make every keystroke feel considered'),
          p('Upgrade your application form fields today with mother-mask. Optimized, highly accessible, and straightforward to implement.'),
        ),
        div(
          { className: 'cta-banner-actions' },
          InstallBox(),
          a({ className: 'button-link', href: href('quick-start.html') }, icon('arrow-right-icon'), 'Get started'),
        ),
      ),
    ),
  )
}

export function setup(): PageTeardown {
  const demos = createDemos()

  demos.mask('pg-br-phone', '+55 (99) 99999-9999')
  demos.mask('pg-br-cpf', '999.999.999-99')
  demos.mask('pg-br-cnpj', 'AA.AAA.AAA/AAAA-99', { tokens: { A: uppercaseAlphanumeric } })

  demos.mask('pg-us-phone', '+1 (999) 999-9999')
  demos.mask('pg-us-card', '9999 9999 9999 9999')
  demos.decimal('pg-us-usd', { prefix: '$', decimalPlaces: 2 })

  demos.decimal('pg-eur', { prefix: '', suffix: ' €', separator: '.', decimalSeparator: ',', decimalPlaces: 2 })
  demos.decimal('pg-amount', { decimalPlaces: 0, suffix: ' units' })
  demos.decimal('pg-precision', { decimalPlaces: 4, segmented: false })

  initHomeFrameworkTeaser()

  const playground = document.querySelector<HTMLElement>('.playground-section')
  const showExample = (event: FocusEvent) => {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) return
    const name = input.dataset.playgroundSnippet as SnippetName | undefined
    const block = input.closest('.playground-card')?.querySelector<HTMLElement>('[data-snippet]')
    const code = block?.querySelector<HTMLElement>('pre code')
    if (!name || !block || !code || block.dataset.snippet === name) return
    paint(code, snippets[name])
    block.dataset.snippet = name
  }
  playground?.addEventListener('focusin', showExample)

  return () => {
    playground?.removeEventListener('focusin', showExample)
    demos.teardown()
  }
}
