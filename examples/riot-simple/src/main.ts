import { pure } from 'riot'
import { maskDecimal, maskInput } from 'mother-mask/riot'
import { formatDecimalValue } from 'mother-mask'
import './style.css'

const amountOptions = { decimalPlaces: 2, prefix: '$', allowNegative: true }

const phoneValueEl = document.querySelector('#phone-value')!
const amountValueEl = document.querySelector('#amount-value')!
const amountNumericEl = document.querySelector('#amount-numeric')!

const phoneField = pure(maskInput)({
  props: {
    mask: '(99) 99999-9999',
    name: 'phone',
    inputMode: 'tel',
    autocomplete: 'tel',
    placeholder: '(11) 98765-4321',
    defaultValue: '',
    onValueChange: (value: string) => {
      phoneValueEl.textContent = value || 'Empty'
    },
  },
})
phoneField.mount(document.querySelector('#phone')!)

const amountField = pure(maskDecimal)({
  props: {
    name: 'amount',
    options: amountOptions,
    placeholder: '$1,234.50',
    defaultValue: '',
    onValueChange: (value: string, numeric: number) => {
      amountValueEl.textContent = value || 'Empty'
      amountNumericEl.textContent = String(numeric)
    },
  },
})
amountField.mount(document.querySelector('#amount')!)

// `update()` isn't reactive here — call it explicitly whenever the mask,
// options, or an externally-set value should change (see the README).
document.querySelector('#fill')!.addEventListener('click', () => {
  const amount = formatDecimalValue(1234.5, amountOptions)
  phoneField.update({ mask: '(99) 99999-9999', value: '(11) 98765-4321' })
  amountField.update({ options: amountOptions, value: amount })
  phoneValueEl.textContent = '(11) 98765-4321'
  amountValueEl.textContent = amount
  amountNumericEl.textContent = '1234.5'
})

document.querySelector('#clear')!.addEventListener('click', () => {
  phoneField.update({ mask: '(99) 99999-9999', value: '' })
  amountField.update({ options: amountOptions, value: '' })
  phoneValueEl.textContent = 'Empty'
  amountValueEl.textContent = 'Empty'
  amountNumericEl.textContent = '0'
})
