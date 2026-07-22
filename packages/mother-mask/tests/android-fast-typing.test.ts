import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Regression coverage for the Android Chrome fast-typing caret drift bug.
//
// Root cause: `bind()` used to derive every formatting decision from a
// `keydown`-time snapshot (`oldValue`, `KeyboardEvent.key`) deferred to the
// next `requestAnimationFrame`. On Android Chrome, characters delivered by
// the virtual keyboard/IME/autocorrect frequently arrive with an unreliable
// or missing `key`, and under fast typing several keystrokes can land before
// a single rAF fires — so the caret heuristics (`isUnidentified`, `isDelete`)
// read a stale, ambiguous snapshot. The real, timing-safe signal is the
// native `input` event: it fires synchronously, once per actual DOM
// mutation, with no batching window. These tests drive `bind()` purely
// through `input` (and `composition*`) events — the way a real mobile
// browser does — instead of the `keydown` + manual-value-set trick used
// elsewhere in the suite.
// ---------------------------------------------------------------------------

/** Flush pending requestAnimationFrame callbacks (used only by the legacy fallback path). */
async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
}

function dispatchInput(
  input: HTMLInputElement,
  options: { data?: string | null; inputType?: string; isComposing?: boolean } = {},
): void {
  const event = new Event('input', { bubbles: true, cancelable: false })
  Object.defineProperty(event, 'data', { value: options.data ?? null, configurable: true })
  Object.defineProperty(event, 'inputType', { value: options.inputType ?? '', configurable: true })
  Object.defineProperty(event, 'isComposing', {
    value: options.isComposing ?? false,
    configurable: true,
  })
  input.dispatchEvent(event)
}

/**
 * Simulate ONE real-browser keystroke: the native mutation (value + caret)
 * has already landed by the time `input` fires — no rAF involved, matching
 * how Chrome (desktop or Android) actually dispatches `input`.
 */
function typeCharViaInput(input: HTMLInputElement, ch: string): void {
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? start
  input.value = input.value.slice(0, start) + ch + input.value.slice(end)
  input.setSelectionRange(start + ch.length, start + ch.length)
  dispatchInput(input, { data: ch, inputType: 'insertText' })
}

function backspaceViaInput(input: HTMLInputElement): void {
  const pos = input.selectionStart ?? input.value.length
  if (pos === 0) return
  input.value = input.value.slice(0, pos - 1) + input.value.slice(pos)
  input.setSelectionRange(pos - 1, pos - 1)
  dispatchInput(input, { inputType: 'deleteContentBackward' })
}

describe('bind() — Android-style fast typing via input events', () => {
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

  it('caret lands correctly after every keystroke of a fast burst, not just the final one', async () => {
    const { bind, applyMask } = await import('../src/index')
    const mask = '(99) 99999-9999'
    bind(input, mask)

    for (const ch of '11999887766') {
      typeCharViaInput(input, ch)
      // No rAF flush between keystrokes — `input` must resolve synchronously.
      const expected = applyMask(input.value, mask, input.value.length)
      expect(input.value).toBe(expected.value)
      expect(input.selectionStart).toBe(expected.caret)
    }

    expect(input.value).toBe('(11) 99988-7766')
  })

  it('full CPF typed fast entirely via input events keeps caret at the end throughout', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999.999.999-99')

    for (const ch of '12345678901') {
      typeCharViaInput(input, ch)
      expect(input.selectionStart).toBe(input.value.length)
    }

    expect(input.value).toBe('123.456.789-01')
    expect(input.value.replace(/\D/g, '')).toBe('12345678901')
  })

  it('an unreliable inputType (Android autocorrect) still lands the caret via the growth heuristic', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999')
    input.value = '123'
    input.setSelectionRange(3, 3)
    // Some Android WebViews report an empty/unknown inputType for composed input.
    dispatchInput(input, { data: '3', inputType: '' })
    expect(input.value).toBe('123')
    expect(input.selectionStart).toBe(3)
  })

  it('input-driven backspace removes the trailing char and keeps caret in place', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    input.setSelectionRange(7, 7)
    backspaceViaInput(input)
    expect(input.value).toBe('123-45')
    expect(input.selectionStart).toBe(6)
  })

  it('input-driven Delete that reflows to the same length nudges caret past the literal', async () => {
    const { bind } = await import('../src/index')
    input.value = '12-345'
    bind(input, '999-999')
    // Delete-forward at pos 2 removes the "-"; the mask immediately re-inserts
    // one elsewhere during reflow, so the masked length is unchanged (6 → 6).
    input.value = '12345'
    input.setSelectionRange(2, 2)
    dispatchInput(input, { inputType: 'deleteContentForward' })
    expect(input.value).toBe('123-45')
    expect(input.selectionStart).toBe(3)
  })

  it('rapid backspace burst via input events drains the value without caret corruption', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    input.setSelectionRange(7, 7)
    for (let i = 0; i < 7; i++) backspaceViaInput(input)
    expect(input.value).toBe('')
    expect(input.selectionStart).toBe(0)
  })

  it('input event preempts a pending keydown rAF — no double-processing / stale caret', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999-999', cb)

    // Real browsers fire keydown, mutate the DOM, then fire `input` — all
    // before our keydown-scheduled rAF gets a chance to run.
    input.value = '1'
    input.setSelectionRange(1, 1)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }))
    dispatchInput(input, { data: '1', inputType: 'insertText' })

    // The keydown rAF fallback must have been cancelled by the `input` handler.
    await flushRafs()
    expect(input.value).toBe('1')
    expect(input.selectionStart).toBe(1)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('formats live even while an IME composition is active (Android autocorrect wraps typing in composition)', async () => {
    const { bind } = await import('../src/index')
    // Mirrors the real-world bug: Android's on-screen keyboard wraps typing
    // into a plain, letter-accepting field (no `inputmode` — e.g. a plate
    // mask) in an IME composition session for autocorrect/suggestion
    // bookkeeping, even though every keystroke is already a final ASCII
    // character, not a provisional multi-candidate glyph. That composition
    // may never end (no `compositionend`) while the user is still typing a
    // space-less value like a plate number — so deferring formatting until
    // `compositionend` made the mask appear completely non-functional.
    bind(input, 'ZZZ-9999')

    input.dispatchEvent(new Event('compositionstart', { bubbles: true }))
    input.value = 'abc1'
    input.setSelectionRange(4, 4)
    dispatchInput(input, { data: 'abc1', inputType: 'insertCompositionText', isComposing: true })
    // Formatted immediately — not deferred — even though composition hasn't ended.
    expect(input.value).toBe('abc-1')
    expect(input.selectionStart).toBe(5)

    input.value = 'abc-12'
    input.setSelectionRange(6, 6)
    input.dispatchEvent(new Event('compositionend', { bubbles: true }))
    expect(input.value).toBe('abc-12')
    expect(input.selectionStart).toBe(6)
  })

  it('does not re-process on a trailing iOS keyup after input already handled the edit', async () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone OS 17_0 like Mac OS X' })
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999', cb)

    input.value = '1'
    input.setSelectionRange(1, 1)
    dispatchInput(input, { data: '1', inputType: 'insertText' })
    input.dispatchEvent(new KeyboardEvent('keyup', { key: '1', bubbles: true, cancelable: true }))

    await flushRafs()
    expect(cb).toHaveBeenCalledTimes(1)
    expect(input.value).toBe('1')
  })

  it('mid-burst caret stays correct when a middle char is corrected before continuing', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')

    typeCharViaInput(input, '1')
    typeCharViaInput(input, '2')
    // Move caret into the middle and insert a digit there, as a real user
    // correcting a typo mid-burst would.
    input.setSelectionRange(1, 1)
    typeCharViaInput(input, '9')
    expect(input.value).toBe('192')
    expect(input.selectionStart).toBe(2)

    input.setSelectionRange(input.value.length, input.value.length)
    for (const ch of '3456') typeCharViaInput(input, ch)
    expect(input.value).toBe('192-345')
    expect(input.selectionStart).toBe(7)
  })
})
