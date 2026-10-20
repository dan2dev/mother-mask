import { formatDecimalValue, motherMask, motherMaskDecimal } from 'mother-mask/nuclo'

const amountOptions = { decimalPlaces: 2, prefix: '$', allowNegative: true }
const realOptions = { decimalPlaces: 2, separator: '.', decimalSeparator: ',', prefix: 'R$ ' }
const percentOptions = { decimalPlaces: 2, suffix: '%', segmented: false }

// Plain mutable state: change it, then call update() to sync the DOM.
let phone = ''
let date = ''
let amount = ''
let amountNumeric = 0
let real = ''
let percent = ''

function fillExamples() {
  phone = '(11) 98765-4321'
  date = '25/12/2026'
  amount = formatDecimalValue(1234.5, amountOptions)
  amountNumeric = 1234.5
  real = formatDecimalValue(1234.5, realOptions)
  percent = formatDecimalValue(12.5, percentOptions)
  update()
}

function clearExamples() {
  phone = ''
  date = ''
  amount = ''
  amountNumeric = 0
  real = ''
  percent = ''
  update()
}

export const App = () =>
  main(
    p({ className: 'eyebrow' }, 'mother-mask + Nuclo'),
    h1('Simple input examples'),
    p('Try a phone number, a date, or a decimal format. Type, paste, or fill all the examples below.'),

    div(
      { className: 'actions' },
      button('Fill example values', { type: 'button', onClick: fillExamples }),
      button('Clear', { type: 'button', onClick: clearExamples }),
    ),

    h2('Phone and date'),
    div(
      { className: 'examples' },
      section(
        { 'aria-labelledby': 'phone-title' },
        label({ id: 'phone-title', for: 'phone' }, 'Phone number'),
        input(
          {
            id: 'phone',
            name: 'phone',
            inputMode: 'tel',
            autocomplete: 'tel',
            placeholder: '(11) 98765-4321',
            'aria-describedby': 'phone-hint',
          },
          motherMask('(99) 99999-9999', {
            value: () => phone,
            onChange: (next) => { phone = next; update() },
          }),
        ),
        p({ id: 'phone-hint' }, '11 digits, including the area code.'),
        p('Nuclo state: ', output(() => phone || 'Empty')),
      ),

      section(
        { 'aria-labelledby': 'date-title' },
        label({ id: 'date-title', for: 'date' }, 'Date'),
        input(
          {
            id: 'date',
            name: 'date',
            inputMode: 'numeric',
            placeholder: 'DD/MM/YYYY',
            'aria-describedby': 'date-hint',
          },
          motherMask('99/99/9999', {
            value: () => date,
            onChange: (next) => { date = next; update() },
          }),
        ),
        p({ id: 'date-hint' }, 'Formats digits as DD/MM/YYYY; it does not validate the date.'),
        p('Nuclo state: ', output(() => date || 'Empty')),
      ),
    ),

    h2('Decimal formats'),
    div(
      { className: 'examples' },
      section(
        { 'aria-labelledby': 'amount-title' },
        label({ id: 'amount-title', for: 'amount' }, 'Amount'),
        input(
          { id: 'amount', name: 'amount', placeholder: '$1,234.50', 'aria-describedby': 'amount-hint' },
          motherMaskDecimal({
            ...amountOptions,
            value: () => amount,
            onChange: (next, numeric) => { amount = next; amountNumeric = numeric; update() },
          }),
        ),
        p({ id: 'amount-hint' }, 'US dollars with two decimal places. Try a negative amount, too.'),
        p('Nuclo state: ', output(() => amount || 'Empty')),
        p('Numeric value: ', output(() => amountNumeric)),
      ),

      section(
        { 'aria-labelledby': 'real-title' },
        label({ id: 'real-title', for: 'real' }, 'Brazilian real'),
        input(
          { id: 'real', name: 'real', placeholder: 'R$ 1.234,50', 'aria-describedby': 'real-hint' },
          motherMaskDecimal({
            ...realOptions,
            value: () => real,
            onChange: (next) => { real = next; update() },
          }),
        ),
        p({ id: 'real-hint' }, 'Periods group thousands; a comma separates the two decimal places.'),
        p('Nuclo state: ', output(() => real || 'Empty')),
      ),

      section(
        { 'aria-labelledby': 'percent-title' },
        label({ id: 'percent-title', for: 'percent' }, 'Percentage'),
        input(
          { id: 'percent', name: 'percent', placeholder: '12.50%', 'aria-describedby': 'percent-hint' },
          motherMaskDecimal({
            ...percentOptions,
            value: () => percent,
            onChange: (next) => { percent = next; update() },
          }),
        ),
        p({ id: 'percent-hint' }, 'Two decimal places and a % suffix. Values are not limited to 100.'),
        p('Nuclo state: ', output(() => percent || 'Empty')),
      ),
    ),
  )
