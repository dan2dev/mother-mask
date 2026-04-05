import './style.css'
import { bind } from 'mother-mask'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="page">
  <a href="/" class="back">← back</a>
  <h1>bind() + callback</h1>
  <p class="subtitle">
    The optional third argument fires on every change, receiving the current masked value.
    Use it to sync state, validate, or strip the mask before sending to an API.
    <br><code>bind(input, mask, (masked: string) =&gt; void)</code>
  </p>

  <h2>Masked value vs raw digits</h2>
  <div class="card">
    <div class="field">
      <label for="cpf">CPF</label>
      <input id="cpf" placeholder="000.000.000-00" inputmode="numeric" />
    </div>
    <div class="row">
      <div>
        <p class="hint">masked (display)</p>
        <div class="output" id="cpf-masked">—</div>
      </div>
      <div>
        <p class="hint">raw digits (for API)</p>
        <div class="output" id="cpf-raw">—</div>
      </div>
    </div>
  </div>

  <h2>Live validation with callback</h2>
  <div class="card">
    <div class="field">
      <label for="phone">Phone</label>
      <input id="phone" placeholder="(00) 00000-0000" inputmode="numeric" />
      <p class="hint" id="phone-hint">10 or 11 digits required</p>
    </div>
    <div class="field">
      <label for="cep">CEP</label>
      <input id="cep" placeholder="00000-000" inputmode="numeric" />
      <p class="hint" id="cep-hint">8 digits required</p>
    </div>
  </div>
</div>
`

bind(
  document.querySelector<HTMLInputElement>('#cpf')!,
  '999.999.999-99',
  (masked) => {
    const raw = masked.replace(/\D/g, '')
    document.querySelector<HTMLDivElement>('#cpf-masked')!.innerHTML = `<strong>${masked || '—'}</strong>`
    document.querySelector<HTMLDivElement>('#cpf-raw')!.innerHTML = `<strong>${raw || '—'}</strong>`
  },
)

bind(
  document.querySelector<HTMLInputElement>('#phone')!,
  ['(99) 9999-9999', '(99) 99999-9999'],
  (masked) => {
    const raw = masked.replace(/\D/g, '')
    const hint = document.querySelector<HTMLParagraphElement>('#phone-hint')!
    const input = document.querySelector<HTMLInputElement>('#phone')!
    const valid = raw.length === 10 || raw.length === 11
    const empty = raw.length === 0
    hint.textContent = empty ? '10 or 11 digits required' : valid ? `✓ ${raw.length} digits` : `${raw.length} / 11 digits`
    hint.className = empty ? 'hint' : valid ? 'hint' : 'hint error'
    input.className = empty ? '' : valid ? '' : 'invalid'
  },
)

bind(
  document.querySelector<HTMLInputElement>('#cep')!,
  '99999-999',
  (masked) => {
    const raw = masked.replace(/\D/g, '')
    const hint = document.querySelector<HTMLParagraphElement>('#cep-hint')!
    const input = document.querySelector<HTMLInputElement>('#cep')!
    const valid = raw.length === 8
    const empty = raw.length === 0
    hint.textContent = empty ? '8 digits required' : valid ? '✓ valid' : `${raw.length} / 8 digits`
    hint.className = empty ? 'hint' : valid ? 'hint' : 'hint error'
    input.className = empty ? '' : valid ? '' : 'invalid'
  },
)
