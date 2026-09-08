import m from 'mithril'
import { InputDecimal, InputMask } from 'mother-mask/mithril'
import { formatDecimalValue } from 'mother-mask'
import './style.css'

const amountOptions = { decimalPlaces: 2, prefix: '$', allowNegative: true }

// A Mithril closure component: `App()` runs once per `m.mount()`/`m()` call
// and returns an object whose `view` closes over this instance's own
// `state` — the same "closure component" shape InputMask/InputDecimal
// themselves use internally, rather than module-level globals shared
// across every instance.
function App(): m.Component {
  const state = { phone: '', amount: '', amountNumeric: 0 }

  // InputMask/InputDecimal call onValueChange from a native `input` event
  // listener registered by bind() directly — not through one of Mithril's
  // own `on*` attrs — so a redraw isn't scheduled automatically; trigger
  // one explicitly to keep the "Mithril state" output in sync.
  function setPhone(value: string) {
    state.phone = value
    m.redraw()
  }

  function setAmount(value: string, numeric: number) {
    state.amount = value
    state.amountNumeric = numeric
    m.redraw()
  }

  function fill() {
    state.phone = '(11) 98765-4321'
    setAmount(formatDecimalValue(1234.5, amountOptions), 1234.5)
  }

  function clear() {
    state.phone = ''
    setAmount('', 0)
  }

  return {
    view: () =>
      m('main', [
        m('p.eyebrow', 'mother-mask + Mithril.js'),
        m('h1', 'Simple input examples'),
        m('p', 'Type, paste, or fill both examples below.'),

        m('div.actions', [
          m('button[type=button]', { onclick: fill }, 'Fill example values'),
          m('button[type=button]', { onclick: clear }, 'Clear'),
        ]),

        m('div.examples', [
          m('section', [
            m('label', { for: 'phone' }, 'Phone number'),
            m(InputMask, {
              id: 'phone',
              name: 'phone',
              mask: '(99) 99999-9999',
              inputmode: 'tel',
              autocomplete: 'tel',
              placeholder: '(11) 98765-4321',
              value: state.phone,
              onValueChange: setPhone,
            }),
            m('p', ['Mithril state: ', m('output', state.phone || 'Empty')]),
          ]),

          m('section', [
            m('label', { for: 'amount' }, 'Amount'),
            m(InputDecimal, {
              id: 'amount',
              name: 'amount',
              options: amountOptions,
              placeholder: '$1,234.50',
              value: state.amount,
              onValueChange: setAmount,
            }),
            m('p', ['Mithril state: ', m('output', state.amount || 'Empty')]),
            m('p', ['Numeric value: ', m('output', state.amountNumeric)]),
          ]),
        ]),
      ]),
  }
}

m.mount(document.getElementById('app')!, App)
