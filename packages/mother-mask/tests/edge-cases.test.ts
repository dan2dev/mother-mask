import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  applyMask,
  bind,
  bindDecimal,
  formatDecimalValue,
  getMaxLength,
  process as processMask,
  processDecimal,
  unmaskDecimal,
} from '../src/index'

// ---------------------------------------------------------------------------
// Boundary inputs the main suites never reach: numbers big/small enough to
// switch `Number` into exponential notation, options at or past their
// documented limits, empty masks, and DOM elements that reject selection —
// plus dispose-time guarantees for every asynchronous path a binder schedules.
// ---------------------------------------------------------------------------

async function flushRafs(times = 3): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
}

function setupInput(type = 'text'): HTMLInputElement {
  const input = document.createElement('input')
  input.type = type
  document.body.appendChild(input)
  return input
}

describe('formatDecimalValue at exponential-notation magnitudes', () => {
  it('expands |values| ≥ 1e21 into plain grouped digits instead of mangling "1e+21"', () => {
    // String(1e21) is "1e+21"; ungarded, the grouper produced "1e,+21".
    expect(formatDecimalValue(1e21)).toBe('1,000,000,000,000,000,000,000')
    expect(formatDecimalValue(1.2345e22)).toBe('12,345,000,000,000,000,000,000')
  })

  it('pads the fixed-width fraction of an expanded huge value', () => {
    // toFixed(2) itself returns "1e+21" at this magnitude; such floats are
    // exact integers, so the fraction is pure zero padding.
    expect(formatDecimalValue(1e21, { decimalPlaces: 2 })).toBe('1,000,000,000,000,000,000,000.00')
    expect(formatDecimalValue(1e21, { decimalPlaces: 0 })).toBe('1,000,000,000,000,000,000,000')
  })

  it('keeps the sign of an expanded negative value', () => {
    expect(formatDecimalValue(-1e21, { allowNegative: true, decimalPlaces: 2 })).toBe(
      '-1,000,000,000,000,000,000,000.00',
    )
  })

  it('expands tiny fractions instead of emitting "1.5e-7" verbatim', () => {
    expect(formatDecimalValue(1.5e-7)).toBe('0.00000015')
    expect(formatDecimalValue(1e-7)).toBe('0.0000001')
    // With a fixed width, toFixed already handles tiny values without an exponent.
    expect(formatDecimalValue(1e-7, { decimalPlaces: 2 })).toBe('0.00')
  })

  it('produces only digits and separators even for Number.MAX_VALUE', () => {
    expect(formatDecimalValue(Number.MAX_VALUE)).toMatch(/^[0-9]{1,3}(,[0-9]{3})*$/)
  })

  it('round-trips expanded values through unmaskDecimal', () => {
    expect(unmaskDecimal(formatDecimalValue(1e21))).toBe(1e21)
    expect(unmaskDecimal(formatDecimalValue(1.5e-7))).toBe(1.5e-7)
    expect(unmaskDecimal(formatDecimalValue(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('still returns "" for non-finite values and drops the sign without allowNegative', () => {
    expect(formatDecimalValue(Number.NaN)).toBe('')
    expect(formatDecimalValue(Infinity, { decimalPlaces: 2 })).toBe('')
    expect(formatDecimalValue(-Infinity)).toBe('')
    expect(formatDecimalValue(-5, { decimalPlaces: 2 })).toBe('5.00')
    expect(formatDecimalValue(-0, { allowNegative: true, decimalPlaces: 2 })).toBe('0.00')
  })
})

describe('decimal option clamping', () => {
  it("caps decimalPlaces at toFixed's limit of 100 in every API", () => {
    // formatDecimalValue used to throw RangeError at 101 while processDecimal accepted it.
    expect(() => formatDecimalValue(1.5, { decimalPlaces: 101 })).not.toThrow()
    expect(formatDecimalValue(1.5, { decimalPlaces: 101 })).toBe(
      formatDecimalValue(1.5, { decimalPlaces: 100 }),
    )
    expect(processDecimal('1.5', { decimalPlaces: 101 })).toBe(
      processDecimal('1.5', { decimalPlaces: 100 }),
    )
    expect(processDecimal('1.5', { decimalPlaces: 100 })).toBe(`1.5${'0'.repeat(99)}`)
  })

  it('floors fractional widths and clamps negative or NaN ones', () => {
    expect(processDecimal('1234', { decimalPlaces: 2.7 })).toBe('1,234.00')
    // → 0: integer only, so the "." is noise and every digit joins the integer
    expect(processDecimal('12.34', { decimalPlaces: -2 })).toBe('1,234')
    expect(processDecimal('12.34', { decimalPlaces: Number.NaN })).toBe('12.34') // → unset
    expect(processDecimal('1234', { numberPlaces: 0 })).toBe('1') // → 1: width is at least one digit
  })
})

describe('unmaskDecimal sign edge cases', () => {
  it('returns exactly 0 (never -0) for a digitless negative', () => {
    expect(Object.is(unmaskDecimal('-', { allowNegative: true }), 0)).toBe(true)
    expect(Object.is(unmaskDecimal('-0.00', { allowNegative: true }), 0)).toBe(true)
    expect(Object.is(unmaskDecimal('', { allowNegative: true }), 0)).toBe(true)
  })

  it('treats exponential text as noise, per the documented digit parsing', () => {
    expect(processDecimal('1e5')).toBe('15')
    expect(unmaskDecimal('1e5')).toBe(15)
  })

  it('groups with multi-character and empty thousands separators', () => {
    expect(processDecimal('1234567', { separator: ' . ' })).toBe('1 . 234 . 567')
    expect(processDecimal('1234567', { separator: '' })).toBe('1234567')
  })
})

describe('pattern API boundary inputs', () => {
  it('returns empty output for an empty mask or empty array', () => {
    expect(applyMask('123', '')).toEqual({ value: '', caret: 0 })
    expect(applyMask('123', [])).toEqual({ value: '', caret: 0 })
    expect(processMask('123', [])).toBe('')
    expect(getMaxLength([])).toBe(0)
  })

  it('clamps out-of-range caret arguments to the value', () => {
    expect(applyMask('123', '9-9-9', -5)).toEqual({ value: '1-2-3', caret: 0 })
    expect(applyMask('123', '9-9-9', 999)).toEqual({ value: '1-2-3', caret: 5 })
  })

  it('re-masking its own output at the returned caret is a fixed point', () => {
    for (const [value, mask, caret] of [
      ['015-39', '999.999.999-99', 3],
      ['1/2025', '99/99/9999', 1],
      [' 123-4567', '(999) 999-9999', 0],
    ] as const) {
      const once = applyMask(value, mask, caret)
      expect(applyMask(once.value, mask, once.caret)).toEqual(once)
    }
  })
})

describe('maxlength sizing with the binding’s own compiler', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
  })

  it('sets maxlength for an ASCII-only custom token at one UTF-16 unit per slot', () => {
    // A BMP-only alphabet (here, hex digits) can never need a surrogate pair,
    // so it's sized like a built-in slot — not padded for a case it can't
    // reach. Padding every custom slot regardless of its alphabet let typing
    // continue past the mask's real capacity instead of being blocked (see
    // the "typing past a full custom-token mask" suite below).
    const dispose = bind(input, 'HH-HH', { tokens: { H: /[0-9a-f]/i } })
    expect(input.getAttribute('maxlength')).toBe(String(getMaxLength('HH-HH', { tokens: { H: /[0-9a-f]/i } })))
    expect(input.getAttribute('maxlength')).toBe('5')
    dispose()
    expect(input.hasAttribute('maxlength')).toBe(false)
  })

  it('reserves two UTF-16 units only for a custom token whose alphabet can accept a non-BMP code point', () => {
    // An emoji-accepting alphabet can hand a slot a genuine surrogate pair,
    // so the padding this class of token actually needs is preserved.
    const dispose = bind(input, 'HH-HH', { tokens: { H: /\p{Emoji}/u } })
    expect(input.getAttribute('maxlength')).toBe(String(getMaxLength('HH-HH', { tokens: { H: /\p{Emoji}/u } })))
    expect(input.getAttribute('maxlength')).toBe('9')
    dispose()
  })

  it('sizes an ordered array by its longest member under custom tokens', () => {
    const tokens = { X: /[0-9]/ }
    const dispose = bind(input, ['XX', 'XX-XX'], { tokens })
    expect(input.getAttribute('maxlength')).toBe('5')
    dispose()
  })

  it('treats a matcher that throws on the IME probes as unsafe and skips maxlength', () => {
    // A predicate that blows up on ordinary input can't prove its alphabet is
    // composition-safe, so the binding defers to the engine's own capacity.
    const dispose = bind(input, 'XX', {
      tokens: {
        X: (ch: string) => {
          if (ch >= '　') throw new Error('unexpected input')
          return ch >= '0' && ch <= '9'
        },
      },
    })
    expect(input.hasAttribute('maxlength')).toBe(false)
    input.value = '12'
    input.setSelectionRange(2, 2)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '2' }))
    expect(input.value).toBe('12')
    dispose()
  })
})

describe('every scheduled frame dies with its binding', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.restoreAllMocks()
  })

  it('a paste frame cancelled by dispose never reformats (bind)', async () => {
    const onChange = vi.fn()
    const dispose = bind(input, '999.999.999-99', { onChange })
    input.value = '01215344139'
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    dispose()
    await flushRafs()
    expect(input.value).toBe('01215344139')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('the same paste frame formats when the binding stays alive (control)', async () => {
    const dispose = bind(input, '999.999.999-99')
    input.value = '01215344139'
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    await flushRafs()
    expect(input.value).toBe('012.153.441-39')
    dispose()
  })

  it('a paste frame cancelled by dispose never reformats (bindDecimal)', async () => {
    const onChange = vi.fn()
    const dispose = bindDecimal(input, { decimalPlaces: 2, onChange })
    input.value = '123456'
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    dispose()
    await flushRafs()
    expect(input.value).toBe('123456')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('the Android no-`key` fallback frames are cancelled by dispose', async () => {
    // A keydown without `key` takes the legacy WebView path: it locks input
    // and schedules nested frames. Disposing right after must cancel them all.
    const onChange = vi.fn()
    const dispose = bind(input, '999.999.999-99', { onChange })
    input.value = '0121'
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true }))
    dispose()
    await flushRafs()
    expect(input.value).toBe('0121')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('the same no-`key` frame formats when the binding stays alive (control)', async () => {
    const dispose = bind(input, '999.999.999-99')
    input.value = '0121'
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true }))
    await flushRafs()
    expect(input.value).toBe('012.1')
    dispose()
  })
})

describe('disposer lifecycle', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
  })

  it('a stale disposer is inert and cannot damage a newer binding', () => {
    const first = bind(input, '999')
    first()
    const second = bind(input, '99/99')
    first() // already ran — must not strip the new binding's listeners or attributes
    expect(input.getAttribute('data-masked')).toBe('99/99')
    input.value = '1234'
    input.setSelectionRange(4, 4)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '4' }))
    expect(input.value).toBe('12/34')
    second()
  })

  it('the no-op disposer from a duplicate bind leaves the live binding untouched', () => {
    const real = bindDecimal(input, { decimalPlaces: 2 })
    const duplicate = bindDecimal(input, { decimalPlaces: 0 })
    duplicate()
    expect(input.getAttribute('data-masked')).toBe('decimal')
    input.value = '1234'
    input.setSelectionRange(4, 4)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '4' }))
    expect(input.value).toBe('1,234.00')
    real()
  })

  it('disposing one bound input never affects another', () => {
    const other = setupInput()
    const disposeA = bind(input, '99/99')
    const disposeB = bind(other, '99/99')
    disposeA()
    other.value = '1234'
    other.setSelectionRange(4, 4)
    other.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '4' }))
    expect(other.value).toBe('12/34')
    disposeB()
    other.remove()
  })
})

describe('inputs without text-selection support', () => {
  it('formats a selection-less input (type="number") without throwing', () => {
    // type="number" throws on selectionStart/setSelectionRange; the binder
    // must fall back to end-of-value instead of crashing mid-keystroke.
    const input = setupInput('number')
    const onChange = vi.fn()
    const dispose = bindDecimal(input, { segmented: false, decimalPlaces: 2, onChange })
    input.value = '1234.5'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '5' }))
    expect(input.value).toBe('1234.50')
    expect(onChange).toHaveBeenCalledWith('1234.50', 1234.5)
    dispose()
    input.remove()
  })
})
