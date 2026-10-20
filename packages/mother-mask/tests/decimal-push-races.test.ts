import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { BindDecimalOptions } from '../src/index'

// ---------------------------------------------------------------------------
// `allowDecimalPush` under timing pressure. A pushed digit depends on the
// exact state it finds (padding to overwrite, a full fraction to push, an
// integer slot to extend), so every delivery path a browser has — a
// synchronous `input` event, the keydown → requestAnimationFrame fallback,
// both for the same keystroke, iOS keyup, Android IME composition — has to
// converge on the same value, with `onChange` fired once per keystroke and
// no stale frame re-processing a digit it already handled.
//
// Helpers mirror tests/decimal-fast-interactions.test.ts and
// tests/android-fast-typing.test.ts.
// ---------------------------------------------------------------------------

const PUSH: BindDecimalOptions = {
  decimalPlaces: 2,
  prefix: '$',
  allowNegative: true,
  allowDecimalPush: true,
}

/** Flush pending requestAnimationFrame callbacks (one "frame" per call). */
async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }
}

/** Dispatch a key event, then apply the browser's default action (keydown path only). */
function press(
  input: HTMLInputElement,
  key: string,
  valueAfter: string,
  caretAfter: number,
  eventName: 'keydown' | 'keyup' = 'keydown',
): void {
  input.dispatchEvent(new KeyboardEvent(eventName, { key, bubbles: true, cancelable: true }))
  input.value = valueAfter
  input.setSelectionRange(caretAfter, caretAfter)
}

/** Keydown-only burst: every key lands before any frame fires. */
function typeCharsKeydownOnly(input: HTMLInputElement, chars: string): void {
  for (const ch of chars) {
    const at = input.selectionStart ?? input.value.length
    const v = input.value.slice(0, at) + ch + input.value.slice(at)
    press(input, ch, v, at + 1)
  }
}

function dispatchInput(
  input: HTMLInputElement,
  options: { data?: string | null; inputType?: string; isComposing?: boolean } = {},
): void {
  const event = new Event('input', { bubbles: true, cancelable: false })
  Object.defineProperty(event, 'data', { value: options.data ?? null, configurable: true })
  Object.defineProperty(event, 'inputType', { value: options.inputType ?? '', configurable: true })
  Object.defineProperty(event, 'isComposing', { value: options.isComposing ?? false, configurable: true })
  input.dispatchEvent(event)
}

/** One keystroke delivered as a synchronous `input` event only (modern mobile). */
function typeCharViaInput(input: HTMLInputElement, ch: string, inputType = 'insertText'): void {
  const at = input.selectionStart ?? input.value.length
  input.value = input.value.slice(0, at) + ch + input.value.slice(at)
  input.setSelectionRange(at + 1, at + 1)
  dispatchInput(input, { data: ch, inputType })
}

/** One keystroke the way desktop browsers deliver it: keydown, native edit, then `input`. */
function typeCharKeydownThenInput(input: HTMLInputElement, ch: string): void {
  const at = input.selectionStart ?? input.value.length
  const v = input.value.slice(0, at) + ch + input.value.slice(at)
  press(input, ch, v, at + 1)
  dispatchInput(input, { data: ch, inputType: 'insertText' })
}

function withCaret(input: HTMLInputElement): string {
  const c = input.selectionStart ?? 0
  return `${input.value.slice(0, c)}|${input.value.slice(c)}`
}

/** Bind with `options`, seed `initial` and park the caret at its end. */
async function bound(
  input: HTMLInputElement,
  options: BindDecimalOptions,
  initial: string,
): Promise<() => void> {
  const { bindDecimal } = await import('../src/index')
  const dispose = bindDecimal(input, options)
  input.value = initial
  input.setSelectionRange(initial.length, initial.length)
  return dispose
}

let input: HTMLInputElement

beforeEach(() => {
  input = document.createElement('input')
  document.body.appendChild(input)
})

afterEach(() => {
  input.remove()
  vi.unstubAllGlobals()
  vi.resetModules()
})

// ---------------------------------------------------------------------------
// 1. Bursts — several keystrokes before anything has a chance to format
// ---------------------------------------------------------------------------

describe('allowDecimalPush — bursts', () => {
  it('a burst delivered as synchronous input events pushes one digit at a time', async () => {
    const cb = vi.fn()
    await bound(input, { ...PUSH, onChange: cb }, '$123.12')
    for (const ch of '345') typeCharViaInput(input, ch)
    expect(withCaret(input)).toBe('$123,123.45|')
    expect(cb.mock.calls.map((c) => c[0])).toEqual(['$1,231.23', '$12,312.34', '$123,123.45'])
    expect(cb).toHaveBeenLastCalledWith('$123,123.45', 123123.45)
  })

  it('a keydown-only burst (all keys land before the first frame) converges to the same value', async () => {
    const cb = vi.fn()
    await bound(input, { ...PUSH, onChange: cb }, '$123.12')
    typeCharsKeydownOnly(input, '345')
    expect(input.value).toBe('$123.12345') // nothing formatted yet
    await flushRafs(6) // every keystroke's own frame, plus spares
    expect(withCaret(input)).toBe('$123,123.45|')
    // Replayed once per keystroke by the first frame; the later keystrokes'
    // frames still fire (and still report) but find nothing of theirs to
    // push, so the value never moves again.
    const values = cb.mock.calls.map((c) => c[0])
    expect(values.slice(0, 3)).toEqual(['$1,231.23', '$12,312.34', '$123,123.45'])
    expect(new Set(values.slice(3))).toEqual(new Set(['$123,123.45']))
  })

  it('a keydown-only burst that overwrites padding first, then pushes', async () => {
    await bound(input, PUSH, '$23.00')
    input.setSelectionRange(4, 4)
    typeCharsKeydownOnly(input, '456')
    await flushRafs(6)
    expect(withCaret(input)).toBe('$234.56|')
  })

  it('a keydown-only burst of identical digits is not double-pushed by stale frames', async () => {
    // Each later frame finds its own key at the caret by coincidence; the
    // fraction it sees is no longer full, so it must not push again.
    const cb = vi.fn()
    await bound(input, { ...PUSH, onChange: cb }, '$123.12')
    typeCharsKeydownOnly(input, '33')
    await flushRafs(6)
    expect(withCaret(input)).toBe('$12,312.33|')
    const values = cb.mock.calls.map((c) => c[0])
    expect(values.slice(0, 2)).toEqual(['$1,231.23', '$12,312.33'])
    expect(new Set(values.slice(2))).toEqual(new Set(['$12,312.33']))
  })

  it('a burst mixing a sign flip into the digits keeps the sign and keeps pushing', async () => {
    await bound(input, PUSH, '$123.12')
    for (const ch of '3-4') typeCharViaInput(input, ch)
    expect(withCaret(input)).toBe('-$12,312.34|')

    input.value = '$123.12'
    input.setSelectionRange(7, 7)
    typeCharsKeydownOnly(input, '3-4')
    await flushRafs(6)
    expect(withCaret(input)).toBe('-$12,312.34|')
  })

  it('a stray separator keystroke in a burst is dropped as noise without disturbing the push', async () => {
    await bound(input, PUSH, '$123.12')
    for (const ch of '.3') typeCharViaInput(input, ch)
    expect(withCaret(input)).toBe('$1,231.23|')
  })

  it('from an empty field the first digit opens the integer part and leaves the caret there', async () => {
    await bound(input, PUSH, '')
    for (const ch of '1234567') typeCharViaInput(input, ch)
    // The caret sits before the separator after "1", so the rest extend the
    // integer part: nothing is at the end of the fraction to push.
    expect(withCaret(input)).toBe('$1,234,567|.00')
  })

  it('a long burst with the caret at the end fills cents from the right the whole way', async () => {
    await bound(input, PUSH, '$0.00')
    for (const ch of '1234567') typeCharViaInput(input, ch)
    expect(withCaret(input)).toBe('$12,345.67|')
  })

  it('a burst into an untouched "$0.00" via keydown only', async () => {
    await bound(input, PUSH, '$0.00')
    typeCharsKeydownOnly(input, '542')
    await flushRafs(6)
    expect(withCaret(input)).toBe('$5.42|')
  })

  it('a burst that starts by replacing a selection is not treated as a pure insertion', async () => {
    await bound(input, PUSH, '$123.12')
    // Select "12" in the fraction, type "9" (replace), then "8" and "7".
    input.setSelectionRange(5, 7)
    press(input, '9', '$123.9', 6)
    typeCharsKeydownOnly(input, '87')
    await flushRafs(6)
    // "9" fills the fraction's room (no push), "8" overwrites the padding
    // zero, "7" pushes.
    expect(withCaret(input)).toBe('$1,239.87|')
  })
})

// ---------------------------------------------------------------------------
// 2. Both paths for the same keystroke — no double processing
// ---------------------------------------------------------------------------

describe('allowDecimalPush — keydown and input for the same keystroke', () => {
  it('the input event formats at once and the pending keydown frame is cancelled', async () => {
    const cb = vi.fn()
    await bound(input, { ...PUSH, onChange: cb }, '$123.12')
    typeCharKeydownThenInput(input, '3')
    expect(withCaret(input)).toBe('$1,231.23|')
    expect(cb).toHaveBeenCalledTimes(1)
    await flushRafs(4)
    expect(withCaret(input)).toBe('$1,231.23|')
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('a fast sequence of keydown+input pairs fires onChange exactly once per keystroke', async () => {
    const cb = vi.fn()
    await bound(input, { ...PUSH, onChange: cb }, '$23.00')
    input.setSelectionRange(4, 4)
    for (const ch of '456') typeCharKeydownThenInput(input, ch)
    await flushRafs(8)
    expect(withCaret(input)).toBe('$234.56|')
    expect(cb.mock.calls.map((c) => c[0])).toEqual(['$23.40', '$23.45', '$234.56'])
  })

  it('a keydown whose frame fires before the native edit lands bails and lets the input event win', async () => {
    const cb = vi.fn()
    await bound(input, { ...PUSH, onChange: cb }, '$123.12')
    // A real selection is still in place when the frame runs: Firefox's
    // keydown-before-edit race.
    input.setSelectionRange(5, 7)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '9', bubbles: true, cancelable: true }))
    await flushRafs(2)
    expect(input.value).toBe('$123.12')
    expect(input.selectionStart).toBe(5)
    expect(input.selectionEnd).toBe(7)
    expect(cb).not.toHaveBeenCalled()

    // The edit lands and `input` fires: the fraction has room, so no push.
    input.value = '$123.9'
    input.setSelectionRange(6, 6)
    dispatchInput(input, { data: '9', inputType: 'insertText' })
    expect(withCaret(input)).toBe('$123.9|0')
    expect(cb).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// 3. Platform quirks — iOS keyup, Android composition and key-less events
// ---------------------------------------------------------------------------

describe('allowDecimalPush — platform quirks', () => {
  it('iOS: the trailing keyup after an input-handled edit does not push a second time', async () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone; CPU iPhone OS 17_0 like Mac OS X' })
    const cb = vi.fn()
    await bound(input, { ...PUSH, onChange: cb }, '$123.12')
    typeCharViaInput(input, '3')
    input.dispatchEvent(new KeyboardEvent('keyup', { key: '3', bubbles: true, cancelable: true }))
    await flushRafs(4)
    expect(withCaret(input)).toBe('$1,231.23|')
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('iOS: a keyup-only burst (no input events) still replays digit by digit', async () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone; CPU iPhone OS 17_0 like Mac OS X' })
    await bound(input, PUSH, '$123.12')
    for (const ch of '34') {
      const at = input.selectionStart ?? input.value.length
      press(input, ch, input.value.slice(0, at) + ch + input.value.slice(at), at + 1, 'keyup')
    }
    await flushRafs(6)
    expect(withCaret(input)).toBe('$12,312.34|')
  })

  it('Android: input events inside an IME composition still push live', async () => {
    const cb = vi.fn()
    await bound(input, { ...PUSH, onChange: cb }, '$123.12')
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    typeCharViaInput(input, '3', 'insertCompositionText')
    expect(withCaret(input)).toBe('$1,231.23|')
    typeCharViaInput(input, '4', 'insertCompositionText')
    expect(withCaret(input)).toBe('$12,312.34|')
    // compositionend re-formats the already-formatted value: idempotent.
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '34' }))
    expect(withCaret(input)).toBe('$12,312.34|')
    expect(cb.mock.calls.map((c) => c[0])).toEqual(['$1,231.23', '$12,312.34', '$12,312.34'])
  })

  it('Android: a key-less keydown followed by an input event pushes once and unlocks', async () => {
    const cb = vi.fn()
    await bound(input, { ...PUSH, onChange: cb }, '$123.12')
    // Old WebViews fire keydown with an empty `key`; the binder locks and
    // waits for a frame, but the input event arrives first and wins.
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '', bubbles: true, cancelable: true }))
    typeCharViaInput(input, '3')
    expect(withCaret(input)).toBe('$1,231.23|')
    await flushRafs(4)
    expect(withCaret(input)).toBe('$1,231.23|')
    expect(cb).toHaveBeenCalledTimes(1)

    // The lock was released: a normal keydown is not swallowed.
    const next = new KeyboardEvent('keydown', { key: '4', bubbles: true, cancelable: true })
    input.dispatchEvent(next)
    expect(next.defaultPrevented).toBe(false)
  })

  it('a paste right after a formatted push truncates the pasted overflow (paste is not typing)', async () => {
    await bound(input, PUSH, '$123.12')
    typeCharViaInput(input, '3')
    expect(input.value).toBe('$1,231.23')
    input.value = '$1,231.239'
    input.setSelectionRange(10, 10)
    input.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
    await flushRafs(2)
    expect(input.value).toBe('$1,231.23')
  })
})

// ---------------------------------------------------------------------------
// 4. Lifecycle — dispose, rebind, several bound inputs
// ---------------------------------------------------------------------------

describe('allowDecimalPush — lifecycle', () => {
  it('disposing mid-burst cancels the pending frames: nothing formats after dispose', async () => {
    const cb = vi.fn()
    const dispose = await bound(input, { ...PUSH, onChange: cb }, '$123.12')
    typeCharsKeydownOnly(input, '34')
    dispose()
    await flushRafs(6)
    expect(input.value).toBe('$123.1234')
    expect(cb).not.toHaveBeenCalled()
  })

  it('rebinding with the flag off restores the drop-the-overflow behavior', async () => {
    const dispose = await bound(input, PUSH, '$123.12')
    typeCharViaInput(input, '3')
    expect(input.value).toBe('$1,231.23')
    dispose()
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { decimalPlaces: 2, prefix: '$' })
    typeCharViaInput(input, '4')
    expect(withCaret(input)).toBe('$1,231.23|')
  })

  it('a second bindDecimal call on the same element is a no-op and keeps push on', async () => {
    const { bindDecimal } = await import('../src/index')
    const dispose = bindDecimal(input, PUSH)
    bindDecimal(input, { decimalPlaces: 2, prefix: '$' }) // ignored: already bound
    input.value = '$123.12'
    input.setSelectionRange(7, 7)
    typeCharViaInput(input, '3')
    expect(input.value).toBe('$1,231.23')
    dispose()
  })

  it('two inputs bound with and without the flag do not leak behavior into each other', async () => {
    const other = document.createElement('input')
    document.body.appendChild(other)
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, PUSH)
    bindDecimal(other, { decimalPlaces: 2, prefix: '$' })
    for (const el of [input, other]) {
      el.value = '$123.12'
      el.setSelectionRange(7, 7)
      typeCharViaInput(el, '3')
    }
    expect(input.value).toBe('$1,231.23')
    expect(other.value).toBe('$123.12')
    other.remove()
  })
})

// ---------------------------------------------------------------------------
// 5. Remaining value edge cases
// ---------------------------------------------------------------------------

describe('allowDecimalPush — value edge cases', () => {
  it('typing "0" into a full fraction pushes a zero through', async () => {
    const cb = vi.fn()
    await bound(input, { ...PUSH, onChange: cb }, '$1.23')
    typeCharViaInput(input, '0')
    expect(withCaret(input)).toBe('$12.30|')
    expect(cb).toHaveBeenLastCalledWith('$12.30', 12.3)
    // That trailing zero is now real content before the caret: push again.
    typeCharViaInput(input, '5')
    expect(withCaret(input)).toBe('$123.05|')
  })

  it('typing zeros into an untouched field stays at zero and reports 0', async () => {
    const cb = vi.fn()
    await bound(input, { ...PUSH, onChange: cb }, '$0.00')
    for (const ch of '000') typeCharViaInput(input, ch)
    expect(withCaret(input)).toBe('$0.00|')
    expect(cb).toHaveBeenLastCalledWith('$0.00', 0)
  })

  it('decimalPlaces: 1', async () => {
    await bound(input, { decimalPlaces: 1, allowDecimalPush: true }, '12.3')
    typeCharViaInput(input, '4')
    expect(withCaret(input)).toBe('123.4|')
    input.setSelectionRange(4, 4)
    typeCharViaInput(input, '5')
    expect(withCaret(input)).toBe('1,235|.4')
  })

  it('a wide fraction pushes only the digit that crosses the separator', async () => {
    await bound(input, { decimalPlaces: 4, allowDecimalPush: true }, '1.2345')
    input.setSelectionRange(3, 3)
    typeCharViaInput(input, '9')
    expect(withCaret(input)).toBe('12.9|345')
  })

  it('segmented: false never inserts grouping while pushing', async () => {
    await bound(input, { decimalPlaces: 2, segmented: false, allowDecimalPush: true }, '12345.67')
    typeCharViaInput(input, '8')
    expect(withCaret(input)).toBe('123456.78|')
  })

  it('a suffix stays inert and pushes keep the caret before it', async () => {
    const cb = vi.fn()
    await bound(input, { decimalPlaces: 2, suffix: ' USD', allowDecimalPush: true, onChange: cb }, '99.99 USD')
    input.setSelectionRange(5, 5)
    typeCharViaInput(input, '1')
    expect(withCaret(input)).toBe('999.91| USD')
    expect(cb).toHaveBeenLastCalledWith('999.91 USD', 999.91)
  })

  it('a negative value with a suffix', async () => {
    await bound(input, { decimalPlaces: 2, suffix: ' €', allowNegative: true, allowDecimalPush: true }, '-1.00 €')
    input.setSelectionRange(5, 5)
    typeCharViaInput(input, '5')
    expect(withCaret(input)).toBe('-10.05| €')
  })

  it('"+" turns a negative value positive without consuming a digit slot', async () => {
    await bound(input, PUSH, '-$123.12')
    typeCharViaInput(input, '+')
    expect(withCaret(input)).toBe('$123.12|')
    typeCharViaInput(input, '3')
    expect(withCaret(input)).toBe('$1,231.23|')
  })

  it('numberPlaces padding at the far left is replaced before any push can happen', async () => {
    await bound(input, { numberPlaces: 2, decimalPlaces: 2, allowDecimalPush: true }, '00.00')
    input.setSelectionRange(0, 0)
    typeCharViaInput(input, '7')
    expect(withCaret(input)).toBe('07|.00')
    // Caret after the separator: the padding zeros are overwritten first.
    input.setSelectionRange(3, 3)
    for (const ch of '12') typeCharViaInput(input, ch)
    expect(withCaret(input)).toBe('07.12|')
    typeCharViaInput(input, '3')
    expect(withCaret(input)).toBe('71.23|')
    // One more would need three integer digits: dropped.
    typeCharViaInput(input, '4')
    expect(withCaret(input)).toBe('71.23|')
  })

  it('keeps the masked string exact past the safe-integer range while pushing', async () => {
    await bound(input, PUSH, '$12,345,678,901,234.56')
    typeCharViaInput(input, '7')
    expect(input.value).toBe('$123,456,789,012,345.67')
  })

  it('a burst into a value with the caret inside the integer part never pushes', async () => {
    await bound(input, PUSH, '$123.12')
    input.setSelectionRange(2, 2)
    for (const ch of '99') typeCharViaInput(input, ch)
    expect(withCaret(input)).toBe('$19,9|23.12')
  })

  it('select-all then retype replaces the value and starts fresh', async () => {
    await bound(input, PUSH, '$1,231.23')
    input.setSelectionRange(0, input.value.length)
    input.value = '7'
    input.setSelectionRange(1, 1)
    dispatchInput(input, { data: '7', inputType: 'insertText' })
    expect(withCaret(input)).toBe('$7|.00')
    // At the end, the zeros are before the caret and count as real: push.
    input.setSelectionRange(5, 5)
    typeCharViaInput(input, '8')
    expect(withCaret(input)).toBe('$70.08|')
    // After the separator, they are padding: overwrite.
    input.value = '$7.00'
    input.setSelectionRange(3, 3)
    typeCharViaInput(input, '8')
    expect(withCaret(input)).toBe('$7.8|0')
  })

  it('forward Delete inside the fraction pulls (see decimal-pull.test.ts)', async () => {
    await bound(input, PUSH, '$1,231.23')
    input.setSelectionRange(7, 7)
    input.value = '$1,231.3'
    input.setSelectionRange(7, 7)
    dispatchInput(input, { inputType: 'deleteContentForward' })
    expect(withCaret(input)).toBe('$123.1|3')
  })

  it('backspacing the separator still unmerges instead of pulling digits', async () => {
    await bound(input, PUSH, '$1,231.23')
    input.setSelectionRange(7, 7)
    input.value = '$1,23123'
    input.setSelectionRange(6, 6)
    dispatchInput(input, { inputType: 'deleteContentBackward' })
    expect(withCaret(input)).toBe('$123|.23')
  })
})
