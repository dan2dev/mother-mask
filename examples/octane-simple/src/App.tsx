import { useState } from 'octane'
import { InputDecimal, InputMask, formatDecimalValue } from 'mother-mask/octane'

const amountOptions = { decimalPlaces: 2, prefix: '$', allowNegative: true }

export function App() {
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [amountNumeric, setAmountNumeric] = useState(0)

  function fill() {
    setPhone('(11) 98765-4321')
    setAmount(formatDecimalValue(1234.5, amountOptions))
    setAmountNumeric(1234.5)
  }

  function clear() {
    setPhone('')
    setAmount('')
    setAmountNumeric(0)
  }

  return (
    <main>
      <p class="eyebrow">mother-mask + Octane</p>
      <h1>Simple input examples</h1>
      <p>Type, paste, or fill both examples below.</p>

      <div class="actions">
        <button type="button" onClick={fill}>Fill example values</button>
        <button type="button" onClick={clear}>Clear</button>
      </div>

      <div class="examples">
        <section>
          <label for="phone">Phone number</label>
          <InputMask
            id="phone"
            name="phone"
            mask="(99) 99999-9999"
            inputMode="tel"
            autocomplete="tel"
            placeholder="(11) 98765-4321"
            value={phone}
            onValueChange={setPhone}
          />
          <p>Value: <output>{phone || 'Empty'}</output></p>
        </section>

        <section>
          <label for="amount">Amount</label>
          <InputDecimal
            id="amount"
            name="amount"
            options={amountOptions}
            placeholder="$1,234.50"
            value={amount}
            onValueChange={(v, n) => { setAmount(v); setAmountNumeric(n) }}
          />
          <p>Value: <output>{amount || 'Empty'}</output></p>
          <p>Numeric value: <output>{amountNumeric}</output></p>
        </section>
      </div>
    </main>
  )
}
