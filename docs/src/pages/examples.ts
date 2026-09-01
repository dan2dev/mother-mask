import { CodeBlock } from '../components/CodeBlock.ts'
import { ExampleCard } from '../components/ExampleCard.ts'
import { alphanumerics, countHint, createDemos, digits, setHint, uppercaseAlphanumeric, uppercaseLetter, $ } from '../demos/live.ts'
import type { PageTeardown } from '../router/page.ts'

const hint = (id: string, text: string) => span({ className: 'hint', id }, text)

export function view() {
  return div(
    { className: 'page' },
    section(
      { id: 'examples' },
      h1({ className: 'page-title' }, 'Examples'),
      p(
        { className: 'section-sub' },
        'Every field below is live. “Complete” means the expected number of characters is present, not that a date, checksum, card, or identifier is valid. Validate those separately in your application.',
      ),
      p('Examples that normalize case share these local token definitions:'),
      CodeBlock('examples-tokens'),

      div(
        { className: 'examples-grid' },

        ExampleCard(
          { title: 'CPF', inputId: 'ex-cpf', placeholder: '000.000.000-00', inputmode: 'numeric' },
          hint('ex-cpf-hint', '11 digits'),
        ),

        ExampleCard(
          { title: 'CNPJ (alphanumeric)', inputId: 'ex-cnpj', placeholder: 'AA.AAA.AAA/AAAA-00' },
          hint('ex-cnpj-hint', '12 alphanumeric + 2 digits'),
        ),

        ExampleCard({ title: 'CEP', inputId: 'ex-cep', placeholder: '00000-000', inputmode: 'numeric' }, hint('ex-cep-hint', '8 digits')),

        ExampleCard(
          { title: 'Phone — array mask', inputId: 'ex-phone', placeholder: '(00) 00000-0000', inputmode: 'tel' },
          hint('ex-phone-hint', '10 or 11 digits — mask switches automatically'),
        ),

        ExampleCard(
          { title: 'Date — segmented (default)', inputId: 'ex-date-seg', placeholder: 'DD/MM/YYYY', inputmode: 'numeric', value: '25/12/2025' },
          span({ className: 'hint' }, 'select "12" and retype — day and year stay put'),
        ),

        ExampleCard(
          {
            title: ['Date — flat (', code('segmented: false'), ')'],
            inputId: 'ex-date-flat',
            placeholder: 'DD/MM/YYYY',
            inputmode: 'numeric',
            value: '25/12/2025',
          },
          span({ className: 'hint' }, 'same edit here pulls the year forward'),
        ),

        ExampleCard(
          { title: 'Date — eager (default)', inputId: 'ex-date-eager', placeholder: 'DD/MM/YYYY', inputmode: 'numeric' },
          span({ className: 'hint' }, 'type "25" — the "/" appears before you type it'),
        ),

        ExampleCard(
          {
            title: ['Date — not eager (', code('eager: false'), ')'],
            inputId: 'ex-date-not-eager',
            placeholder: 'DD/MM/YYYY',
            inputmode: 'numeric',
          },
          span({ className: 'hint' }, 'type "25" — the "/" waits for the next digit'),
        ),

        ExampleCard(
          { title: ['Date — one or two digits (', code('{min,max}'), ')'], inputId: 'ex-date-flex', placeholder: 'D/M/YYYY', inputmode: 'numeric' },
          span({ className: 'hint' }, 'type "3/4/1986" — the "/" you type commits the short segment'),
        ),

        ExampleCard(
          { title: 'Time', inputId: 'ex-time', placeholder: 'HH:MM', inputmode: 'numeric', value: '14:30' },
          span({ className: 'hint' }, 'simple HH:MM bind mask'),
        ),

        ExampleCard({ title: 'License plate', inputId: 'ex-plate', placeholder: 'ABC-1234' }, span({ className: 'hint' }, 'letters then digits')),

        ExampleCard({ title: 'Mercosul plate', inputId: 'ex-mercosul', placeholder: 'ABC-1D23' }, span({ className: 'hint' }, 'letter/digit mixed pattern')),

        ExampleCard(
          { title: 'Credit card — array mask', inputId: 'ex-card', placeholder: '0000 0000 0000 0000', inputmode: 'numeric' },
          hint('ex-card-hint', '15 or 16 digits; length selects the layout'),
        ),

        ExampleCard({ title: 'Currency (USD-style)', inputId: 'ex-usd', placeholder: '$0.00', inputmode: 'decimal' }),

        ExampleCard(
          { title: 'Currency (EUR-style)', inputId: 'ex-eur', placeholder: '0,00 €', inputmode: 'decimal' },
          span({ className: 'hint' }, '"." also opens the fraction'),
        ),

        ExampleCard({ title: 'Whole numbers', inputId: 'ex-qty', placeholder: '0 units', inputmode: 'numeric' }),

        ExampleCard(
          { title: 'Negative values', inputId: 'ex-balance', placeholder: '$0.00', inputmode: 'decimal' },
          span({ className: 'hint' }, 'type "-" anywhere to flip the sign'),
        ),

        ExampleCard(
          { title: 'Masked value vs. raw value', inputId: 'ex-raw', placeholder: '000.000.000-00', inputmode: 'numeric' },
          div(
            { className: 'raw-outputs' },
            div(span({ className: 'hint' }, 'masked'), output({ id: 'ex-raw-masked' }, '—')),
            div(span({ className: 'hint' }, 'raw digits'), output({ id: 'ex-raw-digits' }, '—')),
          ),
        ),
      ),
    ),
  )
}

export function setup(): PageTeardown {
  const demos = createDemos()

  demos.mask('ex-cpf', '999.999.999-99', (v) => countHint('ex-cpf-hint', digits(v), 11, '11 digits'))

  demos.mask('ex-cnpj', 'AA.AAA.AAA/AAAA-99', {
    tokens: { A: uppercaseAlphanumeric },
    onChange: (v) => countHint('ex-cnpj-hint', alphanumerics(v), 14, '12 alphanumeric + 2 digits'),
  })

  demos.mask('ex-cep', '99999-999', (v) => countHint('ex-cep-hint', digits(v), 8, '8 digits'))

  demos.mask('ex-phone', ['(99) 9999-9999', '(99) 99999-9999'], (v) => {
    const n = digits(v)
    setHint(
      'ex-phone-hint',
      n === 0
        ? { text: '10 or 11 digits — mask switches automatically' }
        : n >= 10
          ? { text: '✓ complete', ok: true }
          : { text: `${n} / 11`, error: true },
    )
  })

  // Date: segmented vs. flat, eager vs. not.
  demos.mask('ex-date-seg', '99/99/9999')
  demos.mask('ex-date-flat', '99/99/9999', { segmented: false })
  demos.mask('ex-date-eager', '99/99/9999') // eager is on by default
  demos.mask('ex-date-not-eager', '99/99/9999', { eager: false })

  // Bounded quantifiers: day and month take one *or* two digits. Typing the "/"
  // after a single digit commits that segment; reaching two reveals it eagerly.
  demos.mask('ex-date-flex', '9{1,2}/9{1,2}/9{4}')

  demos.mask('ex-time', '99:99')

  demos.mask('ex-plate', 'ZZZ-9999', { segmented: false, tokens: { Z: uppercaseLetter } })
  demos.mask('ex-mercosul', 'ZZZ-9Z99', { tokens: { Z: uppercaseLetter } })

  demos.mask('ex-card', ['9999 999999 99999', '9999 9999 9999 9999'], (v) => {
    const n = digits(v)
    setHint(
      'ex-card-hint',
      n === 0
        ? { text: '15 or 16 digits; length selects the layout' }
        : n === 15 || n === 16
          ? { text: '✓ complete', ok: true }
          : { text: `${n} digits`, error: true },
    )
  })

  demos.decimal('ex-usd', { decimalPlaces: 2, prefix: '$' })
  demos.decimal('ex-eur', { decimalPlaces: 2, separator: '.', decimalSeparator: ',', suffix: ' €' })
  demos.decimal('ex-qty', { decimalPlaces: 0, suffix: ' units' })
  demos.decimal('ex-balance', { decimalPlaces: 2, prefix: '$', allowNegative: true })

  demos.mask('ex-raw', '999.999.999-99', (v) => {
    $('ex-raw-masked').textContent = v || '—'
    $('ex-raw-digits').textContent = v.replace(/\D/g, '') || '—'
  })

  return demos.teardown
}
