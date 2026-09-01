import { CodeBlock } from '../components/CodeBlock.ts'
import { ExampleCard } from '../components/ExampleCard.ts'
import { SectionHeading } from '../components/SectionHeading.ts'
import { $, createDemos } from '../demos/live.ts'
import type { PageTeardown } from '../router/page.ts'

const hint = (text: string) => span({ className: 'hint' }, text)

export function view() {
  return div(
    { className: 'page' },
    section(
      { id: 'decimals' },
      h1({ className: 'page-title' }, 'Decimal formatting'),
      p(
        { className: 'section-sub' },
        'The integer part grows freely by default. The fraction is optional and unlimited until ',
        code('decimalPlaces'),
        ' is set. Use text inputs with ',
        code('inputmode="decimal"'),
        '.',
      ),

      div(
        { className: 'examples-grid' },

        ExampleCard(
          {
            title: 'Optional fraction (default)',
            inputId: 'ex-decimal-free',
            ariaLabel: 'Optional unlimited decimal fraction',
            inputmode: 'decimal',
            placeholder: '1,234.56789',
          },
          hint('Type 1234, then add .56789; no fixed precision is imposed.'),
        ),

        ExampleCard(
          {
            title: 'US dollars',
            inputId: 'ex-decimal-usd',
            ariaLabel: 'US dollar amount',
            inputmode: 'decimal',
            value: '$1,234.50',
            placeholder: '$0.00',
          },
          hint('Fixed cents, comma grouping, and an inert prefix.'),
        ),

        ExampleCard(
          {
            title: 'Brazilian real',
            inputId: 'ex-decimal-brl',
            ariaLabel: 'Brazilian real amount',
            inputmode: 'decimal',
            value: 'R$ 1.234,50',
            placeholder: 'R$ 0,00',
          },
          hint('Period grouping and a comma decimal separator.'),
        ),

        ExampleCard(
          {
            title: 'Euros',
            inputId: 'ex-decimal-eur',
            ariaLabel: 'Euro amount',
            inputmode: 'decimal',
            value: '1.234,50 €',
            placeholder: '0,00 €',
          },
          hint('Type a comma to open the fraction; the suffix stays inert.'),
        ),

        ExampleCard(
          {
            title: 'Whole quantities',
            inputId: 'ex-decimal-units',
            ariaLabel: 'Whole number quantity',
            inputmode: 'numeric',
            value: '1,250 units',
            placeholder: '0 units',
          },
          hint('No decimal segment; grouping grows with the integer.'),
        ),

        ExampleCard(
          {
            title: 'Signed balances',
            inputId: 'ex-decimal-negative',
            ariaLabel: 'Signed account balance',
            inputmode: 'decimal',
            value: '-$1,234.50',
            placeholder: '$0.00',
          },
          hint('Type “-” anywhere to go negative, “+” anywhere to go positive.'),
        ),

        ExampleCard(
          {
            title: 'No thousands grouping',
            inputId: 'ex-decimal-plain',
            ariaLabel: 'Ungrouped decimal value',
            inputmode: 'decimal',
            value: '1234567.89',
            placeholder: '0.00',
          },
          hint('Useful when the display should stay close to a storage value.'),
        ),

        ExampleCard(
          {
            title: 'Fixed integer and fraction widths',
            inputId: 'ex-decimal-width',
            ariaLabel: 'Fixed width decimal',
            inputmode: 'decimal',
            placeholder: '07.30',
          },
          hint('Paste 7.3 to see 07.30; each part is capped at two digits.'),
        ),

        ExampleCard(
          {
            title: 'Masked value and numeric callback',
            inputId: 'ex-decimal-callback',
            ariaLabel: 'Weight with masked and numeric outputs',
            inputmode: 'decimal',
            value: '2.5 kg',
            placeholder: '0 kg',
            wide: true,
          },
          div(
            { className: 'raw-outputs' },
            div(span({ className: 'hint' }, 'masked string'), output({ id: 'ex-decimal-masked' }, '2.5 kg')),
            div(span({ className: 'hint' }, 'numeric value'), output({ id: 'ex-decimal-numeric' }, '2.5')),
          ),
        ),
      ),

      p(
        'Set ',
        code('decimalPlaces: 2'),
        ' for fixed, zero-padded currency decimals, or ',
        code('0'),
        ' for integers only. ',
        code('numberPlaces'),
        ' pads and caps the integer part. Here ',
        code('segmented'),
        ' controls thousands grouping; it does not mean independent pattern fields.',
      ),
      p(
        'Prefixes and suffixes are fixed display text, excluded from numeric parsing even when they contain digits or a decimal separator. Typing inside a prefix inserts at the start of the number; typing inside a suffix inserts at the end. Use the same locale and affix options when formatting and parsing.',
      ),

      SectionHeading('Formatting without an input'),
      p('Use the pure helpers for initial values, server-rendered output, and programmatic updates. Pass the same options to formatting and parsing.'),
      CodeBlock('decimals-helpers'),
    ),
  )
}

export function setup(): PageTeardown {
  const demos = createDemos()

  demos.decimal('ex-decimal-free')
  demos.decimal('ex-decimal-usd', { decimalPlaces: 2, prefix: '$' })
  demos.decimal('ex-decimal-brl', { decimalPlaces: 2, separator: '.', decimalSeparator: ',', prefix: 'R$ ' })
  demos.decimal('ex-decimal-eur', { decimalPlaces: 2, separator: '.', decimalSeparator: ',', suffix: ' €' })
  demos.decimal('ex-decimal-units', { decimalPlaces: 0, suffix: ' units' })
  demos.decimal('ex-decimal-negative', { decimalPlaces: 2, prefix: '$', allowNegative: true })
  demos.decimal('ex-decimal-plain', { decimalPlaces: 2, segmented: false })
  demos.decimal('ex-decimal-width', { numberPlaces: 2, decimalPlaces: 2 })
  demos.decimal('ex-decimal-callback', {
    suffix: ' kg',
    onChange: (masked, numeric) => {
      $('ex-decimal-masked').textContent = masked || '—'
      $('ex-decimal-numeric').textContent = String(numeric)
    },
  })

  return demos.teardown
}
