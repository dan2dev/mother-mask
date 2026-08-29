import '../common'
import { bind } from 'mother-mask'
import { $, setHint } from '../common'

// ── Hero preview ─────────────────────────────────────────────────────────────

bind($('hero-phone'), '(999) 999-9999', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('hero-phone-hint', n === 0 ? { text: '10 digits' } : n === 10 ? { text: '10 digits', ok: true } : { text: `${n} / 10`, error: true })
})

// ── Install command copy button ─────────────────────────────────────────────

const copyBtn = $<HTMLButtonElement>('copy-install')
const installCmd = $<HTMLElement>('install-cmd')

copyBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(installCmd.textContent ?? '')
  copyBtn.classList.add('copied')
  copyBtn.innerHTML = '<svg class="icon" role="presentation"><use href="#check-icon"></use></svg>'
  setTimeout(() => {
    copyBtn.classList.remove('copied')
    copyBtn.innerHTML = '<svg class="icon" role="presentation"><use href="#copy-icon"></use></svg>'
  }, 1600)
})
