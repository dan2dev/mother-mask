import { describe, it, expect, beforeEach } from 'vitest'
import { process, applyMask, buildMask, getMaxLength, Mask, bind } from '../src/index'

// ---------------------------------------------------------------------------
// process() — basic masking
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

  it('applies CNPJ mask (numeric)', () => {
    expect(process('12345678000195', '99.999.999/9999-99')).toBe(
      '12.345.678/0001-95',
    )
  })

  it('applies CNPJ alfanumérico mask', () => {
    expect(process('1AB2C3D45E6F78', 'AA.AAA.AAA/AAAA-99')).toBe(
      '1A.B2C.3D4/5E6F-78',
    )
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

  it('does not add trailing literals when value is incomplete', () => {
    expect(process('12', '99-99')).toBe('12')
  })

  it('truncates value that exceeds mask capacity', () => {
    expect(process('12345', '99-99')).toBe('12-34')
  })

  it('returns empty when no chars match', () => {
    expect(process('abc', '999')).toBe('')
  })

  it('returns empty for empty mask', () => {
    expect(process('123', '')).toBe('')
  })

  it('handles single-char mask', () => {
    expect(process('5', '9')).toBe('5')
  })

  it('handles mask with only literals', () => {
    expect(process('123', '---')).toBe('')
  })

  it('handles value with mixed matching and non-matching for letter slots', () => {
    expect(process('a1b2c3', 'ZZZ')).toBe('abc')
  })
})

// ---------------------------------------------------------------------------
// process() — alphanumeric `A` slot
// ---------------------------------------------------------------------------

describe('process() with alphanumeric A slot', () => {
  it('A slot accepts digits', () => {
    expect(process('123', 'AAA')).toBe('123')
  })

  it('A slot accepts letters', () => {
    expect(process('abc', 'AAA')).toBe('abc')
  })

  it('A slot accepts uppercase letters', () => {
    expect(process('ABC', 'AAA')).toBe('ABC')
  })

  it('A slot accepts mixed alphanumeric', () => {
    expect(process('a1B', 'AAA')).toBe('a1B')
  })

  it('A slot strips non-alphanumeric characters', () => {
    expect(process('a@1#B!', 'AAA')).toBe('a1B')
  })

  it('A slot with literal separators', () => {
    expect(process('1AB2C3', 'AA.AAA.A')).toBe('1A.B2C.3')
  })

  it('CNPJ alfanumérico — all digits (backward compatible)', () => {
    expect(process('12345678000195', 'AA.AAA.AAA/AAAA-99')).toBe(
      '12.345.678/0001-95',
    )
  })

  it('CNPJ alfanumérico — mixed alphanumeric', () => {
    expect(process('1AB2C3D45E6F78', 'AA.AAA.AAA/AAAA-99')).toBe(
      '1A.B2C.3D4/5E6F-78',
    )
  })

  it('CNPJ alfanumérico — all letters in alphanumeric slots', () => {
    expect(process('ABCDEFGHIJKL12', 'AA.AAA.AAA/AAAA-99')).toBe(
      'AB.CDE.FGH/IJKL-12',
    )
  })

  it('CNPJ alfanumérico — partial input', () => {
    expect(process('1AB2C', 'AA.AAA.AAA/AAAA-99')).toBe('1A.B2C')
  })

  it('CNPJ alfanumérico — strips special chars from input', () => {
    expect(process('1A.B2C.3D4/5E6F-78', 'AA.AAA.AAA/AAAA-99')).toBe(
      '1A.B2C.3D4/5E6F-78',
    )
  })

  it('mixed A and 9 slots — digits only fill both', () => {
    expect(process('1234', 'AA-99')).toBe('12-34')
  })

  it('mixed A and 9 slots — letters rejected by 9 slot', () => {
    expect(process('12AB', 'AA-99')).toBe('12')
  })

  it('mixed A and Z slots — letters only fill both', () => {
    expect(process('abcd', 'AA-ZZ')).toBe('ab-cd')
  })

  it('mixed A and Z slots — digits rejected by Z slot', () => {
    expect(process('a1b2', 'AA-ZZ')).toBe('a1-b')
  })

  it('A slot with only non-alphanumeric input → empty', () => {
    expect(process('@#$%', 'AAA')).toBe('')
  })

  it('A, 9, Z slots combined', () => {
    expect(process('a1b', 'A9Z')).toBe('a1b')
  })

  it('A, 9, Z combined — digit in Z slot skipped', () => {
    expect(process('a12', 'A9Z')).toBe('a1')
  })

  it('A, 9, Z combined — letter in 9 slot skipped, no digit available', () => {
    expect(process('abc', 'A9Z')).toBe('a')
  })

  it('single A slot with digit', () => {
    expect(process('5', 'A')).toBe('5')
  })

  it('single A slot with letter', () => {
    expect(process('x', 'A')).toBe('x')
  })

  it('single A slot with special char', () => {
    expect(process('@', 'A')).toBe('')
  })

  it('A slot truncates excess characters', () => {
    expect(process('abcd123', 'AA-AA')).toBe('ab-cd')
  })

  it('CPF/CNPJ array mask — selects CPF for 11-digit input', () => {
    const masks = ['999.999.999-99', 'AA.AAA.AAA/AAAA-99']
    expect(process('12345678901', masks)).toBe('123.456.789-01')
  })

  it('CPF/CNPJ array mask — selects CNPJ for longer input (re-masking)', () => {
    const masks = ['999.999.999-99', 'AA.AAA.AAA/AAAA-99']
    // Already-masked CNPJ value (19 chars > 14) triggers second mask
    expect(process('1A.B2C.3D4/5E6F-78', masks)).toBe('1A.B2C.3D4/5E6F-78')
  })

  it('vehicle plate mask — old format (AAA-9999)', () => {
    expect(process('ABC1234', 'ZZZ-9999')).toBe('ABC-1234')
  })

  it('vehicle plate mask — new Mercosul format (AAA9A99)', () => {
    expect(process('ABC1D23', 'ZZZ9A99')).toBe('ABC1D23')
  })
})

// ---------------------------------------------------------------------------
// process() — array masks
// ---------------------------------------------------------------------------

describe('process() with array masks', () => {
  const masks = ['999-999', '999-999-999']

  it('uses first mask when value fits within its length', () => {
    expect(process('123456', masks)).toBe('123-456')
  })

  it('uses second mask when value length exceeds first mask length', () => {
    expect(process('123-456789', masks)).toBe('123-456-789')
  })

  it('phone masks — selects longer mask for already-masked 15-char value', () => {
    const phoneMasks = ['(99) 9999-9999', '(99) 99999-9999']
    expect(process('(11) 9998-87765', phoneMasks)).toBe('(11) 99988-7765')
  })

  it('single-element array behaves like a string', () => {
    expect(process('123', ['999'])).toBe('123')
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

  it('returns 0 for empty string mask', () => {
    expect(getMaxLength('')).toBe(0)
  })

  it('returns 0 for empty array mask', () => {
    expect(getMaxLength([])).toBe(0)
  })

  it('returns correct length for alphanumeric mask', () => {
    expect(getMaxLength('AA.AAA.AAA/AAAA-99')).toBe(18)
  })

  it('returns max for CPF/CNPJ array mask', () => {
    expect(getMaxLength(['999.999.999-99', 'AA.AAA.AAA/AAAA-99'])).toBe(18)
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
    expect(buildMask('12345678901', '999.999.999-99').process()).toBe(
      '123.456.789-01',
    )
  })

  it('caret is updated after process()', () => {
    const m = buildMask('123', '999-999', 3)
    m.process()
    // "123" fills the first 3 slots; the '-' is not flushed (no 4th digit)
    expect(m.caret).toBe(3)
  })

  it('caret jumps past literal when next digit triggers flush', () => {
    const m = buildMask('1234', '999-999', 4)
    m.process()
    // "1234" → "123-4", caret moves past '-'
    expect(m.caret).toBe(5)
  })

  it('resolves array mask before creating Mask', () => {
    const m = buildMask('12345678', ['999-999', '999-999-999'])
    expect(m.process()).toBe('123-456-78')
  })

  it('processes CNPJ alfanumérico via Mask instance', () => {
    expect(buildMask('1AB2C3D45E6F78', 'AA.AAA.AAA/AAAA-99').process()).toBe(
      '1A.B2C.3D4/5E6F-78',
    )
  })

  it('caret with A slot — jumps past literal', () => {
    const m = buildMask('1AB', 'AA-AA', 3)
    m.process()
    expect(m.caret).toBe(4) // "1A-B"
  })

  it('resolves CPF/CNPJ array mask to CNPJ for long alphanumeric', () => {
    const m = buildMask('1A.B2C.3D4/5E6F-78', ['999.999.999-99', 'AA.AAA.AAA/AAAA-99'])
    expect(m.process()).toBe('1A.B2C.3D4/5E6F-78')
  })
})

// ---------------------------------------------------------------------------
// applyMask() — caret tracking
// ---------------------------------------------------------------------------

describe('applyMask() — caret tracking', () => {
  // -- Empty / trivial cases ------------------------------------------------

  it('empty value → caret 0', () => {
    const r = applyMask('', '999', 0)
    expect(r).toEqual({ value: '', caret: 0 })
  })

  it('empty value with non-zero caret → caret 0', () => {
    const r = applyMask('', '999', 5)
    expect(r).toEqual({ value: '', caret: 0 })
  })

  // -- Typing at the end (most common) -------------------------------------

  it('first digit into phone mask', () => {
    // User types '1' → value="1", caret=1
    const r = applyMask('1', '(99) 99999-9999', 1)
    expect(r.value).toBe('(1')
    expect(r.caret).toBe(2)
  })

  it('second digit into phone mask', () => {
    // Displayed "(1", user types '2' → value="(12", caret=3
    const r = applyMask('(12', '(99) 99999-9999', 3)
    expect(r.value).toBe('(12')
    expect(r.caret).toBe(3)
  })

  it('third digit triggers ") " literals', () => {
    // Displayed "(12", user types '3' → value="(123", caret=4
    const r = applyMask('(123', '(99) 99999-9999', 4)
    expect(r.value).toBe('(12) 3')
    expect(r.caret).toBe(6)
  })

  it('typing digit into simple mask with separator', () => {
    // value="12345", caret=5, mask="99.999"
    const r = applyMask('12345', '99.999', 5)
    expect(r.value).toBe('12.345')
    expect(r.caret).toBe(6)
  })

  it('caret at end of fully-filled mask', () => {
    const r = applyMask('12345', '99-99-9', 5)
    expect(r.value).toBe('12-34-5')
    expect(r.caret).toBe(7)
  })

  it('caret past the end of input', () => {
    const r = applyMask('12', '99-99', 999)
    expect(r.value).toBe('12')
    expect(r.caret).toBe(2)
  })

  // -- Typing in the middle ------------------------------------------------

  it('insert in the middle — no literal between insertion and caret', () => {
    // "12" → insert '5' at pos 1 → "152", caret=2, mask "999"
    const r = applyMask('152', '999', 2)
    expect(r.value).toBe('152')
    expect(r.caret).toBe(2)
  })

  it('insert in the middle — literal after insertion point', () => {
    // "12-3" → insert '5' between '1' and '2' → "152-3", caret=2
    const r = applyMask('152-3', '99-99', 2)
    expect(r.value).toBe('15-23')
    expect(r.caret).toBe(2) // after "15", NOT after "15-"
  })

  it('insert in the middle of longer mask', () => {
    // "12-34-5" → insert '5' at pos 1 → "152-34-5", caret=2
    const r = applyMask('152-34-5', '99-99-99', 2)
    expect(r.value).toBe('15-23-45')
    expect(r.caret).toBe(2)
  })

  it('insert at position 0 with leading literal', () => {
    // User types '5' at the very start of "(11) 999"
    // value="5(11) 999", caret=1
    const r = applyMask('5(11) 999', '(99) 99999-9999', 1)
    expect(r.value).toBe('(51) 1999')
    expect(r.caret).toBe(2) // after "(5"
  })

  it('insert after leading literal', () => {
    // User clicks after '(' in "(12) 3" and types '5'
    // Browser inserts at pos 1: "(512) 3", caret=2
    const r = applyMask('(512) 3', '(99) 99999-9999', 2)
    expect(r.value).toBe('(51) 23')
    expect(r.caret).toBe(2)
  })

  // -- Caret at position 0 ------------------------------------------------

  it('caret 0 stays at 0', () => {
    const r = applyMask('123', '999', 0)
    expect(r.value).toBe('123')
    expect(r.caret).toBe(0)
  })

  it('caret 0 with leading literal', () => {
    const r = applyMask('1', '(99)', 0)
    expect(r.value).toBe('(1')
    expect(r.caret).toBe(0)
  })

  // -- Non-matching characters before caret --------------------------------

  it('skipped chars before caret do not inflate output caret', () => {
    // "a1b2", caret=2, mask "99" → 'a' skipped, '1' matched
    // rawBeforeCaret: only 'a' (skip) and '1' (match) are before pos 2
    const r = applyMask('a1b2', '99', 2)
    expect(r.value).toBe('12')
    expect(r.caret).toBe(1) // after '1'
  })

  it('all chars before caret skipped → caret 0', () => {
    // "ab1", caret=1, mask "99" → 'a' is before caret, skipped
    const r = applyMask('ab1', '99', 1)
    expect(r.value).toBe('1')
    expect(r.caret).toBe(0)
  })

  it('multiple skipped chars before caret', () => {
    // "ab1", caret=2, mask "99" → 'a','b' before caret, both skipped
    const r = applyMask('ab1', '99', 2)
    expect(r.value).toBe('1')
    expect(r.caret).toBe(0)
  })

  it('caret between matched and skipped', () => {
    // "1a2", caret=2, mask "99" → '1' matched (pos 0 < 2), 'a' skipped (pos 1 < 2)
    const r = applyMask('1a2', '99', 2)
    expect(r.value).toBe('12')
    expect(r.caret).toBe(1) // after '1'
  })

  it('value has only non-matching chars → empty output, caret 0', () => {
    const r = applyMask('abc', '999', 3)
    expect(r).toEqual({ value: '', caret: 0 })
  })

  // -- Multiple consecutive literals ----------------------------------------

  it('two leading literals', () => {
    // mask "((99))", user types '1' → value="1", caret=1
    const r = applyMask('1', '((99))', 1)
    expect(r.value).toBe('((1')
    expect(r.caret).toBe(3)
  })

  it('three leading literals', () => {
    const r = applyMask('1', '(((9)))', 1)
    expect(r.value).toBe('(((1')
    expect(r.caret).toBe(4)
  })

  // -- Mixed digit / letter masks ------------------------------------------

  it('mixed mask Z9Z9', () => {
    const r = applyMask('A1B2', 'Z9Z9', 4)
    expect(r.value).toBe('A1B2')
    expect(r.caret).toBe(4)
  })

  it('mixed mask with literal separator', () => {
    // "A-1" with mask "Z-9", caret=3 (end)
    const r = applyMask('A-1', 'Z-9', 3)
    expect(r.value).toBe('A-1')
    expect(r.caret).toBe(3)
  })

  it('letter typed where digit expected is skipped', () => {
    const r = applyMask('a', '999', 1)
    expect(r).toEqual({ value: '', caret: 0 })
  })

  it('digit typed where letter expected is skipped', () => {
    const r = applyMask('1', 'ZZZ', 1)
    expect(r).toEqual({ value: '', caret: 0 })
  })

  // -- Realistic phone-mask typing sequence ---------------------------------

  it('phone mask — full typing sequence', () => {
    const mask = '(99) 99999-9999'

    // Type '1'
    expect(applyMask('1', mask, 1)).toEqual({ value: '(1', caret: 2 })
    // Type '1' → "(11"
    expect(applyMask('(11', mask, 3)).toEqual({ value: '(11', caret: 3 })
    // Type '9' → "(119"
    expect(applyMask('(119', mask, 4)).toEqual({ value: '(11) 9', caret: 6 })
    // Type '9' → "(11) 99"
    expect(applyMask('(11) 99', mask, 7)).toEqual({
      value: '(11) 99',
      caret: 7,
    })
    // Fill rest: "(11) 99988-7766"
    expect(applyMask('(11) 99988-7766', mask, 15)).toEqual({
      value: '(11) 99988-7766',
      caret: 15,
    })
  })

  // -- Alphanumeric A slot caret tracking ------------------------------------

  it('A slot — typing digit at end', () => {
    const r = applyMask('1', 'AA-AA', 1)
    expect(r.value).toBe('1')
    expect(r.caret).toBe(1)
  })

  it('A slot — typing letter at end', () => {
    const r = applyMask('1A', 'AA-AA', 2)
    expect(r.value).toBe('1A')
    expect(r.caret).toBe(2)
  })

  it('A slot — third char triggers literal separator', () => {
    const r = applyMask('1AB', 'AA-AA', 3)
    expect(r.value).toBe('1A-B')
    expect(r.caret).toBe(4)
  })

  it('A slot — insert in middle with literal', () => {
    // "1A-B" → insert 'X' between '1' and 'A' → "1XA-B", caret=2
    const r = applyMask('1XA-B', 'AA-AA', 2)
    expect(r.value).toBe('1X-AB')
    expect(r.caret).toBe(2)
  })

  it('A slot — non-alphanumeric skipped, caret unaffected', () => {
    // "@1A" with caret=1 → '@' before caret is skipped
    const r = applyMask('@1A', 'AA', 1)
    expect(r.value).toBe('1A')
    expect(r.caret).toBe(0)
  })

  it('CNPJ alfanumérico — full typing sequence', () => {
    const mask = 'AA.AAA.AAA/AAAA-99'

    // Type '1'
    expect(applyMask('1', mask, 1)).toEqual({ value: '1', caret: 1 })
    // Type 'A' → "1A"
    expect(applyMask('1A', mask, 2)).toEqual({ value: '1A', caret: 2 })
    // Type 'B' → "1AB", literal '.' appears
    expect(applyMask('1AB', mask, 3)).toEqual({ value: '1A.B', caret: 4 })
    // Type '2' → "1A.B2"
    expect(applyMask('1A.B2', mask, 5)).toEqual({ value: '1A.B2', caret: 5 })
    // Fill rest: "1A.B2C.3D4/5E6F-78" (18 chars = mask length)
    expect(applyMask('1A.B2C.3D4/5E6F-78', mask, 19)).toEqual({
      value: '1A.B2C.3D4/5E6F-78',
      caret: 18,
    })
  })

  it('CNPJ alfanumérico — caret past digits-only check digits', () => {
    const mask = 'AA.AAA.AAA/AAAA-99'
    // Last two slots are '9' — letter should be rejected
    // "1AB2C3D45E6FAB" → check digit slots expect digits, 'A','B' skipped
    const r = applyMask('1AB2C3D45E6FAB', mask, 14)
    expect(r.value).toBe('1A.B2C.3D4/5E6F')
    expect(r.caret).toBe(15)
  })

  // -- CPF mask typing sequence ---------------------------------------------

  it('CPF mask — typing sequence', () => {
    const mask = '999.999.999-99'

    expect(applyMask('1', mask, 1)).toEqual({ value: '1', caret: 1 })
    expect(applyMask('12', mask, 2)).toEqual({ value: '12', caret: 2 })
    expect(applyMask('123', mask, 3)).toEqual({ value: '123', caret: 3 })
    // Type '4' → "1234", literal '.' appears
    expect(applyMask('1234', mask, 4)).toEqual({
      value: '123.4',
      caret: 5,
    })
    expect(applyMask('123.456', mask, 7)).toEqual({
      value: '123.456',
      caret: 7,
    })
    // Type '7' → "123.4567", second '.' appears
    expect(applyMask('123.4567', mask, 8)).toEqual({
      value: '123.456.7',
      caret: 9,
    })
  })
})

// ---------------------------------------------------------------------------
// applyMask() — value output (complements process() tests)
// ---------------------------------------------------------------------------

describe('applyMask() — value output', () => {
  it('produces same result as process()', () => {
    const cases: [string, string][] = [
      ['11999887766', '(99) 99999-9999'],
      ['12345678901', '999.999.999-99'],
      ['01012024', '99/99/9999'],
      ['abc123', '999'],
      ['A1B2', 'Z9Z9'],
      ['1AB2C3D45E6F78', 'AA.AAA.AAA/AAAA-99'],
      ['a1B', 'AAA'],
    ]
    for (const [value, mask] of cases) {
      expect(applyMask(value, mask).value).toBe(process(value, mask))
    }
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

  it('sets autocorrect="off"', () => {
    bind(input, '999')
    expect(input.getAttribute('autocorrect')).toBe('off')
  })

  it('sets autocapitalize="off"', () => {
    bind(input, '999')
    expect(input.getAttribute('autocapitalize')).toBe('off')
  })

  it('sets spellcheck="false"', () => {
    bind(input, '999')
    expect(input.getAttribute('spellcheck')).toBe('false')
  })

  it('sets data-masked to pipe-joined string for array masks', () => {
    bind(input, ['(99) 9999-9999', '(99) 99999-9999'])
    expect(input.getAttribute('data-masked')).toBe(
      '(99) 9999-9999|(99) 99999-9999',
    )
  })

  it('sets maxlength to the longest mask when using array masks', () => {
    bind(input, ['(99) 9999-9999', '(99) 99999-9999'])
    expect(input.getAttribute('maxlength')).toBe('15')
  })
})
