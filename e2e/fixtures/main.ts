import { applyMask, bind, bindDecimal, buildMask } from 'mother-mask'

// Exposed so tests can bind fresh, dynamically created inputs for stress
// scenarios without needing a dedicated static fixture element per mask.
declare global {
  interface Window {
    motherMask: {
      bind: typeof bind
      bindDecimal: typeof bindDecimal
      applyMask: typeof applyMask
      buildMask: typeof buildMask
    }
  }
}
window.motherMask = { bind, bindDecimal, applyMask, buildMask }

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

bind($('cpf'), '999.999.999-99')
bind($('phone'), ['(99) 9999-9999', '(99) 99999-9999'])
// Matches the docs examples: the flat plate mask has no `inputmode` and no
// natural word boundary while typing — exactly the shape of input Android's
// on-screen keyboard wraps in an unbroken IME composition session.
bind($('plate'), 'ZZZ-9999', { segmented: false })
bind($('mercosul'), 'ZZZ-9Z99')
bind($('date'), '99/99/9999')
bindDecimal($('usd'), { decimalPlaces: 2, prefix: '$' })
