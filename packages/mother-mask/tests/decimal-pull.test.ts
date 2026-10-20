import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { BindDecimalOptions, DecimalMaskOptions } from '../src/index'

// ---------------------------------------------------------------------------
// `allowDecimalPush`, the other direction. Backspace and Delete inside the
// fraction pull the number right one place — the exact reverse of a push —
// instead of zero-padding the gap: "$1,231.23|" + Backspace → "$123.12|".
// Off (the default), the gap is padded exactly as before.
// ---------------------------------------------------------------------------

const PUSH: BindDecimalOptions = {
  decimalPlaces: 2,
  prefix: '$',
  allowNegative: true,
  allowDecimalPush: true,
}
const NO_PUSH: BindDecimalOptions = { decimalPlaces: 2, prefix: '$', allowNegative: true }

async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }
}

function dispatchInput(
  input: HTMLInputElement,
  options: { data?: string | null; inputType?: string } = {},
): void {
  const event = new Event('input', { bubbles: true, cancelable: false })
  Object.defineProperty(event, 'data', { value: options.data ?? null, configurable: true })
  Object.defineProperty(event, 'inputType', { value: options.inputType ?? '', configurable: true })
  input.dispatchEvent(event)
}

/** Backspace at the current caret (or over the selection), delivered as an `input` event. */
function backspace(input: HTMLInputElement): void {
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? start
  if (start === end && start === 0) return
  const from = start === end ? start - 1 : start
  input.value = input.value.slice(0, from) + input.value.slice(end)
  input.setSelectionRange(from, from)
  dispatchInput(input, { inputType: 'deleteContentBackward' })
}

/** Forward Delete at the current caret (or over the selection), delivered as an `input` event. */
function forwardDelete(input: HTMLInputElement): void {
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? start
  const to = start === end ? start + 1 : end
  input.value = input.value.slice(0, start) + input.value.slice(to)
  input.setSelectionRange(start, start)
  dispatchInput(input, { inputType: 'deleteContentForward' })
}

function typeChar(input: HTMLInputElement, ch: string): void {
  const at = input.selectionStart ?? input.value.length
  input.value = input.value.slice(0, at) + ch + input.value.slice(at)
  input.setSelectionRange(at + 1, at + 1)
  dispatchInput(input, { data: ch, inputType: 'insertText' })
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

/** Keydown-only Backspace burst: every key lands before any frame fires. */
function backspaceKeydownOnly(input: HTMLInputElement, count: number, eventName: 'keydown' | 'keyup' = 'keydown'): void {
  for (let i = 0; i < count; i++) {
    const at = input.selectionStart ?? input.value.length
    if (at === 0) return
    press(input, 'Backspace', input.value.slice(0, at - 1) + input.value.slice(at), at - 1, eventName)
  }
}

function withCaret(input: HTMLInputElement): string {
  const c = input.selectionStart ?? 0
  return `${input.value.slice(0, c)}|${input.value.slice(c)}`
}

let input: HTMLInputElement

async function bound(options: BindDecimalOptions, initial: string, caret = initial.length): Promise<() => void> {
  const { bindDecimal } = await import('../src/index')
  const dispose = bindDecimal(input, options)
  input.value = initial
  input.setSelectionRange(caret, caret)
  return dispose
}

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
// The reported case
// ---------------------------------------------------------------------------

describe('pull — the reported case', () => {
  it('Backspace at the end reverses a push', async () => {
    await bound(PUSH, '$123.12')
    typeChar(input, '3')
    expect(withCaret(input)).toBe('$1,231.23|')
    backspace(input)
    expect(withCaret(input)).toBe('$123.12|')
  })

  it('keeps pulling all the way down to zero and stays there', async () => {
    const cb = vi.fn()
    await bound({ ...PUSH, onChange: cb }, '$1,231.23')
    const seen: string[] = []
    for (let i = 0; i < 8; i++) {
      backspace(input)
      seen.push(withCaret(input))
    }
    expect(seen).toEqual([
      '$123.12|',
      '$12.31|',
      '$1.23|',
      '$0.12|',
      '$0.01|',
      '$0.00|',
      '$0.00|',
      '$0.00|',
    ])
    expect(cb).toHaveBeenLastCalledWith('$0.00', 0)
  })

  it('reports the pulled value and number to onChange', async () => {
    const cb = vi.fn()
    await bound({ ...PUSH, onChange: cb }, '$1,231.23')
    backspace(input)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith('$123.12', 123.12)
  })

  it('push and pull round-trip through the thousands separator', async () => {
    await bound(PUSH, '$999.99')
    typeChar(input, '9')
    expect(withCaret(input)).toBe('$9,999.99|')
    backspace(input)
    expect(withCaret(input)).toBe('$999.99|')
    typeChar(input, '1')
    expect(withCaret(input)).toBe('$9,999.91|')
  })
})

// ---------------------------------------------------------------------------
// Caret positions inside the fraction
// ---------------------------------------------------------------------------

describe('pull — caret positions', () => {
  it('Backspace between the fraction digits: the caret keeps its slot', async () => {
    await bound(PUSH, '$1,231.23', 8)
    backspace(input)
    expect(withCaret(input)).toBe('$123.1|3')
  })

  it('Backspace on the first fraction digit', async () => {
    await bound(PUSH, '$1,231.23', 8)
    input.setSelectionRange(8, 8)
    backspace(input) // deletes "2"
    expect(withCaret(input)).toBe('$123.1|3')
    backspace(input) // deletes "1", the digit that just slid in
    expect(withCaret(input)).toBe('$12.3|3')
  })

  it('Delete at the start of the fraction', async () => {
    await bound(PUSH, '$123.12', 5)
    forwardDelete(input)
    expect(withCaret(input)).toBe('$12.3|2')
  })

  it('Delete on the last fraction digit', async () => {
    await bound(PUSH, '$123.12', 6)
    forwardDelete(input)
    expect(withCaret(input)).toBe('$12.31|')
  })

  it('Delete at the very end does nothing', async () => {
    await bound(PUSH, '$123.12')
    forwardDelete(input)
    expect(withCaret(input)).toBe('$123.12|')
  })

  it('Backspace at the very start does nothing', async () => {
    await bound(PUSH, '$123.12', 0)
    backspace(input)
    expect(withCaret(input)).toBe('|$123.12')
  })
})

// ---------------------------------------------------------------------------
// Where pulling must NOT happen
// ---------------------------------------------------------------------------

describe('pull — leaves the integer part and the separator alone', () => {
  it('Backspace in the integer part deletes normally, fraction untouched', async () => {
    await bound(PUSH, '$1,231.23', 5)
    backspace(input) // deletes "3"
    expect(withCaret(input)).toBe('$12|1.23')
  })

  it('Delete in the integer part deletes normally', async () => {
    await bound(PUSH, '$1,231.23', 1)
    forwardDelete(input) // deletes "1"
    expect(withCaret(input)).toBe('$|231.23')
  })

  it('Backspace over the separator still drops the last integer digit (unmerge)', async () => {
    for (const opts of [PUSH, NO_PUSH]) {
      await bound(opts, '$1,231.23', 7)
      backspace(input) // deletes "."
      expect(withCaret(input)).toBe('$123|.23')
      input.removeAttribute('data-masked')
    }
  })

  it('Delete over the separator behaves the same with and without the flag', async () => {
    const results: string[] = []
    for (const opts of [PUSH, NO_PUSH]) {
      await bound(opts, '$123.12', 4)
      forwardDelete(input) // deletes "."
      results.push(withCaret(input))
      input.removeAttribute('data-masked')
    }
    expect(results[0]).toBe(results[1])
  })

  it('Backspace over a thousands separator behaves the same with and without the flag', async () => {
    const results: string[] = []
    for (const opts of [PUSH, NO_PUSH]) {
      await bound(opts, '$1,231.23', 3)
      backspace(input) // deletes ","
      results.push(withCaret(input))
      input.removeAttribute('data-masked')
    }
    expect(results[0]).toBe(results[1])
  })

  it('Backspace over the prefix is inert', async () => {
    await bound(PUSH, '$123.12', 1)
    backspace(input) // deletes "$"
    expect(input.value).toBe('$123.12')
  })

  it('Backspace over the sign turns the value positive, no pull', async () => {
    await bound(PUSH, '-$123.12', 1)
    backspace(input) // deletes "-"
    expect(input.value).toBe('$123.12')
  })
})

// ---------------------------------------------------------------------------
// Selections
// ---------------------------------------------------------------------------

describe('pull — selections', () => {
  it('deleting both fraction digits pulls two places', async () => {
    await bound(PUSH, '$1,231.23')
    input.setSelectionRange(7, 9)
    backspace(input)
    expect(withCaret(input)).toBe('$12.31|')
  })

  it('deleting one selected fraction digit pulls one place', async () => {
    await bound(PUSH, '$1,231.23')
    input.setSelectionRange(7, 8)
    forwardDelete(input)
    expect(withCaret(input)).toBe('$123.1|3')
  })

  it('a selection spanning the separator behaves the same with and without the flag', async () => {
    const results: string[] = []
    for (const opts of [PUSH, NO_PUSH]) {
      await bound(opts, '$1,231.23')
      input.setSelectionRange(5, 8) // "1.2"
      backspace(input)
      results.push(withCaret(input))
      input.removeAttribute('data-masked')
    }
    expect(results[0]).toBe(results[1])
  })

  it('select-all then Backspace empties the field', async () => {
    await bound(PUSH, '$1,231.23')
    input.setSelectionRange(0, input.value.length)
    backspace(input)
    expect(input.value).toBe('')
  })

  it('cut (select then input without inputType) pads like before — only deletes pull', async () => {
    await bound(PUSH, '$1,231.23')
    input.value = '$1,231.'
    input.setSelectionRange(7, 7)
    dispatchInput(input, { inputType: 'deleteByCut' })
    expect(withCaret(input)).toBe('$1,231.|00')
  })
})

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

describe('pull — options', () => {
  it('negative values keep the sign while pulling, down to -$0.00', async () => {
    await bound(PUSH, '-$1,231.23')
    backspace(input)
    expect(withCaret(input)).toBe('-$123.12|')
    for (let i = 0; i < 5; i++) backspace(input)
    expect(withCaret(input)).toBe('-$0.00|')
  })

  it('a suffix stays inert and the caret stays before it', async () => {
    await bound({ decimalPlaces: 2, suffix: ' USD', allowDecimalPush: true }, '1,231.23 USD', 8)
    backspace(input)
    expect(withCaret(input)).toBe('123.12| USD')
  })

  it('numberPlaces re-pads the integer part as digits leave it', async () => {
    await bound({ numberPlaces: 2, decimalPlaces: 2, allowDecimalPush: true }, '71.23')
    backspace(input)
    expect(withCaret(input)).toBe('07.12|')
    backspace(input)
    expect(withCaret(input)).toBe('00.71|')
  })

  it('decimalPlaces: 1', async () => {
    await bound({ decimalPlaces: 1, allowDecimalPush: true }, '1,234.5')
    backspace(input)
    expect(withCaret(input)).toBe('123.4|')
  })

  it('decimalPlaces: 3 pulls one place per deleted digit', async () => {
    await bound({ decimalPlaces: 3, allowDecimalPush: true }, '12.345', 5)
    backspace(input) // deletes "4"
    expect(withCaret(input)).toBe('1.23|5')
  })

  it('a comma decimal separator with period grouping', async () => {
    await bound(
      { decimalPlaces: 2, separator: '.', decimalSeparator: ',', prefix: 'R$ ', allowDecimalPush: true },
      'R$ 1.231,23',
    )
    backspace(input)
    expect(withCaret(input)).toBe('R$ 123,12|')
  })

  it('segmented: false', async () => {
    await bound({ decimalPlaces: 2, segmented: false, allowDecimalPush: true }, '123456.78')
    backspace(input)
    expect(withCaret(input)).toBe('12345.67|')
  })

  it('does nothing without decimalPlaces or with decimalPlaces: 0', async () => {
    await bound({ allowDecimalPush: true }, '123.45')
    backspace(input)
    expect(withCaret(input)).toBe('123.4|')
    input.removeAttribute('data-masked')
    await bound({ decimalPlaces: 0, allowDecimalPush: true }, '1,234')
    backspace(input)
    expect(withCaret(input)).toBe('123|')
  })

  it.each([
    ['unset', NO_PUSH],
    ['false', { ...NO_PUSH, allowDecimalPush: false }],
  ])('with allowDecimalPush %s, a deleted fraction digit is zero-padded as before', async (_, opts) => {
    await bound(opts, '$1,231.23')
    backspace(input)
    expect(withCaret(input)).toBe('$1,231.2|0')
    input.setSelectionRange(7, 7)
    forwardDelete(input)
    expect(withCaret(input)).toBe('$1,231.|00')
  })
})

// ---------------------------------------------------------------------------
// Races — bursts, double delivery, platforms, dispose
// ---------------------------------------------------------------------------

describe('pull — races', () => {
  it('a Backspace burst via input events pulls one place per key', async () => {
    const cb = vi.fn()
    await bound({ ...PUSH, onChange: cb }, '$1,231.23')
    for (let i = 0; i < 3; i++) backspace(input)
    expect(withCaret(input)).toBe('$1.23|')
    expect(cb.mock.calls.map((c) => c[0])).toEqual(['$123.12', '$12.31', '$1.23'])
  })

  it('a keydown-only Backspace burst converges to the same value as one key at a time', async () => {
    await bound(PUSH, '$1,231.23')
    backspaceKeydownOnly(input, 3)
    expect(input.value).toBe('$1,231') // nothing formatted yet; separator already gone
    await flushRafs(6)
    expect(withCaret(input)).toBe('$1.23|')
  })

  it('a keydown-only Backspace burst from mid-fraction', async () => {
    await bound(PUSH, '$1,231.23', 8)
    backspaceKeydownOnly(input, 2)
    await flushRafs(6)
    expect(withCaret(input)).toBe('$12.3|3')
  })

  it('a keydown-only burst that starts by deleting a selection', async () => {
    await bound(PUSH, '$1,231.23')
    input.setSelectionRange(8, 9)
    press(input, 'Backspace', '$1,231.2', 8)
    backspaceKeydownOnly(input, 1)
    await flushRafs(6)
    expect(withCaret(input)).toBe('$12.31|')
  })

  it('a keydown-only Delete burst', async () => {
    await bound(PUSH, '$1,231.23', 7)
    for (let i = 0; i < 2; i++) {
      press(input, 'Delete', input.value.slice(0, 7) + input.value.slice(8), 7)
    }
    await flushRafs(6)
    expect(withCaret(input)).toBe('$12.31|')
  })

  it('a mixed type-then-delete burst via input events round-trips', async () => {
    await bound(PUSH, '$123.12')
    typeChar(input, '3')
    typeChar(input, '4')
    backspace(input)
    backspace(input)
    typeChar(input, '5')
    expect(withCaret(input)).toBe('$1,231.25|')
  })

  it('keydown and input for the same Backspace: formatted once, pending frame cancelled', async () => {
    const cb = vi.fn()
    await bound({ ...PUSH, onChange: cb }, '$1,231.23')
    press(input, 'Backspace', '$1,231.2', 8)
    dispatchInput(input, { inputType: 'deleteContentBackward' })
    expect(withCaret(input)).toBe('$123.12|')
    expect(cb).toHaveBeenCalledTimes(1)
    await flushRafs(4)
    expect(withCaret(input)).toBe('$123.12|')
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('stale frames after an input-handled burst never pull again', async () => {
    const cb = vi.fn()
    await bound({ ...PUSH, onChange: cb }, '$1,231.23')
    for (let i = 0; i < 2; i++) {
      const at = input.value.length
      press(input, 'Backspace', input.value.slice(0, at - 1), at - 1)
      dispatchInput(input, { inputType: 'deleteContentBackward' })
    }
    expect(withCaret(input)).toBe('$12.31|')
    await flushRafs(6)
    expect(withCaret(input)).toBe('$12.31|')
    expect(new Set(cb.mock.calls.map((c) => c[0]))).toEqual(new Set(['$123.12', '$12.31']))
  })

  it('iOS: a keyup-only Backspace burst replays', async () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone; CPU iPhone OS 17_0 like Mac OS X' })
    await bound(PUSH, '$1,231.23')
    backspaceKeydownOnly(input, 2, 'keyup')
    await flushRafs(6)
    expect(withCaret(input)).toBe('$12.31|')
  })

  it('Android: a key-less keydown then an input event pulls once', async () => {
    const cb = vi.fn()
    await bound({ ...PUSH, onChange: cb }, '$1,231.23')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '', bubbles: true, cancelable: true }))
    backspace(input)
    expect(withCaret(input)).toBe('$123.12|')
    await flushRafs(4)
    expect(withCaret(input)).toBe('$123.12|')
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('disposing mid-burst cancels the pending frames', async () => {
    const cb = vi.fn()
    const dispose = await bound({ ...PUSH, onChange: cb }, '$1,231.23')
    backspaceKeydownOnly(input, 2)
    dispose()
    await flushRafs(6)
    expect(input.value).toBe('$1,231.')
    expect(cb).not.toHaveBeenCalled()
  })

  it('without the flag, a keydown-only Backspace burst is formatted in one go as before', async () => {
    await bound(NO_PUSH, '$1,231.23')
    backspaceKeydownOnly(input, 2)
    await flushRafs(6)
    expect(withCaret(input)).toBe('$1,231.|00')
  })
})

// ---------------------------------------------------------------------------
// Helper contract
// ---------------------------------------------------------------------------

describe('applyDecimalMaskPullingFraction — helper contract', () => {
  const opts: DecimalMaskOptions = PUSH

  it('returns null when the pattern does not apply', async () => {
    const { applyDecimalMaskPullingFraction } = await import('../src/decimal-mask')
    expect(applyDecimalMaskPullingFraction('$1,231.2', 8, NO_PUSH)).toBeNull()
    expect(applyDecimalMaskPullingFraction('$1,231.23', 9, opts)).toBeNull() // fraction full
    expect(applyDecimalMaskPullingFraction('$1,23123', 6, opts)).toBeNull() // no separator
    expect(applyDecimalMaskPullingFraction('', 0, opts)).toBeNull()
    expect(applyDecimalMaskPullingFraction('1.2', 3, { decimalPlaces: 0, allowDecimalPush: true })).toBeNull()
    expect(applyDecimalMaskPullingFraction('1.2', 3, { allowDecimalPush: true })).toBeNull()
  })

  it('returns the pulled value and caret when it does', async () => {
    const { applyDecimalMaskPullingFraction } = await import('../src/decimal-mask')
    expect(applyDecimalMaskPullingFraction('$1,231.2', 8, opts)).toEqual({ value: '$123.12', caret: 7 })
    expect(applyDecimalMaskPullingFraction('$1,231.3', 7, opts)).toEqual({ value: '$123.13', caret: 6 })
    expect(applyDecimalMaskPullingFraction('$.', 2, opts)).toEqual({ value: '$0.00', caret: 5 })
    expect(applyDecimalMaskPullingFraction('-$5.', 4, opts)).toEqual({ value: '-$0.05', caret: 6 })
  })
})
