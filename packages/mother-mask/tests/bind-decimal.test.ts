import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/** Flush nested `requestAnimationFrame` chains used by `bindDecimal()`. */
async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
}

function dispatchKey(input: HTMLInputElement, key: string, eventName = 'keydown'): void {
  input.dispatchEvent(new KeyboardEvent(eventName, { key, bubbles: true, cancelable: true }))
}

describe('bindDecimal() — event handlers', () => {
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

  it('masks a pasted raw digit string on next animation frame (integer-first)', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    input.value = '1234'
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    await flushRafs(1)
    expect(input.value).toBe('$1,234.00')
  })

  it('extends the integer part digit by digit, appending a zero fraction', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    for (const [typed, expected] of [
      ['4', '$4.00'],
      ['42', '$42.00'],
      ['423', '$423.00'],
      ['4231', '$4,231.00'],
    ] as const) {
      input.value = typed
      input.setSelectionRange(typed.length, typed.length)
      dispatchKey(input, typed[typed.length - 1])
      await flushRafs()
      expect(input.value).toBe(expected)
    }
  })

  it('opens the fraction segment once "." is typed and fills it left to right', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    input.value = '423.'
    input.setSelectionRange(4, 4)
    dispatchKey(input, '.')
    await flushRafs()
    expect(input.value).toBe('423.00')

    input.value = '423.4'
    input.setSelectionRange(5, 5)
    dispatchKey(input, '4')
    await flushRafs()
    expect(input.value).toBe('423.40')

    input.value = '423.42'
    input.setSelectionRange(6, 6)
    dispatchKey(input, '2')
    await flushRafs()
    expect(input.value).toBe('423.42')
  })

  it('pads a shortened fraction with trailing zeros instead of reflowing (segmented editing)', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    // Simulates the user backspacing the trailing "2" off "423.42".
    input.value = '423.4'
    input.setSelectionRange(5, 5)
    dispatchKey(input, 'Backspace')
    await flushRafs()
    expect(input.value).toBe('423.40')
  })

  it('Backspace over the decimal separator drops the last integer digit instead of merging', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    // Field showed "$25.00" with the caret right after "."; Backspace
    // deletes the "." itself, so the browser produces "$2500" with the
    // caret at 3 — this should read as "drop the 5", not "merge to 2500".
    input.value = '$2500'
    input.setSelectionRange(3, 3)
    dispatchKey(input, 'Backspace')
    await flushRafs()
    expect(input.value).toBe('$2.00')
  })

  it('editing the integer part does not disturb an already-typed fraction', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    // Simulates deleting the leading "4" off "423.42".
    input.value = '23.42'
    input.setSelectionRange(0, 0)
    dispatchKey(input, 'Backspace')
    await flushRafs()
    expect(input.value).toBe('23.42')
  })

  it('replaces the placeholder "0" instead of prepending when typed before it', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    // Field currently shows "$0.00" with the caret right before the "0";
    // the browser inserts "2" there, producing "$20.00" with caret after it.
    input.value = '$20.00'
    input.setSelectionRange(2, 2)
    dispatchKey(input, '2')
    await flushRafs()
    expect(input.value).toBe('$2.00')
  })

  it('replaces the placeholder "0" instead of appending when typed right after it', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    // Caret right after the "0"; the browser inserts "5" there, producing
    // "$05.00" with caret after it.
    input.value = '$05.00'
    input.setSelectionRange(3, 3)
    dispatchKey(input, '5')
    await flushRafs()
    expect(input.value).toBe('$5.00')
  })

  it('does not replace once the integer part already has a real digit', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    // "$2.00" already has a real "2"; typing "5" after it should combine,
    // not replace, giving "$25.00".
    input.value = '$25.00'
    input.setSelectionRange(3, 3)
    dispatchKey(input, '5')
    await flushRafs()
    expect(input.value).toBe('$25.00')
  })

  it('replacing the placeholder zero preserves an already-typed fraction', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    // Field shows "0.50"; typing "2" before the "0" should keep the ".50".
    input.value = '20.50'
    input.setSelectionRange(1, 1)
    dispatchKey(input, '2')
    await flushRafs()
    expect(input.value).toBe('2.50')
  })

  it('normalizes a "," keystroke to the configured "." decimalSeparator', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    input.value = '42,'
    input.setSelectionRange(3, 3)
    dispatchKey(input, ',')
    await flushRafs()
    expect(input.value).toBe('42.00')
  })

  it('normalizes a "." keystroke to a configured "," decimalSeparator', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { decimalSeparator: ',' })
    input.value = '42.'
    input.setSelectionRange(3, 3)
    dispatchKey(input, '.')
    await flushRafs()
    expect(input.value).toBe('42,00')
  })

  it('does not normalize "." / "," when decimalPlaces is 0', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { decimalPlaces: 0 })
    input.value = '42.'
    input.setSelectionRange(3, 3)
    dispatchKey(input, '.')
    await flushRafs()
    expect(input.value).toBe('42')
  })

  it('invokes onChange with the masked string and parsed numeric value', async () => {
    const { bindDecimal } = await import('../src/index')
    const cb = vi.fn()
    bindDecimal(input, { prefix: '$', onChange: cb })
    input.value = '1234'
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    await flushRafs(1)
    expect(cb).toHaveBeenCalledWith('$1,234.00', 1234)
  })

  it('accepts a bare callback as the second argument (legacy style)', async () => {
    const { bindDecimal } = await import('../src/index')
    const cb = vi.fn()
    bindDecimal(input, cb)
    input.value = '5'
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    await flushRafs(1)
    expect(cb).toHaveBeenCalledWith('5.00', 5)
  })

  it('ignores Meta key without locking or mutating value', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    input.value = ''
    dispatchKey(input, 'Meta')
    await flushRafs()
    expect(input.value).toBe('')
  })

  it('does not override the caret when ArrowRight crosses a thousands separator', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    input.value = '$23,328.00'
    // Simulates the browser having already moved the caret across the ",".
    input.setSelectionRange(4, 4)
    dispatchKey(input, 'ArrowRight')
    await flushRafs()
    expect(input.value).toBe('$23,328.00')
    expect(input.selectionStart).toBe(4)
  })

  it('does not override the caret on ArrowLeft', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    input.value = '$23,328.00'
    input.setSelectionRange(3, 3)
    dispatchKey(input, 'ArrowLeft')
    await flushRafs()
    expect(input.value).toBe('$23,328.00')
    expect(input.selectionStart).toBe(3)
  })

  it('leaves Home/End navigation untouched', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    input.value = '$23,328.00'
    input.setSelectionRange(0, 0)
    dispatchKey(input, 'Home')
    await flushRafs()
    expect(input.value).toBe('$23,328.00')
    expect(input.selectionStart).toBe(0)
  })

  it('does not reformat or disturb the selection on a Ctrl/Cmd shortcut (e.g. select-all)', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    input.value = '$23,328.00'
    input.setSelectionRange(0, 10)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(input.value).toBe('$23,328.00')
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(10)
  })

  it('handles keydown with missing key (Android WebView style)', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    input.value = '1'
    input.setSelectionRange(1, 1)
    const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'key', { value: undefined, configurable: true })
    input.dispatchEvent(ev)
    await flushRafs()
    expect(input.value).toBe('$1.00')
  })

  it('blocks a second keydown while the Android WebView rAF path is pending', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    const missingKeyEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true })
    Object.defineProperty(missingKeyEvent, 'key', { value: undefined, configurable: true })
    input.dispatchEvent(missingKeyEvent)
    const second = new KeyboardEvent('keydown', { key: '5', bubbles: true, cancelable: true })
    input.dispatchEvent(second)
    expect(second.defaultPrevented).toBe(true)
    await flushRafs()
  })

  it('uses keyup instead of keydown when userAgent matches iOS', async () => {
    vi.stubGlobal('navigator', { userAgent: 'iPad; CPU OS 16_0 like Mac OS X' })
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    const spyKeydown = vi.fn()
    const spyKeyup = vi.fn()
    input.addEventListener('keydown', spyKeydown)
    input.addEventListener('keyup', spyKeyup)
    input.value = '123'
    input.setSelectionRange(3, 3)
    dispatchKey(input, '3', 'keyup')
    await flushRafs()
    expect(spyKeydown).not.toHaveBeenCalled()
    expect(spyKeyup).toHaveBeenCalled()
    expect(input.value).toBe('$123.00')
  })

  it('never blocks typing (no max length concept for decimal masks)', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    input.value = '123456789012'
    input.setSelectionRange(12, 12)
    const e = new KeyboardEvent('keydown', { key: '2', bubbles: true, cancelable: true })
    input.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(false)
  })

  it('idempotent second bind returns noop dispose', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    const noop = bindDecimal(input, { prefix: '€' })
    expect(noop()).toBeUndefined()
  })

  it('dispose removes listeners and data-masked so bindDecimal can run again', async () => {
    const { bindDecimal } = await import('../src/index')
    const unbind = bindDecimal(input, { prefix: '$' })
    expect(input.getAttribute('data-masked')).toBe('decimal')
    unbind()
    expect(input.getAttribute('data-masked')).toBeNull()
    bindDecimal(input, { prefix: '€' })
    input.value = '5'
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    await flushRafs(1)
    expect(input.value).toBe('€5.00')
  })

  it('a plain bind()-masked input and a bindDecimal()-masked input do not conflict when separate elements', async () => {
    const { bind, bindDecimal } = await import('../src/index')
    const other = document.createElement('input')
    document.body.appendChild(other)
    bind(other, '999')
    bindDecimal(input, { prefix: '$' })
    input.value = '1'
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    other.value = '5'
    other.dispatchEvent(new Event('paste', { bubbles: true }))
    await flushRafs(1)
    expect(input.value).toBe('$1.00')
    expect(other.value).toBe('5')
    other.remove()
  })
})

describe('bindDecimal() — caret / selection', () => {
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

  it('places the caret right before the appended zero fraction after typing an integer digit', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    input.value = '1234'
    input.setSelectionRange(4, 4)
    dispatchKey(input, '4')
    await flushRafs()
    expect(input.value).toBe('$1,234.00')
    expect(input.selectionStart).toBe('$1,234'.length)
  })

  it('matches applyDecimalMask caret for a fraction-shrinking backspace', async () => {
    const { bindDecimal, applyDecimalMask } = await import('../src/index')
    bindDecimal(input)
    input.value = '423.4'
    const pos = 5
    input.setSelectionRange(pos, pos)
    dispatchKey(input, 'Backspace')
    await flushRafs()
    const expected = applyDecimalMask('423.4', pos)
    expect(input.value).toBe(expected.value)
    expect(input.selectionStart).toBe(expected.caret)
  })

  it('matches applyDecimalMask caret for an integer-part backspace', async () => {
    const { bindDecimal, applyDecimalMask } = await import('../src/index')
    bindDecimal(input)
    input.value = '42.42'
    const pos = 2
    input.setSelectionRange(pos, pos)
    dispatchKey(input, 'Backspace')
    await flushRafs()
    const expected = applyDecimalMask('42.42', pos)
    expect(input.value).toBe(expected.value)
    expect(input.selectionStart).toBe(expected.caret)
  })
})

describe('bindDecimal() — negative numbers', () => {
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

  it('ignores "-" when allowNegative is not set', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    input.value = '-5'
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    await flushRafs(1)
    expect(input.value).toBe('$5.00')
  })

  it('produces a signed value when allowNegative is true', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$', allowNegative: true })
    input.value = '-5'
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    await flushRafs(1)
    expect(input.value).toBe('-$5.00')
  })
})
