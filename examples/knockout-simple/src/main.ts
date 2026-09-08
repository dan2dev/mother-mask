import ko from 'knockout'
import 'mother-mask/knockout'
import { formatDecimalValue } from 'mother-mask'
import './style.css'

const amountOptions = { decimalPlaces: 2, prefix: '$', allowNegative: true }

class CheckoutViewModel {
  phone = ko.observable('')
  amount = ko.observable('')
  amountNumeric = ko.observable(0)
  amountOptions = amountOptions

  setAmount = (value: string, numeric: number) => {
    this.amount(value)
    this.amountNumeric(numeric)
  }

  fill = () => {
    this.phone('(11) 98765-4321')
    this.setAmount(formatDecimalValue(1234.5, amountOptions), 1234.5)
  }

  clear = () => {
    this.phone('')
    this.setAmount('', 0)
  }
}

ko.applyBindings(new CheckoutViewModel(), document.getElementById('app')!)
