import { test } from 'vitest'
// The built bundle, not src: this measures exactly what is published.
import { applyMask, processDecimal, unmaskDecimal } from '../dist/mother-mask.mjs'

const decimal = { decimalPlaces: 2, prefix: '$' }
const cpfDigits = '12345678901'

test('applyMask CPF', async ({ bench }) => {
  await bench('applyMask CPF', () => { applyMask(cpfDigits, '999.999.999-99', 11) }).run()
})

test('applyMask phone array', async ({ bench }) => {
  await bench('applyMask phone array', () => { applyMask('11999887766', ['(99) 9999-9999', '(99) 99999-9999'], 11) }).run()
})

test('applyMask quantified date', async ({ bench }) => {
  await bench('applyMask quantified date', () => { applyMask('12121986', '9{1,2}/9{1,2}/9{4}', 8) }).run()
})

test('format on each keystroke (CPF)', async ({ bench }) => {
  await bench('format on each keystroke (CPF)', () => {
    let value = ''
    for (const ch of cpfDigits) value = applyMask(value + ch, '999.999.999-99', value.length + 1).value
  }).run()
})

test('processDecimal', async ({ bench }) => {
  await bench('processDecimal', () => { processDecimal('1234567,89', decimal) }).run()
})

test('unmaskDecimal (parse)', async ({ bench }) => {
  await bench('unmaskDecimal (parse)', () => { unmaskDecimal('$12,345.67', decimal) }).run()
})
