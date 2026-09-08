import { component$, useSignal } from '@builder.io/qwik'
import { InputDecimal, InputMask, formatDecimalValue } from 'mother-mask/qwik'
import './style.css'

const amountOptions = { decimalPlaces: 2, prefix: '$', allowNegative: true }

export const Root = component$(() => {
  const phone = useSignal('')
  const amount = useSignal('')
  const amountNumeric = useSignal(0)

  return (
    <main>
      <p class="eyebrow">mother-mask + Qwik</p>
      <h1>Simple input examples</h1>
      <p>Type, paste, or fill both examples below.</p>

      <div class="actions">
        <button
          type="button"
          onClick$={() => {
            phone.value = '(11) 98765-4321'
            amount.value = formatDecimalValue(1234.5, amountOptions)
            amountNumeric.value = 1234.5
          }}
        >
          Fill example values
        </button>
        <button
          type="button"
          onClick$={() => {
            phone.value = ''
            amount.value = ''
            amountNumeric.value = 0
          }}
        >
          Clear
        </button>
      </div>

      <div class="examples">
        <section>
          <label for="phone">Phone number</label>
          <InputMask
            id="phone"
            name="phone"
            mask="(99) 99999-9999"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 98765-4321"
            value={phone.value}
            onValueChange$={(v) => (phone.value = v)}
          />
          <p>Value: <output>{phone.value || 'Empty'}</output></p>
        </section>

        <section>
          <label for="amount">Amount</label>
          <InputDecimal
            id="amount"
            name="amount"
            options={amountOptions}
            placeholder="$1,234.50"
            value={amount.value}
            onValueChange$={(v, n) => {
              amount.value = v
              amountNumeric.value = n
            }}
          />
          <p>Value: <output>{amount.value || 'Empty'}</output></p>
          <p>Numeric value: <output>{amountNumeric.value}</output></p>
        </section>
      </div>
    </main>
  )
})
