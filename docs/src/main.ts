import './style.css'
import { bind, bindDecimal } from 'mother-mask'

// ── Theme toggle ─────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark'

const themeToggle = document.querySelector<HTMLButtonElement>('#theme-toggle')!
const themeIconUse = themeToggle.querySelector('use')!
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  // Icon shows the mode a click switches *to*.
  themeIconUse.setAttribute('href', theme === 'dark' ? '#sun-icon' : '#moon-icon')
  themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')
}

let currentTheme: Theme = (localStorage.getItem('theme') as Theme | null) ?? (systemTheme.matches ? 'dark' : 'light')
applyTheme(currentTheme)

themeToggle.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark'
  localStorage.setItem('theme', currentTheme)
  applyTheme(currentTheme)
})

// Follow OS changes live, but only until the user picks a theme explicitly.
systemTheme.addEventListener('change', (e) => {
  if (localStorage.getItem('theme')) return
  currentTheme = e.matches ? 'dark' : 'light'
  applyTheme(currentTheme)
})

// ── Install command copy button ─────────────────────────────────────────────

const copyBtn = document.querySelector<HTMLButtonElement>('#copy-install')!
const installCmd = document.querySelector<HTMLElement>('#install-cmd')!

copyBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(installCmd.textContent ?? '')
  copyBtn.classList.add('copied')
  copyBtn.innerHTML = '<svg class="icon" role="presentation"><use href="#check-icon"></use></svg>'
  setTimeout(() => {
    copyBtn.classList.remove('copied')
    copyBtn.innerHTML = '<svg class="icon" role="presentation"><use href="#copy-icon"></use></svg>'
  }, 1600)
})

// ── Hint helper ──────────────────────────────────────────────────────────────

function setHint(id: string, state: { text: string; ok?: boolean; error?: boolean }) {
  const el = document.querySelector(`#${id}`)
  if (!el) return
  el.textContent = state.text
  el.className = `hint${state.ok ? ' ok' : state.error ? ' error' : ''}`
}

const $ = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!

// ── CPF ──────────────────────────────────────────────────────────────────────

bind($('ex-cpf'), '999.999.999-99', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('ex-cpf-hint', n === 0 ? { text: '11 digits' } : n === 11 ? { text: '✓ valid', ok: true } : { text: `${n} / 11`, error: true })
})

// ── CNPJ (alphanumeric) ──────────────────────────────────────────────────────

const cnpjEl = $<HTMLInputElement>('ex-cnpj')
bind(cnpjEl, 'AA.AAA.AAA/AAAA-99', (v) => {
  cnpjEl.value = v.toUpperCase()
  const n = v.replace(/[^a-zA-Z0-9]/g, '').length
  setHint('ex-cnpj-hint', n === 0 ? { text: '12 alphanumeric + 2 digits' } : n === 14 ? { text: '✓ valid', ok: true } : { text: `${n} / 14`, error: true })
})

// ── CEP ──────────────────────────────────────────────────────────────────────

bind($('ex-cep'), '99999-999', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('ex-cep-hint', n === 0 ? { text: '8 digits' } : n === 8 ? { text: '✓ valid', ok: true } : { text: `${n} / 8`, error: true })
})

// ── Phone — array mask ───────────────────────────────────────────────────────

bind($('ex-phone'), ['(99) 9999-9999', '(99) 99999-9999'], (v) => {
  const n = v.replace(/\D/g, '').length
  setHint(
    'ex-phone-hint',
    n === 0 ? { text: '10 or 11 digits — mask switches automatically' } : n >= 10 ? { text: '✓ valid', ok: true } : { text: `${n} / 11`, error: true },
  )
})

// ── Date: segmented vs. flat ─────────────────────────────────────────────────

bind($('ex-date-seg'), '99/99/9999')
bind($('ex-date-flat'), '99/99/9999', { segmented: false })

// ── Time ─────────────────────────────────────────────────────────────────────

bind($('ex-time'), '99:99')

// ── Plates ───────────────────────────────────────────────────────────────────

const plateEl = $<HTMLInputElement>('ex-plate')
bind(plateEl, 'ZZZ-9999', { segmented: false })
plateEl.addEventListener('input', () => (plateEl.value = plateEl.value.toUpperCase()))

const mercosulEl = $<HTMLInputElement>('ex-mercosul')
bind(mercosulEl, 'ZZZ-9Z99')
mercosulEl.addEventListener('input', () => (mercosulEl.value = mercosulEl.value.toUpperCase()))

// ── Credit card — array mask ─────────────────────────────────────────────────

bind($('ex-card'), ['9999 999999 99999', '9999 9999 9999 9999'], (v) => {
  const n = v.replace(/\D/g, '').length
  setHint(
    'ex-card-hint',
    n === 0 ? { text: 'Amex (15) vs Visa/Mastercard (16)' } : n === 15 || n === 16 ? { text: '✓ valid', ok: true } : { text: `${n} digits`, error: true },
  )
})

// ── Decimal / currency ───────────────────────────────────────────────────────

bindDecimal($('ex-usd'), { prefix: '$' })
bindDecimal($('ex-eur'), { separator: '.', decimalSeparator: ',', suffix: ' €' })
bindDecimal($('ex-qty'), { decimalPlaces: 0, suffix: ' units' })
bindDecimal($('ex-balance'), { prefix: '$', allowNegative: true })

// ── Masked vs. raw ───────────────────────────────────────────────────────────

bind($('ex-raw'), '999.999.999-99', (v) => {
  $('ex-raw-masked').textContent = v || '—'
  $('ex-raw-digits').textContent = v.replace(/\D/g, '') || '—'
})

// ── Smooth-scroll for in-page nav ───────────────────────────────────────────

document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href')!.slice(1)
    const target = id ? document.getElementById(id) : null
    if (!target) return
    e.preventDefault()
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.pushState(null, '', `#${id}`)
  })
})
