import Alpine from 'alpinejs'
import { motherMaskPlugin } from 'mother-mask/alpine'
import { formatDecimalValue } from 'mother-mask'
import './style.css'

const amountOptions = { decimalPlaces: 2, prefix: '$', allowNegative: true }

Alpine.plugin(motherMaskPlugin)

Alpine.data('checkout', () => ({
  phone: '',
  amount: '',
  amountNumeric: 0,
  amountOptions,
  fill() {
    this.phone = '(11) 98765-4321'
    this.amount = formatDecimalValue(1234.5, amountOptions)
    this.amountNumeric = 1234.5
  },
  clear() {
    this.phone = ''
    this.amount = ''
    this.amountNumeric = 0
  },
}))

declare global {
  interface Window {
    Alpine: typeof Alpine
  }
}
window.Alpine = Alpine
Alpine.start()
