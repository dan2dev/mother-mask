import { useState } from 'react'
import { formatDecimalValue, InputDecimal, InputMask } from 'mother-mask/react'

// Keep option objects outside the component so they stay stable across renders.
const amountOptions = { decimalPlaces: 2, prefix: '$', allowNegative: true }
const realOptions = { decimalPlaces: 2, separator: '.', decimalSeparator: ',', prefix: 'R$ ' }
const percentOptions = { decimalPlaces: 2, suffix: '%', segmented: false }
const weightOptions = { decimalPlaces: 3, suffix: ' kg' }
const quantityOptions = { decimalPlaces: 0, suffix: ' units' }
const plainOptions = { decimalPlaces: 4, segmented: false }

export function App() {
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState({ formatted: '', numeric: 0 })
  const [real, setReal] = useState('')
  const [percent, setPercent] = useState('')
  const [weight, setWeight] = useState('')
  const [quantity, setQuantity] = useState('')
  const [decimal, setDecimal] = useState('')
  const [plain, setPlain] = useState('')

  function fillExamples() {
    setPhone('(11) 98765-4321')
    setDate('25/12/2026')
    setAmount({ formatted: formatDecimalValue(1234.5, amountOptions), numeric: 1234.5 })
    setReal(formatDecimalValue(1234.5, realOptions))
    setPercent(formatDecimalValue(12.5, percentOptions))
    setWeight(formatDecimalValue(2.375, weightOptions))
    setQuantity(formatDecimalValue(1250, quantityOptions))
    setDecimal(formatDecimalValue(1234.56789))
    setPlain(formatDecimalValue(1234.5678, plainOptions))
  }

  function clearExamples() {
    setPhone('')
    setDate('')
    setAmount({ formatted: '', numeric: 0 })
    setReal('')
    setPercent('')
    setWeight('')
    setQuantity('')
    setDecimal('')
    setPlain('')
  }

  return (
    <main>
      <p className="eyebrow">mother-mask + React</p>
      <h1>Simple input examples</h1>
      <p>Try a phone number, a date, or a decimal format. Type, paste, or fill all the examples below.</p>

      <div className="actions">
        <button type="button" onClick={fillExamples}>Fill example values</button>
        <button type="button" onClick={clearExamples}>Clear</button>
      </div>

      <h2>Phone and date</h2>
      <div className="examples">
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
          <p>React state: <output htmlFor="phone">{phone || 'Empty'}</output></p>
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
          <p>React state: <output htmlFor="date">{date || 'Empty'}</output></p>
        </section>
      </div>

      <h2>Decimal formats</h2>
      <div className="examples">
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
          <p>React state: <output id="amount-formatted" htmlFor="amount">{amount.formatted || 'Empty'}</output></p>
          <p>Numeric value: <output id="amount-numeric" htmlFor="amount">{amount.numeric}</output></p>
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
          <p>React state: <output htmlFor="real">{real || 'Empty'}</output></p>
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
          <p>React state: <output htmlFor="percent">{percent || 'Empty'}</output></p>
        </section>

        <section aria-labelledby="weight-title">
          <label id="weight-title" htmlFor="weight">Weight</label>
          <InputDecimal
            id="weight"
            name="weight"
            options={weightOptions}
            value={weight}
            placeholder="2.375 kg"
            aria-describedby="weight-hint"
            onValueChange={setWeight}
          />
          <p id="weight-hint">Three decimal places and a kg suffix.</p>
          <p>React state: <output htmlFor="weight">{weight || 'Empty'}</output></p>
        </section>

        <section aria-labelledby="quantity-title">
          <label id="quantity-title" htmlFor="quantity">Whole quantities</label>
          <InputDecimal
            id="quantity"
            name="quantity"
            options={quantityOptions}
            value={quantity}
            inputMode="numeric"
            placeholder="1,250 units"
            aria-describedby="quantity-hint"
            onValueChange={setQuantity}
          />
          <p id="quantity-hint">Whole numbers only, with thousands grouping and a units suffix.</p>
          <p>React state: <output htmlFor="quantity">{quantity || 'Empty'}</output></p>
        </section>

        <section aria-labelledby="decimal-title">
          <label id="decimal-title" htmlFor="decimal">Flexible decimals</label>
          <InputDecimal
            id="decimal"
            name="decimal"
            value={decimal}
            placeholder="1,234.56789"
            aria-describedby="decimal-hint"
            onValueChange={setDecimal}
          />
          <p id="decimal-hint">No options needed. The fraction is optional, with no fixed number of places.</p>
          <p>React state: <output htmlFor="decimal">{decimal || 'Empty'}</output></p>
        </section>

        <section aria-labelledby="plain-title">
          <label id="plain-title" htmlFor="plain">No thousands separator</label>
          <InputDecimal
            id="plain"
            name="plain"
            options={plainOptions}
            value={plain}
            placeholder="1234.5678"
            aria-describedby="plain-hint"
            onValueChange={setPlain}
          />
          <p id="plain-hint">Four decimal places, without thousands grouping.</p>
          <p>React state: <output htmlFor="plain">{plain || 'Empty'}</output></p>
        </section>
      </div>
    </main>
  )
}
