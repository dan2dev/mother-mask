import { useState } from 'preact/hooks'
import { formatDecimalValue, InputDecimal, InputMask } from 'mother-mask/preact'

// Keep option objects outside the component so they stay stable across renders.
const amountOptions = { decimalPlaces: 2, prefix: '$', allowNegative: true }
const realOptions = { decimalPlaces: 2, separator: '.', decimalSeparator: ',', prefix: 'R$ ' }
const percentOptions = { decimalPlaces: 2, suffix: '%', segmented: false }

export function App() {
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState({ formatted: '', numeric: 0 })
  const [real, setReal] = useState('')
  const [percent, setPercent] = useState('')

  function fillExamples() {
    setPhone('(11) 98765-4321')
    setDate('25/12/2026')
    setAmount({ formatted: formatDecimalValue(1234.5, amountOptions), numeric: 1234.5 })
    setReal(formatDecimalValue(1234.5, realOptions))
    setPercent(formatDecimalValue(12.5, percentOptions))
  }

  function clearExamples() {
    setPhone('')
    setDate('')
    setAmount({ formatted: '', numeric: 0 })
    setReal('')
    setPercent('')
  }

  return (
    <main>
      <p class="eyebrow">mother-mask + Preact</p>
      <h1>Simple input examples</h1>
      <p>Try a phone number, a date, or a decimal format. Type, paste, or fill all the examples below.</p>

      <div class="actions">
        <button type="button" onClick={fillExamples}>Fill example values</button>
        <button type="button" onClick={clearExamples}>Clear</button>
      </div>

      <h2>Phone and date</h2>
      <div class="examples">
        <section aria-labelledby="phone-title">
          <label id="phone-title" htmlFor="phone">Phone number</label>
          <InputMask
            id="phone"
            name="phone"
            mask="(99) 99999-9999"
            value={phone}
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 98765-4321"
            aria-describedby="phone-hint"
            onValueChange={setPhone}
          />
          <p id="phone-hint">11 digits, including the area code.</p>
          <p>Preact state: <output>{phone || 'Empty'}</output></p>
        </section>

        <section aria-labelledby="date-title">
          <label id="date-title" htmlFor="date">Date</label>
          <InputMask
            id="date"
            name="date"
            mask="99/99/9999"
            value={date}
            inputMode="numeric"
            placeholder="DD/MM/YYYY"
            aria-describedby="date-hint"
            onValueChange={setDate}
          />
          <p id="date-hint">Formats digits as DD/MM/YYYY; it does not validate the date.</p>
          <p>Preact state: <output>{date || 'Empty'}</output></p>
        </section>
      </div>

      <h2>Decimal formats</h2>
      <div class="examples">
        <section aria-labelledby="amount-title">
          <label id="amount-title" htmlFor="amount">Amount</label>
          <InputDecimal
            id="amount"
            name="amount"
            options={amountOptions}
            value={amount.formatted}
            placeholder="$1,234.50"
            aria-describedby="amount-hint"
            onValueChange={(formatted, numeric) => setAmount({ formatted, numeric })}
          />
          <p id="amount-hint">US dollars with two decimal places. Try a negative amount, too.</p>
          <p>Preact state: <output>{amount.formatted || 'Empty'}</output></p>
          <p>Numeric value: <output>{amount.numeric}</output></p>
        </section>

        <section aria-labelledby="real-title">
          <label id="real-title" htmlFor="real">Brazilian real</label>
          <InputDecimal
            id="real"
            name="real"
            options={realOptions}
            value={real}
            placeholder="R$ 1.234,50"
            aria-describedby="real-hint"
            onValueChange={setReal}
          />
          <p id="real-hint">Periods group thousands; a comma separates the two decimal places.</p>
          <p>Preact state: <output>{real || 'Empty'}</output></p>
        </section>

        <section aria-labelledby="percent-title">
          <label id="percent-title" htmlFor="percent">Percentage</label>
          <InputDecimal
            id="percent"
            name="percent"
            options={percentOptions}
            value={percent}
            placeholder="12.50%"
            aria-describedby="percent-hint"
            onValueChange={setPercent}
          />
          <p id="percent-hint">Two decimal places and a % suffix. Values are not limited to 100.</p>
          <p>Preact state: <output>{percent || 'Empty'}</output></p>
        </section>
      </div>
    </main>
  )
}
