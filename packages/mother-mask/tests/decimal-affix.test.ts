import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  applyDecimalMask,
  bindDecimal,
  processDecimal,
  unmaskDecimal,
} from '../src/index'
import { relocateAffixInsertion, resolveDecimalOptions } from '../src/decimal-mask'
import type { DecimalMaskOptions } from '../src/index'

// ---------------------------------------------------------------------------
// The prefix and suffix are chrome, not content. Wherever the caret is parked
// inside them, typing has to behave as if it were at the nearest edge of the
// number, and their text must never be read as part of the number.
//
// Reported case: with `{ prefix: '$', decimalPlaces: 2 }` showing "$0.00",
// clicking at the far left and typing "2" produced "$20.00", while typing at
// the visually identical spot one character to the right produced "$2.00".
// ---------------------------------------------------------------------------

const USD: DecimalMaskOptions = { prefix: '$', decimalPlaces: 2 }
const BRL: DecimalMaskOptions = { prefix: 'R$ ', decimalPlaces: 2 }
const SIGNED: DecimalMaskOptions = { prefix: '$', decimalPlaces: 2, allowNegative: true }
const SUFFIXED: DecimalMaskOptions = { suffix: ' USD', decimalPlaces: 2 }
const WRAPPED: DecimalMaskOptions = { prefix: '$', suffix: ' USD', decimalPlaces: 2 }

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function setupInput(options: DecimalMaskOptions, initial: string): HTMLInputElement {
  const input = document.createElement('input')
  document.body.appendChild(input)
  bindDecimal(input, options)
  input.value = initial
  return input
}

/** Type one character at `at`, exactly as a browser would, then fire `input`. */
function typeAt(input: HTMLInputElement, ch: string, at: number): void {
  input.setSelectionRange(at, at)
  input.value = input.value.slice(0, at) + ch + input.value.slice(at)
  input.setSelectionRange(at + ch.length, at + ch.length)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }))
}

function del(
  input: HTMLInputElement,
  at: number,
  kind: 'deleteContentBackward' | 'deleteContentForward',
): void {
  input.setSelectionRange(at, at)
  if (kind === 'deleteContentBackward') {
    if (at === 0) return
    input.value = input.value.slice(0, at - 1) + input.value.slice(at)
    input.setSelectionRange(at - 1, at - 1)
  } else {
    input.value = input.value.slice(0, at) + input.value.slice(at + 1)
    input.setSelectionRange(at, at)
  }
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: kind }))
}

/** Value with the caret marked, so a failure reads like what the user sees. */
function withCaret(input: HTMLInputElement): string {
  const c = input.selectionStart ?? 0
  return `${input.value.slice(0, c)}|${input.value.slice(c)}`
}

/** Type `ch` at every caret position in `range`, returning one marked string per position. */
function typeAtEach(
  options: DecimalMaskOptions,
  initial: string,
  ch: string,
  range: number[],
): string[] {
  return range.map((at) => {
    const input = setupInput(options, initial)
    typeAt(input, ch, at)
    const out = withCaret(input)
    input.remove()
    return out
  })
}

// ---------------------------------------------------------------------------
// The reported regression
// ---------------------------------------------------------------------------

describe('the reported regression — typing with the caret at the far left', () => {
  it('replaces the placeholder zero instead of stacking a digit in front of it', () => {
    const input = setupInput(SIGNED, '$0.00')
    typeAt(input, '2', 0)
    expect(withCaret(input)).toBe('$2|.00')
    input.remove()
  })

  it('behaves identically from every caret position the prefix covers', () => {
    // "|$0.00", "$|0.00" and "$0|.00" all read as "the start of the number".
    expect(typeAtEach(SIGNED, '$0.00', '2', [0, 1, 2])).toEqual(['$2|.00', '$2|.00', '$2|.00'])
  })

  it('does the same across a multi-character prefix', () => {
    expect(typeAtEach(BRL, 'R$ 0.00', '2', [0, 1, 2, 3, 4])).toEqual([
      'R$ 2|.00',
      'R$ 2|.00',
      'R$ 2|.00',
      'R$ 2|.00',
      'R$ 2|.00',
    ])
  })

  it('does the same across a sign and a prefix together', () => {
    expect(typeAtEach(SIGNED, '-$0.00', '2', [0, 1, 2, 3])).toEqual([
      '-$2|.00',
      '-$2|.00',
      '-$2|.00',
      '-$2|.00',
    ])
  })

  it('keeps typing correctly from the far left through a whole amount', () => {
    const input = setupInput(SIGNED, '$0.00')
    typeAt(input, '2', 0)
    expect(withCaret(input)).toBe('$2|.00')
    for (const ch of '50') typeAt(input, ch, input.selectionStart ?? 0)
    expect(withCaret(input)).toBe('$250|.00')
    input.remove()
  })
})

// ---------------------------------------------------------------------------
// Prefix / suffix inert to typing
// ---------------------------------------------------------------------------

describe('prefix and suffix are inert to typing', () => {
  it('routes a digit typed inside the prefix to the front of an existing amount', () => {
    expect(typeAtEach(USD, '$1,234.56', '2', [0, 1])).toEqual([
      '$2|1,234.56',
      '$2|1,234.56',
    ])
  })

  it('routes a digit typed inside or past the suffix to the end of the number', () => {
    // decimalPlaces: 2 — the fraction is already full, so the digit is dropped
    // and the caret settles at the number's end rather than inside " USD".
    expect(typeAtEach(SUFFIXED, '0.00 USD', '2', [4, 5, 6, 7, 8])).toEqual([
      '0.00| USD',
      '0.00| USD',
      '0.00| USD',
      '0.00| USD',
      '0.00| USD',
    ])
  })

  it('lands the digit in the fraction when the suffix hides free space', () => {
    const free: DecimalMaskOptions = { suffix: ' kg' }
    expect(typeAtEach(free, '1.5 kg', '7', [3, 4, 5, 6])).toEqual([
      '1.57| kg',
      '1.57| kg',
      '1.57| kg',
      '1.57| kg',
    ])
  })

  it('handles a prefix and a suffix at once', () => {
    expect(typeAtEach(WRAPPED, '$0.00 USD', '2', [0, 1, 2])).toEqual([
      '$2|.00 USD',
      '$2|.00 USD',
      '$2|.00 USD',
    ])
    expect(typeAtEach(WRAPPED, '$0.00 USD', '2', [5, 6, 7, 8, 9])).toEqual([
      '$0.00| USD',
      '$0.00| USD',
      '$0.00| USD',
      '$0.00| USD',
      '$0.00| USD',
    ])
  })

  it('replaces a padding zero from inside the prefix too', () => {
    const padded: DecimalMaskOptions = { numberPlaces: 2, decimalPlaces: 0, prefix: 'T' }
    expect(typeAtEach(padded, 'T00', '5', [0, 1])).toEqual(['T05|', 'T05|'])
  })

  it('opens the fraction at the number start when the separator is typed in the prefix', () => {
    // A separator inserted at the front of "12" reads as ".12" — the same
    // thing it means typed one position right, which is the point.
    const free: DecimalMaskOptions = { prefix: '$' }
    expect(typeAtEach(free, '$12', '.', [0, 1])).toEqual(['$0.|12', '$0.|12'])
  })

  it('normalizes a comma typed inside the prefix to the configured separator', () => {
    const free: DecimalMaskOptions = { prefix: '$', decimalSeparator: '.' }
    expect(typeAtEach(free, '$12', ',', [0, 1])).toEqual(['$0.|12', '$0.|12'])
  })

  it('still flags the value negative when "-" is typed inside the prefix', () => {
    // The sign applies to the whole value; the caret settles at the start of
    // the digits, where the character was actually aimed.
    expect(typeAtEach(SIGNED, '$12.34', '-', [0, 1])).toEqual(['-$|12.34', '-$|12.34'])
  })

  it('drops a non-numeric character typed inside the prefix without disturbing the value', () => {
    expect(typeAtEach(USD, '$0.00', 'x', [0, 1])).toEqual(['$|0.00', '$|0.00'])
  })

  it('leaves a field with no affixes exactly as it was', () => {
    const plain: DecimalMaskOptions = { decimalPlaces: 2 }
    expect(typeAtEach(plain, '0.00', '2', [0, 1, 2, 3, 4])).toEqual([
      '2|.00',
      '2|.00',
      '0.2|0',
      '0.02|',
      '0.00|',
    ])
  })
})

// ---------------------------------------------------------------------------
// Affix text is never read as part of the number
// ---------------------------------------------------------------------------

describe('affix text never contributes to the number', () => {
  const affixes: [string, DecimalMaskOptions][] = [
    ['prefix holding a digit', { prefix: 'Q1 ', decimalPlaces: 2 }],
    ['prefix holding the separator', { prefix: 'No. ', decimalPlaces: 2 }],
    ['suffix holding a digit', { suffix: ' m2', decimalPlaces: 2 }],
    ['suffix holding a digit, free fraction', { suffix: ' m2' }],
    ['suffix holding the separator', { suffix: ' etc.', decimalPlaces: 2 }],
    ['prefix beginning with a minus', { prefix: '-x', decimalPlaces: 2, allowNegative: true }],
    ['both, digits everywhere', { prefix: 'A1', suffix: 'B2', decimalPlaces: 2 }],
  ]

  for (const [label, options] of affixes) {
    it(`${label} — re-masking is a fixed point`, () => {
      // bindDecimal re-masks its own output on every keystroke, so a value that
      // doesn't re-mask to itself makes the number drift as the user types.
      const once = processDecimal('1234', options)
      expect(processDecimal(once, options)).toBe(once)
      expect(processDecimal(processDecimal(once, options), options)).toBe(once)
    })

    it(`${label} — unmasks to the number the user entered`, () => {
      expect(unmaskDecimal(processDecimal('1234', options), options)).toBe(1234)
    })
  }

  it('keeps a negative value stable when the prefix itself starts with a minus', () => {
    const options: DecimalMaskOptions = { prefix: '-x', decimalPlaces: 2, allowNegative: true }
    const negative = processDecimal('-1234', options)
    expect(negative).toBe('--x1,234.00')
    expect(processDecimal(negative, options)).toBe(negative)
    expect(unmaskDecimal(negative, options)).toBe(-1234)
  })

  it('does not let a digit-bearing prefix inflate the value keystroke after keystroke', () => {
    const options: DecimalMaskOptions = { prefix: 'Q1 ', decimalPlaces: 2 }
    const input = setupInput(options, 'Q1 0.00')
    // First keystroke at the far left — the reported gesture — then carry on
    // from wherever the caret settles.
    typeAt(input, '1', 0)
    for (const ch of '234') typeAt(input, ch, input.selectionStart ?? 0)
    expect(input.value).toBe('Q1 1,234.00')
    expect(unmaskDecimal(input.value, options)).toBe(1234)
    input.remove()
  })
})

// ---------------------------------------------------------------------------
// The caret never comes to rest inside the chrome
// ---------------------------------------------------------------------------

describe('the caret always settles inside the number', () => {
  const cases: [string, DecimalMaskOptions, string][] = [
    ['prefix', USD, '$1,234.56'],
    ['multi-char prefix', BRL, 'R$ 1,234.56'],
    ['suffix', SUFFIXED, '1,234.56 USD'],
    ['both', WRAPPED, '$1,234.56 USD'],
    ['sign and prefix', SIGNED, '-$1,234.56'],
  ]

  for (const [label, options, initial] of cases) {
    it(label, () => {
      const opts = resolveDecimalOptions(options)
      for (let at = 0; at <= initial.length; at++) {
        for (const ch of ['7', 'x', '.']) {
          const input = setupInput(options, initial)
          typeAt(input, ch, at)
          const value = input.value
          const caret = input.selectionStart ?? 0
          const sign = value.startsWith('-') && !value.startsWith(opts.prefix) ? 1 : 0
          const low = sign + opts.prefix.length
          const high = value.length - opts.suffix.length
          expect({ at, ch, caret, low, high, ok: caret >= low && caret <= high }).toEqual({
            at,
            ch,
            caret,
            low,
            high,
            ok: true,
          })
          input.remove()
        }
      }
    })
  }

  it('keeps the affixes themselves intact no matter where the character lands', () => {
    for (let at = 0; at <= '$1,234.56 USD'.length; at++) {
      for (const ch of ['7', 'x', '.', '-']) {
        const input = setupInput(WRAPPED, '$1,234.56 USD')
        typeAt(input, ch, at)
        expect({ at, ch, value: input.value }).toEqual({
          at,
          ch,
          value: expect.stringMatching(/^\$[\d,]+(\.\d*)? USD$/),
        })
        input.remove()
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Deleting is unchanged — this fix only moves *inserted* characters
// ---------------------------------------------------------------------------

describe('deleting around the affixes', () => {
  it('backspace right after the prefix removes nothing and restores the prefix', () => {
    const input = setupInput(USD, '$1,234.56')
    del(input, 1, 'deleteContentBackward')
    expect(withCaret(input)).toBe('$|1,234.56')
    input.remove()
  })

  it('forward-delete at the far left removes nothing and restores the prefix', () => {
    const input = setupInput(USD, '$1,234.56')
    del(input, 0, 'deleteContentForward')
    expect(withCaret(input)).toBe('$|1,234.56')
    input.remove()
  })

  it('backspace inside the suffix leaves the number alone', () => {
    const input = setupInput(SUFFIXED, '1,234.56 USD')
    del(input, 12, 'deleteContentBackward')
    expect(input.value).toBe('1,234.56 USD')
    input.remove()
  })

  it('backspace on a digit still deletes that digit', () => {
    const input = setupInput(USD, '$1,234.56')
    del(input, 2, 'deleteContentBackward')
    expect(withCaret(input)).toBe('$|234.56')
    input.remove()
  })
})

// ---------------------------------------------------------------------------
// relocateAffixInsertion in isolation
// ---------------------------------------------------------------------------

describe('relocateAffixInsertion()', () => {
  it('moves a character typed before the prefix to the front of the number', () => {
    expect(relocateAffixInsertion('2$0.00', 1, 1, USD)).toEqual({ value: '$20.00', caret: 2 })
  })

  it('moves a character typed inside a multi-character prefix', () => {
    expect(relocateAffixInsertion('R2$ 0.00', 2, 1, BRL)).toEqual({ value: 'R$ 20.00', caret: 4 })
  })

  it('moves a character typed past the suffix back to the end of the number', () => {
    expect(relocateAffixInsertion('0.00 USD2', 9, 1, SUFFIXED)).toEqual({
      value: '0.002 USD',
      caret: 5,
    })
  })

  it('accounts for a leading sign when finding the front of the number', () => {
    expect(relocateAffixInsertion('2-$0.00', 1, 1, SIGNED)).toEqual({
      value: '-$20.00',
      caret: 3,
    })
  })

  it('returns null when the character already landed inside the number', () => {
    expect(relocateAffixInsertion('$20.00', 2, 1, USD)).toBeNull()
    expect(relocateAffixInsertion('$0.002', 6, 1, USD)).toBeNull()
  })

  it('returns null when there are no affixes to be inert', () => {
    expect(relocateAffixInsertion('20.00', 1, 1, { decimalPlaces: 2 })).toBeNull()
  })

  it('returns null for a non-insertion', () => {
    expect(relocateAffixInsertion('$0.00', 3, 0, USD)).toBeNull()
    expect(relocateAffixInsertion('$0.00', 0, 1, USD)).toBeNull()
    expect(relocateAffixInsertion('$0.00', 99, 1, USD)).toBeNull()
  })

  it('moves whatever now occupies the span, not the key originally pressed', () => {
    // A "," already normalized to "." in place still relocates correctly.
    expect(relocateAffixInsertion('.$12', 1, 1, { prefix: '$' })).toEqual({
      value: '$.12',
      caret: 2,
    })
  })

  it('leaves a partly deleted prefix alone rather than guessing', () => {
    // "R$ " with the "R" gone — nothing is peeled, so nothing is relocated and
    // the ordinary noise-dropping path handles it.
    expect(relocateAffixInsertion('2$ 0.00', 1, 1, BRL)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Property sweep
// ---------------------------------------------------------------------------

describe('typing anywhere in the chrome equals typing at the number edge', () => {
  const configs: [string, DecimalMaskOptions, string][] = [
    ['prefix, placeholder', USD, '$0.00'],
    ['prefix, amount', USD, '$1,234.56'],
    ['multi-char prefix', BRL, 'R$ 98.70'],
    ['sign and prefix', SIGNED, '-$45.00'],
    ['suffix', SUFFIXED, '12.30 USD'],
    ['both', WRAPPED, '$7.00 USD'],
    ['free fraction, suffix', { suffix: ' kg' }, '2.5 kg'],
    ['padded integer, prefix', { numberPlaces: 3, decimalPlaces: 0, prefix: '#' }, '#007'],
  ]

  for (const [label, options, initial] of configs) {
    it(label, () => {
      const opts = resolveDecimalOptions(options)
      const sign = initial.startsWith('-') && !initial.startsWith(opts.prefix) ? 1 : 0
      const numberStart = sign + opts.prefix.length
      const numberEnd = initial.length - opts.suffix.length

      for (const ch of ['7', '0', '.', '-', 'x']) {
        const atStart = typeAtEach(options, initial, ch, [numberStart])[0]
        for (let at = 0; at < numberStart; at++) {
          expect({ ch, at, out: typeAtEach(options, initial, ch, [at])[0] }).toEqual({
            ch,
            at,
            out: atStart,
          })
        }

        const atEnd = typeAtEach(options, initial, ch, [numberEnd])[0]
        for (let at = numberEnd + 1; at <= initial.length; at++) {
          expect({ ch, at, out: typeAtEach(options, initial, ch, [at])[0] }).toEqual({
            ch,
            at,
            out: atEnd,
          })
        }
      }
    })
  }

  it('every reachable state re-masks to itself', () => {
    for (const [, options, initial] of configs) {
      for (let at = 0; at <= initial.length; at++) {
        for (const ch of ['7', '.', '-', 'x']) {
          const input = setupInput(options, initial)
          typeAt(input, ch, at)
          const settled = input.value
          input.remove()
          expect({ initial, at, ch, again: processDecimal(settled, options) }).toEqual({
            initial,
            at,
            ch,
            again: settled,
          })
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Pure-layer caret resolution
// ---------------------------------------------------------------------------

describe('applyDecimalMask() resolves a caret parked in the chrome', () => {
  let input: HTMLInputElement
  beforeEach(() => {
    input = document.createElement('input')
  })
  afterEach(() => {
    input.remove()
  })

  it('pulls a caret inside the prefix out to the number start', () => {
    expect(applyDecimalMask('$1,234.56', 0, USD).caret).toBe(1)
    expect(applyDecimalMask('R$ 1,234.56', 1, BRL).caret).toBe(3)
  })

  it('pulls a caret inside the suffix back to the number end', () => {
    expect(applyDecimalMask('1,234.56 USD', 12, SUFFIXED).caret).toBe(8)
    expect(applyDecimalMask('1,234.56 USD', 10, SUFFIXED).caret).toBe(8)
  })

  it('leaves a caret already inside the number where it is', () => {
    expect(applyDecimalMask('$1,234.56', 4, USD).caret).toBe(4)
    expect(applyDecimalMask('$1,234.56', 9, USD).caret).toBe(9)
  })
})
