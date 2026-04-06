import './style.css'
import { bind } from 'mother-mask'
import { validarCNPJ } from './cnpj-validator'

// ── Masks ──────────────────────────────────────────────────────────────────

const cnpjEl  = document.querySelector<HTMLInputElement>('#cnpj')!
const phoneEl = document.querySelector<HTMLInputElement>('#phone')!
const cepEl   = document.querySelector<HTMLInputElement>('#cep')!

bind(cnpjEl, 'AA.AAA.AAA/AAAA-99', (v) => {
  cnpjEl.value = v.toUpperCase()
  const n = v.replace(/[^a-zA-Z0-9]/g, '').length
  setHint('cnpj',
    n === 0  ? { text: '12 alphanumeric + 2 digits' } :
    n < 14   ? { text: `${n} / 14`, error: true } :
    validarCNPJ(v) ? { text: '✓ valid', ok: true } :
                     { text: '✗ invalid CNPJ', error: true })
})

bind(phoneEl, ['(99) 9999-9999', '(99) 99999-9999'], (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('phone',
    n === 0  ? { text: '10 or 11 digits' } :
    n >= 10  ? { text: '✓ valid', ok: true } :
               { text: `${n} / 11`, error: true })
})

bind(cepEl, '99999-999', (v) => {
  const n = v.replace(/\D/g, '').length
  setHint('cep',
    n === 0 ? { text: '8 digits' } :
    n === 8 ? { text: '✓ valid', ok: true } :
              { text: `${n} / 8`, error: true })
})

// ── Submit ─────────────────────────────────────────────────────────────────

document.querySelector<HTMLFormElement>('#demo-form')!.addEventListener('submit', (e) => {
  e.preventDefault()
  const output = document.querySelector<HTMLPreElement>('#output')!
  output.style.display = 'block'
  output.textContent = JSON.stringify({
    name:  document.querySelector<HTMLInputElement>('#name')!.value,
    cnpj:  cnpjEl.value.replace(/[.\-/]/g, ''),
    phone: phoneEl.value.replace(/\D/g, ''),
    cep:   cepEl.value.replace(/\D/g, ''),
  }, null, 2)
})

// ── Helper ─────────────────────────────────────────────────────────────────

function setHint(id: string, state: { text: string; ok?: boolean; error?: boolean }) {
  const el = document.querySelector(`#${id}-hint`)!
  el.textContent = state.text
  el.className = `hint${state.ok ? ' ok' : state.error ? ' error' : ''}`
}
