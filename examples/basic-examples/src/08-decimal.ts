import './style.css'
import { bindDecimal } from 'mother-mask'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="page">
  <a href="/" class="back">← back</a>
  <h1>bindDecimal()</h1>
  <p class="subtitle">
    A second binder for decimal/currency-style inputs — numbers, not pattern-slot
    strings. There's no fixed template: the integer part grows and shrinks freely as
    you type, and formatting (grouping, decimal places, prefix/suffix) is driven
    entirely by options. Same contract as <code>bind()</code>: idempotent, marked
    with <code>data-masked</code>, returns a dispose function.
    <br><code>bindDecimal(input, options?)</code>
    <br><br>
    Typing behaves like a normal number field, not a cents-first calculator: digits
    fill the integer part until you type the decimal separator ("." or "," — either
    works), and the fixed-width fraction is always shown zero-padded. Editing is
    segmented, same as <code>bind()</code>: shortening "423.42" to "423.4" re-pads
    the fraction ("423.40") instead of reflowing digits from the integer part.
  </p>

  <h2>Currency (USD-style)</h2>
  <div class="card">
    <div class="field">
      <label for="usd">Price</label>
      <input id="usd" placeholder="0.00" inputmode="decimal" />
      <p class="hint"><code>bindDecimal(input, { decimalPlaces: 2, prefix: '$', separator: ',' })</code> — try "423", then "423.", then "423.4"</p>
    </div>
  </div>

  <h2>Locale-aware separators (EUR-style)</h2>
  <div class="card">
    <div class="field">
      <label for="eur">Amount</label>
      <input id="eur" placeholder="0,00" inputmode="decimal" />
      <p class="hint"><code>bindDecimal(input, { decimalPlaces: 2, separator: '.', decimalSeparator: ',', suffix: ' €' })</code> — typing "1234" produces "1.234,00 €"; "." also opens the fraction</p>
    </div>
  </div>

  <h2>Whole numbers (no fraction)</h2>
  <div class="card">
    <div class="field">
      <label for="qty">Quantity</label>
      <input id="qty" placeholder="0" inputmode="numeric" />
      <p class="hint"><code>bindDecimal(input, { decimalPlaces: 0, suffix: ' units' })</code></p>
    </div>
  </div>

  <h2>Negative values allowed</h2>
  <div class="card">
    <div class="field">
      <label for="balance">Account balance</label>
      <input id="balance" placeholder="$0.00" inputmode="decimal" />
      <p class="hint"><code>bindDecimal(input, { decimalPlaces: 2, prefix: '$', allowNegative: true })</code> — type a "-" anywhere to flip the sign</p>
    </div>
  </div>

  <h2>Masked value vs numeric value</h2>
  <div class="card">
    <div class="field">
      <label for="total">Order total</label>
      <input id="total" placeholder="$0.00" inputmode="decimal" />
    </div>
    <div class="row">
      <div>
        <p class="hint">masked (display)</p>
        <div class="output" id="total-masked">—</div>
      </div>
      <div>
        <p class="hint">numeric (for API/state)</p>
        <div class="output" id="total-numeric">—</div>
      </div>
    </div>
  </div>
</div>
`

bindDecimal(document.querySelector<HTMLInputElement>('#usd')!, {
  decimalPlaces: 2,
  segmented: true,
  separator: ',',
  prefix: '$',
  suffix: '',
})

bindDecimal(document.querySelector<HTMLInputElement>('#eur')!, {
  decimalPlaces: 2,
  separator: '.',
  decimalSeparator: ',',
  suffix: ' €',
})

bindDecimal(document.querySelector<HTMLInputElement>('#qty')!, {
  decimalPlaces: 0,
  suffix: ' units',
})

bindDecimal(document.querySelector<HTMLInputElement>('#balance')!, {
  decimalPlaces: 2,
  prefix: '$',
  allowNegative: true,
})

bindDecimal(document.querySelector<HTMLInputElement>('#total')!, {
  decimalPlaces: 2,
  prefix: '$',
  onChange: (masked, numericValue) => {
    document.querySelector<HTMLDivElement>('#total-masked')!.innerHTML = `<strong>${masked || '—'}</strong>`
    document.querySelector<HTMLDivElement>('#total-numeric')!.innerHTML = `<strong>${masked ? numericValue : '—'}</strong>`
  },
})
