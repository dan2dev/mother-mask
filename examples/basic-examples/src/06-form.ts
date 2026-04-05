import './style.css'
import { bind } from 'mother-mask'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="page">
  <a href="/" class="back">← back</a>
  <h1>Complete form</h1>
  <p class="subtitle">Real-world registration form — every field uses <code>bind()</code> with inline validation.</p>

  <form id="form" novalidate>
    <div class="card">
      <div class="field">
        <label for="name">Full name</label>
        <input id="name" type="text" placeholder="John Doe" style="font-family:var(--sans)" />
      </div>

      <div class="row">
        <div class="field">
          <label for="cpf">CPF</label>
          <input id="cpf" placeholder="000.000.000-00" inputmode="numeric" />
          <p class="hint" id="cpf-hint">11 digits</p>
        </div>
        <div class="field">
          <label for="birth">Date of birth</label>
          <input id="birth" placeholder="DD/MM/YYYY" inputmode="numeric" />
          <p class="hint" id="birth-hint">DD/MM/YYYY</p>
        </div>
      </div>

      <div class="row">
        <div class="field">
          <label for="phone">Phone</label>
          <input id="phone" placeholder="(00) 00000-0000" inputmode="numeric" />
          <p class="hint" id="phone-hint">10 or 11 digits</p>
        </div>
        <div class="field">
          <label for="cep">CEP</label>
          <input id="cep" placeholder="00000-000" inputmode="numeric" />
          <p class="hint" id="cep-hint">8 digits</p>
        </div>
      </div>

      <div class="field">
        <label for="card">Credit card</label>
        <input id="card" placeholder="0000 0000 0000 0000" inputmode="numeric" />
        <p class="hint" id="card-hint">16 digits (Visa/MC) or 15 (Amex)</p>
      </div>
    </div>

    <button type="submit" class="btn">Submit</button>
  </form>

  <div class="card" id="result" style="display:none;margin-top:20px">
    <p class="hint" style="margin-bottom:8px">Payload sent to API:</p>
    <pre id="result-json" style="margin:0;font-family:var(--mono);font-size:13px;color:var(--accent);white-space:pre-wrap"></pre>
  </div>
</div>
`

type FieldId = 'cpf' | 'birth' | 'phone' | 'cep' | 'card'
const raw: Record<FieldId, string> = { cpf: '', birth: '', phone: '', cep: '', card: '' }

function validate(id: FieldId, digits: number[], label: string) {
  return (masked: string) => {
    raw[id] = id === 'birth' ? masked : masked.replace(/\D/g, '')
    const len = raw[id].replace(/\D/g, '').length
    const valid = digits.includes(len)
    const empty = len === 0
    const hint = document.querySelector<HTMLParagraphElement>(`#${id}-hint`)!
    const input = document.querySelector<HTMLInputElement>(`#${id}`)!
    hint.textContent = empty ? label : valid ? `✓ valid` : `${len} / ${digits[digits.length - 1]} digits`
    hint.className = empty ? 'hint' : valid ? 'hint' : 'hint error'
    input.className = empty ? '' : valid ? '' : 'invalid'
  }
}

bind(document.querySelector<HTMLInputElement>('#cpf')!,   '999.999.999-99',                       validate('cpf',   [11],      '11 digits'))
bind(document.querySelector<HTMLInputElement>('#birth')!,  '99/99/9999',                           validate('birth', [10],      'DD/MM/YYYY'))
bind(document.querySelector<HTMLInputElement>('#phone')!,  ['(99) 9999-9999', '(99) 99999-9999'],  validate('phone', [10, 11],  '10 or 11 digits'))
bind(document.querySelector<HTMLInputElement>('#cep')!,    '99999-999',                            validate('cep',   [8],       '8 digits'))
bind(document.querySelector<HTMLInputElement>('#card')!,   ['9999 999999 99999', '9999 9999 9999 9999'], validate('card', [15, 16], '15 or 16 digits'))

document.querySelector<HTMLFormElement>('#form')!.addEventListener('submit', (e) => {
  e.preventDefault()
  const payload = {
    name:  (document.querySelector<HTMLInputElement>('#name')!).value,
    cpf:   raw.cpf,
    birth: raw.birth,
    phone: raw.phone,
    cep:   raw.cep,
    card:  raw.card,
  }
  const result = document.querySelector<HTMLDivElement>('#result')!
  result.style.display = 'block'
  document.querySelector<HTMLPreElement>('#result-json')!.textContent = JSON.stringify(payload, null, 2)
})
