import './style.css'
import { buildMask, Mask } from 'mother-mask'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="page">
  <a href="/" class="back">← back</a>
  <h1>buildMask() / Mask</h1>
  <p class="subtitle">
    Low-level building blocks for custom editor integrations. The <code>Mask</code> class
    applies a pattern and tracks caret position so the cursor lands in the right spot after each keystroke.
  </p>

  <h2>Mask class — direct instantiation</h2>
  <div class="card">
    <div class="row">
      <div class="field">
        <label for="m-value">Value</label>
        <input id="m-value" value="12345678901" />
      </div>
      <div class="field">
        <label for="m-pattern">Mask pattern</label>
        <input id="m-pattern" value="999.999.999-99" />
      </div>
    </div>
    <div class="field">
      <label for="m-caret">Caret position (optional)</label>
      <input id="m-caret" type="number" value="" placeholder="leave empty to omit" style="font-family:var(--sans)" />
    </div>
    <div class="output" id="mask-out">—</div>
  </div>

  <h2>buildMask() — resolves array masks automatically</h2>
  <div class="card">
    <div class="field">
      <label for="bm-value">Value</label>
      <input id="bm-value" value="11987654321" inputmode="numeric" />
      <p class="hint">mask array: <code>['(99) 9999-9999', '(99) 99999-9999']</code></p>
    </div>
    <div class="output" id="bm-out">—</div>
  </div>
</div>
`

const phoneMasks = ['(99) 9999-9999', '(99) 99999-9999']

function refreshMask() {
  const value   = document.querySelector<HTMLInputElement>('#m-value')!.value
  const pattern = document.querySelector<HTMLInputElement>('#m-pattern')!.value
  const caretRaw = document.querySelector<HTMLInputElement>('#m-caret')!.value
  const caret   = caretRaw !== '' ? Number(caretRaw) : undefined

  const m = caret !== undefined ? new Mask(value, pattern, caret) : new Mask(value, pattern)
  const result = m.process()
  document.querySelector<HTMLDivElement>('#mask-out')!.innerHTML =
    `result: <strong>${result}</strong> &nbsp; caret after: <strong>${m.caret}</strong>`
}

function refreshBuildMask() {
  const value = document.querySelector<HTMLInputElement>('#bm-value')!.value
  const m = buildMask(value, phoneMasks)
  const result = m.process()
  const chosen = value.replace(/\D/g, '').length <= 10 ? phoneMasks[0] : phoneMasks[1]
  document.querySelector<HTMLDivElement>('#bm-out')!.innerHTML =
    `result: <strong>${result}</strong> &nbsp; mask used: <strong>${chosen}</strong> &nbsp; caret: <strong>${m.caret}</strong>`
}

document.querySelector<HTMLInputElement>('#m-value')!.addEventListener('input', refreshMask)
document.querySelector<HTMLInputElement>('#m-pattern')!.addEventListener('input', refreshMask)
document.querySelector<HTMLInputElement>('#m-caret')!.addEventListener('input', refreshMask)
document.querySelector<HTMLInputElement>('#bm-value')!.addEventListener('input', refreshBuildMask)

refreshMask()
refreshBuildMask()
