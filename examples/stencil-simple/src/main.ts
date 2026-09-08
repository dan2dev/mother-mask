import 'mother-mask/stencil/mask-input'
import 'mother-mask/stencil/mask-decimal'
import type { StencilMaskInputElement } from 'mother-mask/stencil/mask-input'
import type { StencilMaskDecimalElement } from 'mother-mask/stencil/mask-decimal'
import { formatDecimalValue } from 'mother-mask'
import './style.css'

const amountOptions = { decimalPlaces: 2, prefix: '$', allowNegative: true }

const phone = document.querySelector<StencilMaskInputElement>('#phone')!
const amount = document.querySelector<StencilMaskDecimalElement>('#amount')!
amount.options = amountOptions

const phoneValue = document.querySelector('#phone-value')!
const amountValue = document.querySelector('#amount-value')!
const amountNumeric = document.querySelector('#amount-numeric')!

phone.addEventListener('value-change', (e) => {
  phoneValue.textContent = (e as CustomEvent<string>).detail || 'Empty'
})
amount.addEventListener('value-change', (e) => {
  amountValue.textContent = (e as CustomEvent<string>).detail || 'Empty'
})
amount.addEventListener('numeric-value-change', (e) => {
  amountNumeric.textContent = String((e as CustomEvent<number>).detail)
})

document.querySelector('#fill')!.addEventListener('click', () => {
  phone.value = '(11) 98765-4321'
  phoneValue.textContent = phone.value
  amount.value = formatDecimalValue(1234.5, amountOptions)
  amountValue.textContent = amount.value
  amountNumeric.textContent = '1234.5'
})

document.querySelector('#clear')!.addEventListener('click', () => {
  phone.value = ''
  phoneValue.textContent = 'Empty'
  amount.value = ''
  amountValue.textContent = 'Empty'
  amountNumeric.textContent = '0'
})
