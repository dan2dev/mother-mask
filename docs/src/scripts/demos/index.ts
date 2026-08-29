import { bind, bindDecimal } from 'mother-mask'
import { $, setHint } from '../hint'

// ── Hero preview ─────────────────────────────────────────────────────────────

bind($('hero-live-phone'), '(99) 99999-9999', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('hero-live-phone-hint', n === 0 ? { text: '11 digits' } : n === 11 ? { text: '✓ complete', ok: true } : { text: `${n} / 11`, error: true })
})

bind($('hero-phone'), '(99) 99999-9999', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('hero-phone-hint', n === 0 ? { text: '11 digits' } : n === 11 ? { text: '✓ complete', ok: true } : { text: `${n} / 11`, error: true })
})

bind($('hero-card'), '9999 9999 9999 9999')
bind($('hero-date'), '9{1,2}/9{1,2}/9{4}')
bindDecimal($('hero-currency'), {
  prefix: 'R$ ',
  separator: '.',
  decimalSeparator: ',',
  decimalPlaces: 2,
})
