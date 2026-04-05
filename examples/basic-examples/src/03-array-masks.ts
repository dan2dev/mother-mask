import './style.css'
import { bind, getMaxLength } from 'mother-mask'

const phoneMasks = ['(99) 9999-9999', '(99) 99999-9999']
const cardMasks  = ['9999 999999 99999', '9999 9999 9999 9999']

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="page">
  <a href="/" class="back">← back</a>
  <h1>Array masks</h1>
  <p class="subtitle">
    Pass an ordered array (shortest → longest) to handle inputs of variable length.
    The library picks the mask whose total length covers the current value.
    <br><code>type MaskPattern = string | string[]</code>
  </p>

  <h2>Phone — landline vs mobile</h2>
  <div class="card">
    <div class="field">
      <label for="phone">Phone number</label>
      <input id="phone" placeholder="(00) 00000-0000" inputmode="numeric" />
      <p class="hint">
        <code>['(99) 9999-9999', '(99) 99999-9999']</code>
        &nbsp;— max length: <strong>${getMaxLength(phoneMasks)}</strong>
      </p>
    </div>
    <div class="output" id="phone-mask-label">active mask: —</div>
  </div>

  <h2>Credit card — Visa / Mastercard vs Amex</h2>
  <div class="card">
    <div class="field">
      <label for="card">Card number</label>
      <input id="card" placeholder="0000 0000 0000 0000" inputmode="numeric" />
      <p class="hint">
        <code>['9999 999999 99999', '9999 9999 9999 9999']</code>
        &nbsp;— max length: <strong>${getMaxLength(cardMasks)}</strong>
      </p>
    </div>
    <div class="output" id="card-mask-label">active mask: —</div>
  </div>
</div>
`

bind(
  document.querySelector<HTMLInputElement>('#phone')!,
  phoneMasks,
  (masked) => {
    const raw = masked.replace(/\D/g, '')
    const active = raw.length <= 10 ? phoneMasks[0] : phoneMasks[1]
    const el = document.querySelector<HTMLDivElement>('#phone-mask-label')!
    el.innerHTML = `active mask: <strong>${active}</strong> &nbsp; raw digits: <strong>${raw}</strong>`
  },
)

bind(
  document.querySelector<HTMLInputElement>('#card')!,
  cardMasks,
  (masked) => {
    const raw = masked.replace(/\D/g, '')
    const active = raw.length <= 15 ? cardMasks[0] : cardMasks[1]
    const network = raw.startsWith('3') ? 'Amex' : raw.startsWith('4') ? 'Visa' : raw.startsWith('5') ? 'Mastercard' : '—'
    const el = document.querySelector<HTMLDivElement>('#card-mask-label')!
    el.innerHTML = `active mask: <strong>${active}</strong> &nbsp; network: <strong>${network}</strong>`
  },
)
