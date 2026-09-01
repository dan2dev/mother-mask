import { ExampleCard } from '../components/ExampleCard.ts'
import { alphanumerics, countHint, createDemos, digits, setHint, uppercaseLetter } from '../demos/live.ts'
import type { PageTeardown } from '../router/page.ts'

const hint = (id: string, text: string) => span({ className: 'hint', id }, text)

export function view() {
  return div(
    { className: 'page' },
    section(
      { id: 'regional' },
      h1({ className: 'page-title' }, 'Regional formats'),
      p(
        { className: 'section-sub' },
        'Common regional formats built with ',
        code('bind()'),
        '. These masks format input; “complete” means the expected character count is present, not that a checksum or identifier is valid — the date masks below never check that a month or day exists.',
      ),

      div(
        { className: 'examples-grid' },

        ExampleCard(
          { title: 'US — Phone', inputId: 'ex-us-phone', placeholder: '(000) 000-0000', inputmode: 'tel' },
          hint('ex-us-phone-hint', '10 digits'),
        ),
        ExampleCard({ title: 'US — SSN', inputId: 'ex-us-ssn', placeholder: '000-00-0000', inputmode: 'numeric' }, hint('ex-us-ssn-hint', '9 digits')),
        ExampleCard(
          { title: 'US — ZIP+4', inputId: 'ex-us-zip', placeholder: '00000-0000', inputmode: 'numeric' },
          hint('ex-us-zip-hint', '5, or 9 with the +4 suffix'),
        ),
        ExampleCard(
          { title: 'US — date (M/D/YYYY)', inputId: 'ex-us-date', placeholder: 'M/D/YYYY', inputmode: 'numeric' },
          hint('ex-us-date-hint', 'month and day take one or two digits'),
        ),
        ExampleCard(
          { title: 'ISO 8601 — date, unpadded', inputId: 'ex-iso-date', placeholder: 'YYYY-M-D', inputmode: 'numeric' },
          hint('ex-iso-date-hint', 'type "2026-8-29" without padding'),
        ),
        ExampleCard(
          { title: 'Canada — postal code', inputId: 'ex-ca-postal', placeholder: 'A0A 0A0' },
          hint('ex-ca-postal-hint', '6 alphanumeric characters'),
        ),
        ExampleCard({ title: 'Canada — SIN', inputId: 'ex-ca-sin', placeholder: '000 000 000', inputmode: 'numeric' }, hint('ex-ca-sin-hint', '9 digits')),
        ExampleCard(
          { title: 'Germany — IBAN', inputId: 'ex-eu-iban', placeholder: 'DE00 0000 0000 0000 0000 00' },
          hint('ex-eu-iban-hint', 'DE + 20 digits'),
        ),
        ExampleCard(
          { title: 'Germany — VAT ID', inputId: 'ex-eu-vat', placeholder: 'DE000000000', inputmode: 'numeric' },
          hint('ex-eu-vat-hint', '9 digits after the DE prefix'),
        ),
        ExampleCard({ title: 'Poland — postal code', inputId: 'ex-pl-postal', placeholder: '00-000', inputmode: 'numeric' }, hint('ex-pl-postal-hint', '5 digits')),
      ),
    ),
  )
}

/**
 * `9{1,2}` accepts one *or* two digits, so nothing has to be padded. The
 * separator the reader types is what closes a one-digit field; reaching two
 * digits closes it eagerly instead. No calendar validation happens here — as
 * far as the mask is concerned, "13" is a perfectly good month.
 */
function dateHint(id: string, value: string, separator: string, yearFirst: boolean, empty: string): void {
  const parts = value.split(separator)
  const [year, other] = yearFirst ? [parts[0], parts[2]] : [parts[2], parts[0]]
  const done = parts.length === 3 && year?.length === 4 && !!parts[1] && !!other

  setHint(
    id,
    value === ''
      ? { text: empty }
      : done
        ? { text: '✓ complete', ok: true }
        : { text: `type "${separator}" to end a one-digit field`, error: true },
  )
}

export function setup(): PageTeardown {
  const demos = createDemos()

  demos.mask('ex-us-phone', '(999) 999-9999', (v) => countHint('ex-us-phone-hint', digits(v), 10, '10 digits'))
  demos.mask('ex-us-ssn', '999-99-9999', (v) => countHint('ex-us-ssn-hint', digits(v), 9, '9 digits'))

  demos.mask('ex-us-zip', '99999-9999', (v) => {
    const n = digits(v)
    setHint(
      'ex-us-zip-hint',
      n === 0 ? { text: '5, or 9 with the +4 suffix' } : n === 5 || n === 9 ? { text: '✓ complete', ok: true } : { text: `${n} digits`, error: true },
    )
  })

  demos.mask('ex-us-date', '9{1,2}/9{1,2}/9{4}', (v) => dateHint('ex-us-date-hint', v, '/', false, 'month and day take one or two digits'))
  demos.mask('ex-iso-date', '9{4}-9{1,2}-9{1,2}', (v) => dateHint('ex-iso-date-hint', v, '-', true, 'type "2026-8-29" without padding'))

  demos.mask('ex-ca-postal', 'Z9Z 9Z9', {
    tokens: { Z: uppercaseLetter },
    onChange: (v) => countHint('ex-ca-postal-hint', alphanumerics(v), 6, '6 alphanumeric characters'),
  })

  demos.mask('ex-ca-sin', '999 999 999', (v) => countHint('ex-ca-sin-hint', digits(v), 9, '9 digits'))

  demos.mask('ex-eu-iban', 'DE99 9999 9999 9999 9999 99', (v) => {
    const n = digits(v)
    setHint('ex-eu-iban-hint', n === 0 ? { text: 'DE + 20 digits' } : n === 20 ? { text: '✓ complete', ok: true } : { text: `${n} / 20 digits`, error: true })
  })

  demos.mask('ex-eu-vat', 'DE999999999', (v) => countHint('ex-eu-vat-hint', digits(v), 9, '9 digits after the DE prefix'))
  demos.mask('ex-pl-postal', '99-999', (v) => countHint('ex-pl-postal-hint', digits(v), 5, '5 digits'))

  return demos.teardown
}
