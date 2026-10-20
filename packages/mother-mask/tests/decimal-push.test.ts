import { describe, it, expect } from 'vitest'
import { bindDecimal, processDecimal, unmaskDecimal } from '../src/index'
import { applyDecimalMaskPushingFraction } from '../src/decimal-mask'
import type { BindDecimalOptions, DecimalMaskOptions } from '../src/index'

// ---------------------------------------------------------------------------
// `allowDecimalPush`: calculator-style entry. With the caret in an
// already-full fraction, a typed digit pushes the whole number one place to
// the left instead of being dropped — "$123.12|" + "3" → "$1,231.23|".
// Off (the default), the keystroke is dropped exactly as before.
// ---------------------------------------------------------------------------

const PUSH: DecimalMaskOptions = {
  decimalPlaces: 2,
  prefix: '$',
  allowNegative: true,
  allowDecimalPush: true,
}
const NO_PUSH: DecimalMaskOptions = { decimalPlaces: 2, prefix: '$', allowNegative: true }

function setupInput(options: BindDecimalOptions, initial: string): HTMLInputElement {
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

/** Replace the selection `[from, to)` with `ch`, as a browser would, then fire `input`. */
function replaceSelection(input: HTMLInputElement, ch: string, from: number, to: number): void {
  input.value = input.value.slice(0, from) + ch + input.value.slice(to)
  input.setSelectionRange(from + ch.length, from + ch.length)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }))
}

function withCaret(input: HTMLInputElement): string {
  const c = input.selectionStart ?? 0
  return `${input.value.slice(0, c)}|${input.value.slice(c)}`
}

/** Bind `options`, seed `initial`, type `ch` at `at`, return the marked result. */
function typed(options: DecimalMaskOptions, initial: string, ch: string, at: number): string {
  const input = setupInput(options, initial)
  typeAt(input, ch, at)
  const out = withCaret(input)
  input.remove()
  return out
}

/** Flush the `requestAnimationFrame` chain used by the keyboard fallback path. */
async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }
}

describe('allowDecimalPush — the reported case', () => {
  it('pushes the number left when typing at the end of a full fraction', () => {
    expect(typed(PUSH, '$123.12', '3', 7)).toBe('$1,231.23|')
  })

  it('keeps pushing on every further digit', () => {
    const input = setupInput(PUSH, '$123.12')
    typeAt(input, '3', 7)
    typeAt(input, '4', input.value.length)
    expect(withCaret(input)).toBe('$12,312.34|')
    typeAt(input, '5', input.value.length)
    expect(withCaret(input)).toBe('$123,123.45|')
    input.remove()
  })

  it('fills cents from the right on an untouched "$0.00"', () => {
    const input = setupInput(PUSH, '$0.00')
    typeAt(input, '5', 5)
    expect(withCaret(input)).toBe('$0.05|')
    typeAt(input, '4', 5)
    expect(withCaret(input)).toBe('$0.54|')
    typeAt(input, '2', 5)
    expect(withCaret(input)).toBe('$5.42|')
    input.remove()
  })

  it('reports the pushed value to onChange', () => {
    const calls: Array<[string, number]> = []
    const input = setupInput({ ...PUSH, onChange: (v, n) => calls.push([v, n]) }, '$123.12')
    typeAt(input, '3', 7)
    expect(calls).toEqual([['$1,231.23', 1231.23]])
    input.remove()
  })
})

describe('allowDecimalPush — trailing zeros are padding, overwritten before anything pushes', () => {
  it('overwrites the padding, then pushes once the fraction holds real digits', () => {
    const input = setupInput(PUSH, '$23.00')
    typeAt(input, '4', 4)
    expect(withCaret(input)).toBe('$23.4|0')
    typeAt(input, '5', 5)
    expect(withCaret(input)).toBe('$23.45|')
    typeAt(input, '6', 6)
    expect(withCaret(input)).toBe('$234.56|')
    input.remove()
  })

  it('absorbs a trailing zero when typing before a real digit', () => {
    expect(typed(PUSH, '$23.40', '5', 4)).toBe('$23.5|4')
  })

  it('a real trailing zero before the caret still pushes', () => {
    expect(typed(PUSH, '$23.10', '5', 6)).toBe('$231.05|')
  })

  it('a non-zero digit after the caret pushes as usual', () => {
    expect(typed(PUSH, '$23.04', '5', 4)).toBe('$235|.04')
  })
})

describe('allowDecimalPush — caret positions inside the fraction', () => {
  it('between the two fraction digits: the caret stays glued to the typed digit', () => {
    expect(typed(PUSH, '$123.12', '3', 6)).toBe('$1,231.3|2')
  })

  it('right after the separator: the typed digit becomes the last integer digit', () => {
    expect(typed(PUSH, '$123.12', '3', 5)).toBe('$1,233|.12')
  })

  it('with more decimal places, the pushed digit is whichever crosses the separator', () => {
    const opts: DecimalMaskOptions = { decimalPlaces: 3, allowDecimalPush: true }
    expect(typed(opts, '1.234', '9', 5)).toBe('12.349|')
    expect(typed(opts, '1.234', '9', 3)).toBe('12.9|34')
  })
})

describe('allowDecimalPush — does not interfere with the integer segment', () => {
  it('a digit typed in the integer part inserts normally', () => {
    expect(typed(PUSH, '$123.12', '9', 4)).toBe('$1,239|.12')
    expect(typed(PUSH, '$123.12', '9', 1)).toBe('$9|,123.12')
  })

  it('a digit typed at the far left still replaces the placeholder zero', () => {
    expect(typed(PUSH, '$0.00', '2', 0)).toBe('$2|.00')
    expect(typed(PUSH, '$0.00', '2', 1)).toBe('$2|.00')
  })

  it('a digit typed into the suffix lands at the end of the number and pushes', () => {
    const opts: DecimalMaskOptions = { decimalPlaces: 2, suffix: ' USD', allowDecimalPush: true }
    expect(typed(opts, '123.12 USD', '3', 10)).toBe('1,231.23| USD')
  })
})

describe('allowDecimalPush — fraction not yet full', () => {
  it('falls back to the default behavior when the fraction has room', () => {
    // A selection-replace leaves the fraction one digit short; the
    // default formatter pads it, nothing is pushed.
    const input = setupInput(PUSH, '$123.12')
    replaceSelection(input, '9', 5, 7)
    expect(withCaret(input)).toBe('$123.9|0')
    input.remove()
  })

  it('selecting across the separator and typing behaves as before', () => {
    const input = setupInput(PUSH, '$123.12')
    replaceSelection(input, '9', 3, 6) // "3.1" → "$1292"
    expect(input.value).toBe('$1,292.00')
    input.remove()
  })
})

describe('allowDecimalPush — negative values', () => {
  it('keeps the sign while pushing', () => {
    expect(typed(PUSH, '-$123.12', '3', 8)).toBe('-$1,231.23|')
  })

  it('"-" still flips the sign and is never pushed as a digit', () => {
    const input = setupInput(PUSH, '$123.12')
    typeAt(input, '-', 7)
    expect(input.value).toBe('-$123.12')
    typeAt(input, '3', 8)
    expect(withCaret(input)).toBe('-$1,231.23|')
    input.remove()
  })
})

describe('allowDecimalPush — leading zeros and numberPlaces', () => {
  it('drops the leading zero as it is pushed out of the integer part', () => {
    expect(typed(PUSH, '$0.12', '3', 5)).toBe('$1.23|')
    expect(typed(PUSH, '$0.00', '0', 5)).toBe('$0.00|')
  })

  it('respects a numberPlaces cap: a push that would overflow is dropped', () => {
    const opts: DecimalMaskOptions = { numberPlaces: 2, decimalPlaces: 2, allowDecimalPush: true }
    expect(typed(opts, '01.23', '4', 5)).toBe('12.34|')
    expect(typed(opts, '12.34', '5', 5)).toBe('12.34|')
  })
})

describe('allowDecimalPush — options that disable it', () => {
  it('does nothing without decimalPlaces (optional, uncapped fraction)', () => {
    const opts: DecimalMaskOptions = { allowDecimalPush: true }
    expect(typed(opts, '123.12', '3', 6)).toBe('123.123|')
  })

  it('does nothing with decimalPlaces: 0', () => {
    const opts: DecimalMaskOptions = { decimalPlaces: 0, allowDecimalPush: true }
    expect(typed(opts, '123', '3', 3)).toBe('1,233|')
  })

  it('works with a comma decimal separator', () => {
    const opts: DecimalMaskOptions = {
      decimalPlaces: 2,
      separator: '.',
      decimalSeparator: ',',
      prefix: 'R$ ',
      allowDecimalPush: true,
    }
    expect(typed(opts, 'R$ 123,12', '3', 9)).toBe('R$ 1.231,23|')
  })
})

describe('allowDecimalPush — off (default) keeps the existing behavior', () => {
  it.each([
    ['unset', NO_PUSH],
    ['false', { ...NO_PUSH, allowDecimalPush: false }],
  ])('with allowDecimalPush %s, a digit typed into a full fraction is dropped', (_, opts) => {
    expect(typed(opts, '$123.12', '3', 7)).toBe('$123.12|')
    // Mid-fraction, the overflow digit at the end is the one dropped.
    expect(typed(opts, '$123.12', '3', 6)).toBe('$123.13|')
    expect(typed(opts, '$0.00', '5', 5)).toBe('$0.00|')
  })
})

describe('allowDecimalPush — only typing is affected', () => {
  it('paste, processDecimal and unmaskDecimal still truncate the fraction', () => {
    expect(processDecimal('123.123', PUSH)).toBe('$123.12')
    expect(unmaskDecimal('$123.123', PUSH)).toBe(123.12)

    const input = setupInput(PUSH, '$123.12')
    input.value = '123.456'
    input.setSelectionRange(7, 7)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }))
    expect(input.value).toBe('$123.45')
    input.remove()
  })

  it('backspace in the fraction pulls the number back (see decimal-pull.test.ts)', () => {
    const input = setupInput(PUSH, '$1,231.23')
    input.setSelectionRange(9, 9)
    input.value = '$1,231.2'
    input.setSelectionRange(8, 8)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }))
    expect(withCaret(input)).toBe('$123.12|')
    input.remove()
  })

  it('also pushes through the keyboard fallback path', async () => {
    const input = setupInput(PUSH, '$123.12')
    input.setSelectionRange(7, 7)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true, cancelable: true }))
    input.value = '$123.123'
    input.setSelectionRange(8, 8)
    await flushRafs()
    expect(withCaret(input)).toBe('$1,231.23|')
    input.remove()
  })
})

describe('applyDecimalMaskPushingFraction — helper contract', () => {
  it('returns null when the pattern does not apply', () => {
    expect(applyDecimalMaskPushingFraction('$123.123', 8, '3', NO_PUSH)).toBeNull()
    expect(applyDecimalMaskPushingFraction('$123.123', 8, '9', PUSH)).toBeNull() // digit mismatch
    expect(applyDecimalMaskPushingFraction('$123.123', 0, '3', PUSH)).toBeNull() // caret 0
    expect(applyDecimalMaskPushingFraction('$1233.12', 5, '3', PUSH)).toBeNull() // integer segment
    expect(applyDecimalMaskPushingFraction('$123.13', 7, '3', PUSH)).toBeNull() // fraction had room
    expect(applyDecimalMaskPushingFraction('123123', 6, '3', PUSH)).toBeNull() // no separator
  })

  it('returns the pushed value and caret when it does', () => {
    expect(applyDecimalMaskPushingFraction('$123.123', 8, '3', PUSH)).toEqual({
      value: '$1,231.23',
      caret: 9,
    })
  })
})
