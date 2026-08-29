import '../common'
import { bind } from 'mother-mask'
import { $, setHint, uppercaseLetter } from '../common'

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

// ── Europe (DE) — IBAN ────────────────────────────────────────────────────────

bind($('ex-eu-iban'), 'ZZ99 9999 9999 9999 9999 99', {
  tokens: { Z: uppercaseLetter },
  onChange: (v) => {
    const n = v.replace(/[^a-zA-Z0-9]/g, '').length
    setHint('ex-eu-iban-hint', n === 0 ? { text: '2 letters + 20 digits' } : n === 22 ? { text: '✓ complete', ok: true } : { text: `${n} / 22`, error: true })
  },
})

// ── Europe (DE) — VAT ID ─────────────────────────────────────────────────────

bind($('ex-eu-vat'), 'DE999999999', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('ex-eu-vat-hint', n === 0 ? { text: '9 digits after the DE prefix' } : n === 9 ? { text: '✓ complete', ok: true } : { text: `${n} / 9`, error: true })
})

// ── Europe (PL) — postal code ────────────────────────────────────────────────

bind($('ex-pl-postal'), '99-999', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('ex-pl-postal-hint', n === 0 ? { text: '5 digits' } : n === 5 ? { text: '✓ complete', ok: true } : { text: `${n} / 5`, error: true })
})
