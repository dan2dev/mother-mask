import { bind } from 'mother-mask'
import { $, setHint } from '../hint'

// ── Hero preview ─────────────────────────────────────────────────────────────

bind($('hero-phone'), '(999) 999-9999', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('hero-phone-hint', n === 0 ? { text: '10 digits' } : n === 10 ? { text: '10 digits', ok: true } : { text: `${n} / 10`, error: true })
})
