import { bind } from 'mother-mask'
import { $, setHint, uppercaseLetter } from '../hint'

// ── US — phone ───────────────────────────────────────────────────────────────

bind($('ex-us-phone'), '(999) 999-9999', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('ex-us-phone-hint', n === 0 ? { text: '10 digits' } : n === 10 ? { text: '✓ complete', ok: true } : { text: `${n} / 10`, error: true })
})

// ── US — SSN ─────────────────────────────────────────────────────────────────

bind($('ex-us-ssn'), '999-99-9999', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('ex-us-ssn-hint', n === 0 ? { text: '9 digits' } : n === 9 ? { text: '✓ complete', ok: true } : { text: `${n} / 9`, error: true })
})

// ── US — ZIP+4 ───────────────────────────────────────────────────────────────

bind($('ex-us-zip'), '99999-9999', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint(
    'ex-us-zip-hint',
    n === 0 ? { text: '5, or 9 with the +4 suffix' } : n === 5 || n === 9 ? { text: '✓ complete', ok: true } : { text: `${n} digits`, error: true },
  )
})

// ── Dates — bounded quantifiers ──────────────────────────────────────────────

// `9{1,2}` accepts one *or* two digits, so nothing has to be padded. The
// separator the user types is what closes a one-digit field; reaching two
// digits closes it eagerly instead. No calendar validation happens here — as
// far as the mask is concerned, "13" is a perfectly good month.

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

bind($('ex-us-date'), '9{1,2}/9{1,2}/9{4}', (v) => {
  dateHint('ex-us-date-hint', v, '/', false, 'month and day take one or two digits')
})

bind($('ex-iso-date'), '9{4}-9{1,2}-9{1,2}', (v) => {
  dateHint('ex-iso-date-hint', v, '-', true, 'type "2026-8-29" without padding')
})

// ── Canada — postal code ─────────────────────────────────────────────────────

bind($('ex-ca-postal'), 'Z9Z 9Z9', {
  tokens: { Z: uppercaseLetter },
  onChange: (v) => {
    const n = v.replace(/[^a-zA-Z0-9]/g, '').length
    setHint('ex-ca-postal-hint', n === 0 ? { text: '6 alphanumeric characters' } : n === 6 ? { text: '✓ complete', ok: true } : { text: `${n} / 6`, error: true })
  },
})

// ── Canada — SIN ─────────────────────────────────────────────────────────────

bind($('ex-ca-sin'), '999 999 999', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('ex-ca-sin-hint', n === 0 ? { text: '9 digits' } : n === 9 ? { text: '✓ complete', ok: true } : { text: `${n} / 9`, error: true })
})

// ── Germany — IBAN ───────────────────────────────────────────────────────────

bind($('ex-eu-iban'), 'DE99 9999 9999 9999 9999 99', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('ex-eu-iban-hint', n === 0 ? { text: 'DE + 20 digits' } : n === 20 ? { text: '✓ complete', ok: true } : { text: `${n} / 20 digits`, error: true })
})

// ── Germany — VAT ID ─────────────────────────────────────────────────────────

bind($('ex-eu-vat'), 'DE999999999', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('ex-eu-vat-hint', n === 0 ? { text: '9 digits after the DE prefix' } : n === 9 ? { text: '✓ complete', ok: true } : { text: `${n} / 9`, error: true })
})

// ── Poland — postal code ─────────────────────────────────────────────────────

bind($('ex-pl-postal'), '99-999', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('ex-pl-postal-hint', n === 0 ? { text: '5 digits' } : n === 5 ? { text: '✓ complete', ok: true } : { text: `${n} / 5`, error: true })
})
