import { describe, expect, it } from 'vitest'
import { process, processDecimal } from '../src/index'
import type { ApplyMaskOptions, DecimalMaskOptions, MaskPattern } from '../src/index'

const uppercaseLetter = { match: /[a-z]/i, transform: (char: string) => char.toUpperCase() }
const uppercaseAlphanumeric = { match: /[a-z0-9]/i, transform: (char: string) => char.toUpperCase() }

const patternExamples: Array<[
  name: string,
  input: string,
  mask: MaskPattern,
  expected: string,
  options?: ApplyMaskOptions,
]> = [
  ['CPF', '12345678901', '999.999.999-99', '123.456.789-01'],
  ['alphanumeric CNPJ', '12abc34501de99', 'AA.AAA.AAA/AAAA-99', '12.ABC.345/01DE-99', { tokens: { A: uppercaseAlphanumeric } }],
  ['CEP', '12345678', '99999-999', '12345-678'],
  ['Brazilian phone array', '11987654321', ['(99) 9999-9999', '(99) 99999-9999'], '(11) 98765-4321'],
  ['date', '25122025', '99/99/9999', '25/12/2025'],
  ['time', '1430', '99:99', '14:30'],
  ['license plate', 'abc1234', 'ZZZ-9999', 'ABC-1234', { segmented: false, tokens: { Z: uppercaseLetter } }],
  ['Mercosul plate', 'abc1d23', 'ZZZ-9Z99', 'ABC-1D23', { tokens: { Z: uppercaseLetter } }],
  ['15-digit card array', '378282246310005', ['9999 999999 99999', '9999 9999 9999 9999'], '3782 822463 10005'],
  ['16-digit card array', '4111111111111111', ['9999 999999 99999', '9999 9999 9999 9999'], '4111 1111 1111 1111'],
  ['US phone', '2025550123', '(999) 999-9999', '(202) 555-0123'],
  ['US SSN', '123456789', '999-99-9999', '123-45-6789'],
  ['US ZIP+4', '123456789', '99999-9999', '12345-6789'],
  ['Canadian postal code', 'k1a0b1', 'Z9Z 9Z9', 'K1A 0B1', { tokens: { Z: uppercaseLetter } }],
  ['Canadian SIN', '123456789', '999 999 999', '123 456 789'],
  ['German IBAN', 'DE89370400440532013000', 'DE99 9999 9999 9999 9999 99', 'DE89 3704 0044 0532 0130 00'],
  ['German VAT ID', '123456789', 'DE999999999', 'DE123456789'],
  ['Polish postal code', '00123', '99-999', '00-123'],
  ['MAC address', 'a1b2c3d4e5f6', 'HH:HH:HH:HH:HH:HH', 'a1:b2:c3:d4:e5:f6', { tokens: { H: /[0-9A-Fa-f]/ } }],
  ['uppercase identifier', 'abc123', 'UUU-999', 'ABC-123', { tokens: { U: uppercaseLetter } }],
  [
    'card resolved by prefix',
    '378282246310005',
    '9999 9999 9999 9999',
    '3782 822463 10005',
    { resolveMask: value => value.startsWith('34') || value.startsWith('37') ? '9999 999999 99999' : '9999 9999 9999 9999' },
  ],
  ['escaped A prefix', '123456', '\\A-999999', 'A-123456'],
  ['escaped 9 prefix', '12', '\\9-99', '9-12'],
  ['escaped Z prefix', '12', '\\Z-99', 'Z-12'],
  ['escaped backslash', '12', '\\\\99', '\\12'],
  ['Unicode letters', 'ÁЖλ𐐀', 'LLLL', 'ÁЖλ𐐀', { tokens: { L: /\p{L}/u } }],
]

const decimalExamples: Array<[
  name: string,
  input: string,
  expected: string,
  options?: DecimalMaskOptions,
]> = [
  ['unlimited fraction', '1234.56789', '1,234.56789'],
  ['US dollars', '1234.56', '$1,234.56', { decimalPlaces: 2, prefix: '$' }],
  ['Brazilian real', '1234,56', 'R$ 1.234,56', { decimalPlaces: 2, separator: '.', decimalSeparator: ',', prefix: 'R$ ' }],
  ['euros', '1234,56', '1.234,56 €', { decimalPlaces: 2, separator: '.', decimalSeparator: ',', suffix: ' €' }],
  ['whole units', '1234', '1,234 units', { decimalPlaces: 0, suffix: ' units' }],
  ['negative balance', '-1234.56', '-$1,234.56', { decimalPlaces: 2, prefix: '$', allowNegative: true }],
  ['ungrouped decimal', '1234.56', '1234.56', { decimalPlaces: 2, segmented: false }],
  ['fixed widths', '7.3', '07.30', { numberPlaces: 2, decimalPlaces: 2 }],
  ['callback suffix', '12.5', '12.5 kg', { suffix: ' kg' }],
]

describe('documentation examples', () => {
  it.each(patternExamples)('%s', (_name, input, mask, expected, options) => {
    expect(process(input, mask, options)).toBe(expected)
  })

  it.each(decimalExamples)('%s', (_name, input, expected, options) => {
    expect(processDecimal(input, options)).toBe(expected)
  })
})
