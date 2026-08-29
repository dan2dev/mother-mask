import { bind, bindDecimal } from 'mother-mask'
import { $, setHint, uppercaseLetter, uppercaseAlphanumeric } from '../hint'

// ── CPF ──────────────────────────────────────────────────────────────────────

bind($('ex-cpf'), '999.999.999-99', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('ex-cpf-hint', n === 0 ? { text: '11 digits' } : n === 11 ? { text: '✓ complete', ok: true } : { text: `${n} / 11`, error: true })
})

// ── CNPJ (alphanumeric) ──────────────────────────────────────────────────────

bind($('ex-cnpj'), 'AA.AAA.AAA/AAAA-99', {
  tokens: { A: uppercaseAlphanumeric },
  onChange: (v) => {
    const n = v.replace(/[^a-zA-Z0-9]/g, '').length
    setHint('ex-cnpj-hint', n === 0 ? { text: '12 alphanumeric + 2 digits' } : n === 14 ? { text: '✓ complete', ok: true } : { text: `${n} / 14`, error: true })
  },
})

// ── CEP ──────────────────────────────────────────────────────────────────────

bind($('ex-cep'), '99999-999', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('ex-cep-hint', n === 0 ? { text: '8 digits' } : n === 8 ? { text: '✓ complete', ok: true } : { text: `${n} / 8`, error: true })
})

// ── Phone — array mask ───────────────────────────────────────────────────────

bind($('ex-phone'), ['(99) 9999-9999', '(99) 99999-9999'], (v) => {
  const n = v.replace(/\D/g, '').length
  setHint(
    'ex-phone-hint',
    n === 0 ? { text: '10 or 11 digits — mask switches automatically' } : n >= 10 ? { text: '✓ complete', ok: true } : { text: `${n} / 11`, error: true },
  )
})

// ── Date: segmented vs. flat, eager vs. not ─────────────────────────────────

bind($('ex-date-seg'), '99/99/9999')
bind($('ex-date-flat'), '99/99/9999', { segmented: false })
bind($('ex-date-eager'), '99/99/9999') // eager is on by default
bind($('ex-date-not-eager'), '99/99/9999', { eager: false })

// Bounded quantifiers: day and month take one *or* two digits. Typing the "/"
// after a single digit commits that segment; reaching two reveals it eagerly.
bind($('ex-date-flex'), '9{1,2}/9{1,2}/9{4}')

// ── Time ─────────────────────────────────────────────────────────────────────

bind($('ex-time'), '99:99')

// ── Plates ───────────────────────────────────────────────────────────────────

bind($('ex-plate'), 'ZZZ-9999', { segmented: false, tokens: { Z: uppercaseLetter } })
bind($('ex-mercosul'), 'ZZZ-9Z99', { tokens: { Z: uppercaseLetter } })

// ── Credit card — array mask ─────────────────────────────────────────────────

bind($('ex-card'), ['9999 999999 99999', '9999 9999 9999 9999'], (v) => {
  const n = v.replace(/\D/g, '').length
  setHint(
    'ex-card-hint',
    n === 0 ? { text: '15 or 16 digits; length selects the layout' } : n === 15 || n === 16 ? { text: '✓ complete', ok: true } : { text: `${n} digits`, error: true },
  )
})

// ── Decimal / currency ───────────────────────────────────────────────────────

bindDecimal($('ex-usd'), { decimalPlaces: 2, prefix: '$' })
bindDecimal($('ex-eur'), { decimalPlaces: 2, separator: '.', decimalSeparator: ',', suffix: ' €' })
bindDecimal($('ex-qty'), { decimalPlaces: 0, suffix: ' units' })
bindDecimal($('ex-balance'), { decimalPlaces: 2, prefix: '$', allowNegative: true })

// ── Masked vs. raw ───────────────────────────────────────────────────────────

bind($('ex-raw'), '999.999.999-99', (v) => {
  $('ex-raw-masked').textContent = v || '—'
  $('ex-raw-digits').textContent = v.replace(/\D/g, '') || '—'
})
