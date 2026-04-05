import { describe, it, expect, beforeEach } from 'vitest'
import { process, buildMask, getMaxLength, Mask, bind } from '../src/index'

// ---------------------------------------------------------------------------
// process()
// ---------------------------------------------------------------------------

describe('process()', () => {
  it('returns empty string for empty value', () => {
    expect(process('', '(99) 99999-9999')).toBe('')
  })

  it('applies phone mask — 9 = digit', () => {
    expect(process('11999887766', '(99) 99999-9999')).toBe('(11) 99988-7766')
  })

  it('applies CPF mask', () => {
    expect(process('12345678901', '999.999.999-99')).toBe('123.456.789-01')
  })

  it('applies CNPJ mask', () => {
    expect(process('12345678000195', '99.999.999/9999-99')).toBe('12.345.678/0001-95')
  })

  it('applies date mask', () => {
    expect(process('01012024', '99/99/9999')).toBe('01/01/2024')
  })

  it('applies CEP mask', () => {
    expect(process('01310100', '99999-999')).toBe('01310-100')
  })

  it('strips non-digit chars when mask expects digits', () => {
    expect(process('abc123', '999')).toBe('123')
  })

  it('applies letter mask — Z = letter', () => {
    expect(process('hello world', 'ZZZ')).toBe('hel')
  })

  it('strips digits when mask expects letters', () => {
    expect(process('h3ll0', 'ZZZ')).toBe('hll')
  })

  it('applies mixed digit/letter mask', () => {
    expect(process('A1B2', 'Z9Z9')).toBe('A1B2')
  })

  it('handles partial value shorter than mask', () => {
    expect(process('123', '999-999')).toBe('123')
  })

  it('inserts literal separator correctly', () => {
    expect(process('12345', '99.999')).toBe('12.345')
  })
})

// ---------------------------------------------------------------------------
// process() — array masks
// ---------------------------------------------------------------------------

describe('process() with array masks', () => {
  // Mask selection compares value.length against each mask string's total length
  // (including literal chars like '(', ')', '-'). This means array masks work
  // naturally in the bind() context where value is already masked.
  const masks = ['999-999', '999-999-999']
  //              ^ 7 chars    ^ 11 chars

  it('uses first mask when value fits within its length', () => {
    expect(process('123456', masks)).toBe('123-456') // len 6 ≤ 7
  })

  it('uses second mask when value length exceeds first mask length', () => {
    expect(process('123-456789', masks)).toBe('123-456-789') // len 10 > 7
  })

  it('phone masks — selects longer mask for already-masked 15-char value', () => {
    const phoneMasks = ['(99) 9999-9999', '(99) 99999-9999']
    // value.length 15 > mask[0].length 14 → switches to mask[1]
    expect(process('(11) 9998-87765', phoneMasks)).toBe('(11) 99988-7765')
  })
})

// ---------------------------------------------------------------------------
// getMaxLength()
// ---------------------------------------------------------------------------

describe('getMaxLength()', () => {
  it('returns mask length for string mask', () => {
    expect(getMaxLength('999-999')).toBe(7)
  })

  it('returns max length for array mask', () => {
    expect(getMaxLength(['(99) 9999-9999', '(99) 99999-9999'])).toBe(15)
  })
})

// ---------------------------------------------------------------------------
// buildMask() / Mask class
// ---------------------------------------------------------------------------

describe('buildMask()', () => {
  it('returns a Mask instance', () => {
    expect(buildMask('123', '999')).toBeInstanceOf(Mask)
  })

  it('processes correctly via instance', () => {
    expect(buildMask('12345678901', '999.999.999-99').process()).toBe('123.456.789-01')
  })

  it('caret is updated after process()', () => {
    const m = buildMask('123', '999-999', 3)
    m.process()
    expect(m.caret).toBeGreaterThanOrEqual(3)
  })
})

// ---------------------------------------------------------------------------
// bind() — DOM integration (jsdom)
// ---------------------------------------------------------------------------

describe('bind()', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = document.createElement('input')
    document.body.appendChild(input)
  })

  it('sets data-masked attribute on first call', () => {
    bind(input, '999.999.999-99')
    expect(input.getAttribute('data-masked')).toBe('999.999.999-99')
  })

  it('is idempotent — does not re-bind an already-bound element', () => {
    bind(input, '999')
    bind(input, '999')
    expect(input.getAttribute('data-masked')).toBe('999')
  })

  it('sets maxlength attribute', () => {
    bind(input, '999-999')
    expect(input.getAttribute('maxlength')).toBe('7')
  })

  it('sets autocomplete="off"', () => {
    bind(input, '99/99/9999')
    expect(input.getAttribute('autocomplete')).toBe('off')
  })

  it('sets data-masked to pipe-joined string for array masks', () => {
    bind(input, ['(99) 9999-9999', '(99) 99999-9999'])
    expect(input.getAttribute('data-masked')).toBe('(99) 9999-9999|(99) 99999-9999')
  })

  it('sets maxlength to the longest mask when using array masks', () => {
    bind(input, ['(99) 9999-9999', '(99) 99999-9999'])
    expect(input.getAttribute('maxlength')).toBe('15')
  })
})
