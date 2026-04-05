import { describe, it, expect } from 'vitest'
import { applyMask, buildMask } from '../src/index'

/**
 * Table-driven caret checks: `inputCaret` is the index after which typed input
 * is considered “to the left” of the cursor in the raw (possibly littered) string.
 */
function expectCaret(
  value: string,
  mask: string,
  inputCaret: number,
  expected: { value: string; caret: number },
): void {
  expect(applyMask(value, mask, inputCaret)).toEqual(expected)
}

describe('applyMask() — caret positions (boundaries)', () => {
  it('caret 0: skipped leading chars then first match still yield caret 0 when that match is strictly after index 0', () => {
    // First consumed digit has valueIdx 2 after consume → 2 <= 0 is false → caret freezes at 0
    expectCaret('x12', '999', 0, { value: '12', caret: 0 })
  })

  it('caret 0: leading digit matches if cursor is before any consumed slot', () => {
    expectCaret('1', '999', 0, { value: '1', caret: 0 })
  })

  it('caret between first and second raw digit (index 1) leaves output caret after first digit', () => {
    expectCaret('12', '999', 1, { value: '12', caret: 1 })
  })

  it('caret at index 2 in "123" leaves output caret after second digit (third char is past caret)', () => {
    expectCaret('123', '999', 2, { value: '123', caret: 2 })
  })

  it('caret at end of raw input places output caret at end of masked value', () => {
    expectCaret('123', '999', 3, { value: '123', caret: 3 })
  })

  it('caret past last character behaves like caret at end', () => {
    expectCaret('12', '99-99', 99, { value: '12', caret: 2 })
  })

  it('caret at end includes flushed trailing literals in output length', () => {
    expectCaret('1234', '99-99', 4, { value: '12-34', caret: 5 })
  })
})

describe('applyMask() — caret positions (literals & jumps)', () => {
  it('jumps past one literal after second digit', () => {
    expectCaret('123', '99-99', 3, { value: '12-3', caret: 4 })
  })

  it('jumps past multiple literals (phone)', () => {
    expectCaret('(119', '(99) 99999-9999', 4, { value: '(11) 9', caret: 6 })
  })

  it('caret in the middle of a partially filled mask before a literal', () => {
    expectCaret('12', '99-99', 2, { value: '12', caret: 2 })
  })

  it('CPF: caret after third block before hyphen to last digits', () => {
    const mask = '999.999.999-99'
    expectCaret('123456789', mask, 9, { value: '123.456.789', caret: 11 })
  })

  it('CNPJ alfanumérico: caret at end of partial input matches end of masked string', () => {
    const mask = 'AA.AAA.AAA/AAAA-99'
    const segment = '1A.B2C.3D4/5E6F'
    expectCaret(segment, mask, segment.length, { value: segment, caret: 15 })
  })
})

describe('applyMask() — caret positions (Z / A slots)', () => {
  it('Z slot: caret after second letter in raw "Ab1"', () => {
    expectCaret('Ab1', 'ZZZ', 2, { value: 'Ab', caret: 2 })
  })

  it('A slot: mixed alphanumeric caret at 2', () => {
    expectCaret('a1B', 'AAA', 2, { value: 'a1B', caret: 2 })
  })

  it('A slot with literal: caret jumps across dot', () => {
    expectCaret('1AB', 'AA.AA', 3, { value: '1A.B', caret: 4 })
  })

  it('pattern Z9: caret at 1 after first letter only', () => {
    expectCaret('A1', 'Z9', 1, { value: 'A1', caret: 1 })
  })
})

describe('applyMask() — caret positions (skipped characters)', () => {
  it('caret after skipped noise aligns to last matched slot before caret', () => {
    expectCaret('a1b2', '99', 2, { value: '12', caret: 1 })
  })

  it('caret at 4 with heavy skips in digit mask', () => {
    expectCaret('1x2y34', '999', 4, { value: '123', caret: 2 })
  })
})

describe('Mask class — caret after process()', () => {
  it('updates instance caret to match applyMask', () => {
    const m = buildMask('152-3', '99-99', 2)
    expect(m.process()).toBe('15-23')
    expect(m.caret).toBe(applyMask('152-3', '99-99', 2).caret)
  })

  it('caret at full length for complete CPF', () => {
    const m = buildMask('12345678901', '999.999.999-99', 14)
    expect(m.process()).toBe('123.456.789-01')
    expect(m.caret).toBe(14)
  })

  it('caret mid-string alphanumeric', () => {
    const m = buildMask('1XA-B', 'AA-AA', 2)
    expect(m.process()).toBe('1X-AB')
    expect(m.caret).toBe(2)
  })
})

describe('applyMask() — caret vs value invariants', () => {
  it('output caret is always within [0, value.length]', () => {
    const samples: [string, string, number][] = [
      ['', '999', 0],
      ['abc', '999', 0],
      ['(11) 99988-7766', '(99) 99999-9999', 15],
      ['1AB2C3D45E6F78', 'AA.AAA.AAA/AAAA-99', 14],
      ['zz1-2--3', '99-99', 8],
    ]
    for (const [val, mask, caret] of samples) {
      const r = applyMask(val, mask, caret)
      expect(r.caret).toBeGreaterThanOrEqual(0)
      expect(r.caret).toBeLessThanOrEqual(r.value.length)
    }
  })

  it('caret equals masked string length when all input indices are before caret', () => {
    const r = applyMask('1234', '99-99', 4)
    expect(r.caret).toBe(r.value.length)
  })
})
