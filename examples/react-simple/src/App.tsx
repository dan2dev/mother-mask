import { useState } from 'react'
import { formatDecimalValue } from 'mother-mask'
import { InputDecimal } from './InputDecimal'
import { InputMask } from './InputMask'

// Keep arrays and options stable so state updates don't recreate the binding.
const phoneMasks = ['(99) 9999-9999', '(99) 99999-9999']
const amountOptions = {
  decimalPlaces: 2,
  separator: ',',
  decimalSeparator: '.',
  prefix: '$',
  allowNegative: true,
}

export function App() {
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState({ formatted: '', numeric: 0 })

  return (
    <main>
      <p className="eyebrow">mother-mask + React</p>
      <h1>A simple masked input</h1>
      <p>Type or paste a value, or use the buttons to update the inputs from React state.</p>

      <div className="actions">
        <button type="button" onClick={() => {
          setPhone('(11) 98765-4321')
          setDate('25/12/2026')
          setAmount({ formatted: formatDecimalValue(1234.5, amountOptions), numeric: 1234.5 })
        }}>Fill example values</button>
        <button type="button" onClick={() => {
          setPhone('')
          setDate('')
          setAmount({ formatted: '', numeric: 0 })
        }}>Clear</button>
      </div>

      <section aria-labelledby="phone-title">
        <label id="phone-title" htmlFor="phone">Phone number</label>
        <InputMask
          id="phone"
          name="phone"
          mask={phoneMasks}
          value={phone}
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 98765-4321"
          aria-describedby="phone-hint"
          onValueChange={setPhone}
        />
        <p id="phone-hint">Accepts 10 or 11 digits.</p>
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
        <p id="amount-hint">Two decimal places. Negative amounts are allowed.</p>
        <p>React state: <output id="amount-formatted" htmlFor="amount">{amount.formatted || 'Empty'}</output></p>
        <p>Numeric value: <output id="amount-numeric" htmlFor="amount">{amount.numeric}</output></p>
      </section>
    </main>
  )
}
