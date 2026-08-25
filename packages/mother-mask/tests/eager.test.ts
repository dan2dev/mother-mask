import { describe, it, expect, vi, afterEach } from 'vitest'
import { applyMask, buildMask } from '../src/index'

// ---------------------------------------------------------------------------
// Helpers (mirrors tests/segmented.test.ts)
// ---------------------------------------------------------------------------

async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
}

/** Simulate one keystroke: dispatch keydown, then apply the browser's default action. */
function press(
  input: HTMLInputElement,
  key: string,
  valueAfter: string,
  caretAfter: number,
): void {
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  input.value = valueAfter
  input.setSelectionRange(caretAfter, caretAfter)
}

function setupInput(): HTMLInputElement {
  const input = document.createElement('input')
  document.body.appendChild(input)
  return input
}

const DATE_MASK = '99/99/9999'

// ---------------------------------------------------------------------------
// applyMask() — eager defaults to true (no options needed)
// ---------------------------------------------------------------------------

describe('applyMask() — eager defaults to true', () => {
  it('appends the "/" right after the day segment is complete', () => {
    const r = applyMask('25', DATE_MASK, 2)
    expect(r).toEqual({ value: '25/', caret: 3 })
  })

  it('cascades to the next boundary once the month segment also fills', () => {
    const r = applyMask('2512', DATE_MASK, 4)
    expect(r).toEqual({ value: '25/12/', caret: 6 })
  })

  it('appends a trailing literal suffix once every slot is filled', () => {
    const r = applyMask('123', '999%', 3)
    expect(r).toEqual({ value: '123%', caret: 4 })
  })

  it('does not reveal a separator for a segment that is only partially filled', () => {
    const r = applyMask('2', DATE_MASK, 1)
    expect(r).toEqual({ value: '2', caret: 1 })
  })

  it('leaves an already-complete value untouched when editing an earlier segment', () => {
    const r = applyMask('25/12/2025', DATE_MASK, 1)
    expect(r).toEqual({ value: '25/12/2025', caret: 1 })
  })

  it('reveals the boundary without moving the caret when the edit happened earlier in the string', () => {
    // Raw paste "1225" with the caret still sitting after the first digit —
    // the day segment being complete at the tail is still eagerly revealed,
    // but the caret (mid-string) is left exactly where the browser put it.
    const r = applyMask('1225', DATE_MASK, 1)
    expect(r).toEqual({ value: '12/25/', caret: 1 })
  })

  it('works together with { segmented: false } (flat mode)', () => {
    const r = applyMask('25', DATE_MASK, 2, { segmented: false })
    expect(r).toEqual({ value: '25/', caret: 3 })
  })

  it('reveals leading literals once the (single-char) segment before them is complete', () => {
    const r = applyMask('1', '(((9)))', 1)
    expect(r).toEqual({ value: '(((1)))', caret: 7 })
  })

  it('a mask made entirely of literals is emitted as soon as any input arrives', () => {
    // Degenerate edge case: no slots at all, so the "segment before" the
    // literal run is vacuously complete — the whole literal mask is shown.
    const r = applyMask('123', '---', 3)
    expect(r).toEqual({ value: '---', caret: 3 })
  })

  it('reveals the boundary between the area code and number in an array mask', () => {
    const m = buildMask('11', ['(99) 9999-9999', '(99) 99999-9999'], 2)
    expect(m.process()).toBe('(11) ')
    expect(m.caret).toBe(5)
  })

  it('explicit { eager: true } behaves identically to the default', () => {
    const r = applyMask('25', DATE_MASK, 2, { eager: true })
    expect(r).toEqual({ value: '25/', caret: 3 })
  })
})

// ---------------------------------------------------------------------------
// applyMask() — eager: false opts out of the reveal
// ---------------------------------------------------------------------------

describe('applyMask() — eager: false restores the historical wait-for-next-char behavior', () => {
  it('leaves the trailing separator out until the next segment gets a real character', () => {
    const r = applyMask('25', DATE_MASK, 2, { eager: false })
    expect(r).toEqual({ value: '25', caret: 2 })
  })

  it('does not cascade through multiple completed segments', () => {
    const r = applyMask('2512', DATE_MASK, 4, { eager: false })
    expect(r).toEqual({ value: '25/12', caret: 5 })
  })

  it('does not append a trailing literal suffix once every slot is filled', () => {
    const r = applyMask('123', '999%', 3, { eager: false })
    expect(r).toEqual({ value: '123', caret: 3 })
  })

  it('does not reveal leading literals early for a single-char segment', () => {
    const r = applyMask('1', '(((9)))', 1, { eager: false })
    expect(r).toEqual({ value: '(((1', caret: 4 })
  })

  it('a mask made entirely of literals stays empty until eager is turned on', () => {
    const r = applyMask('123', '---', 3, { eager: false })
    expect(r).toEqual({ value: '', caret: 0 })
  })

  it('opts out together with { segmented: false } (flat mode)', () => {
    const r = applyMask('25', DATE_MASK, 2, { segmented: false, eager: false })
    expect(r).toEqual({ value: '25', caret: 2 })
  })

  it('opts out for array masks too', () => {
    const m = buildMask('11', ['(99) 9999-9999', '(99) 99999-9999'], 2, { eager: false })
    expect(m.process()).toBe('(11')
    expect(m.caret).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// bind() — eager on by default
// ---------------------------------------------------------------------------

describe('bind() — eager reveals separators while typing by default', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('shows "25/" immediately after typing the second day digit, with no options passed', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, DATE_MASK)

    press(input, '2', '2', 1)
    await flushRafs()
    expect(input.value).toBe('2')

    press(input, '5', '25', 2)
    await flushRafs()
    expect(input.value).toBe('25/')
    expect(input.selectionStart).toBe(3)
  })

  it('continues filling the month segment right after the eager separator', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, DATE_MASK)

    input.value = '25/'
    input.setSelectionRange(3, 3)
    press(input, '1', '25/1', 4)
    await flushRafs()
    expect(input.value).toBe('25/1')
  })

  it('cascades through every segment as the user keeps typing', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, DATE_MASK)

    press(input, '2', '2', 1)
    await flushRafs()
    press(input, '5', '25', 2)
    await flushRafs()
    expect(input.value).toBe('25/')

    press(input, '1', '25/1', 4)
    await flushRafs()
    press(input, '2', '25/12', 5)
    await flushRafs()
    expect(input.value).toBe('25/12/')
    expect(input.selectionStart).toBe(6)
  })

  it('a backspace right after an eager reveal removes the separator for good — it is not re-revealed', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, DATE_MASK)

    press(input, '2', '2', 1)
    await flushRafs()
    press(input, '5', '25', 2)
    await flushRafs()
    expect(input.value).toBe('25/')

    // The browser's native Backspace removes the trailing "/" (the caret was
    // right after it), leaving raw "25". Eager must not resurrect the
    // separator it just deleted — otherwise Backspace would appear to do
    // nothing, and the user would need a second press to actually remove a
    // digit (see `eagerForEdit` in bind.ts).
    press(input, 'Backspace', '25', 2)
    await flushRafs()
    expect(input.value).toBe('25')
    expect(input.selectionStart).toBe(2)

    // A second Backspace now removes an actual digit, as expected.
    press(input, 'Backspace', '2', 1)
    await flushRafs()
    expect(input.value).toBe('2')
  })

  it('Delete-forward right after an eager reveal removes the separator for good', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, DATE_MASK)

    press(input, '2', '2', 1)
    await flushRafs()
    press(input, '5', '25', 2)
    await flushRafs()
    expect(input.value).toBe('25/')

    // Caret sits after the eagerly-added "/"; Delete-forward at that
    // position is a no-op for the browser (nothing after the caret) in a
    // real field, but exercised here at the boundary right before it —
    // deleting the "/" itself must not bring it right back either.
    input.setSelectionRange(2, 2)
    press(input, 'Delete', '25', 2)
    await flushRafs()
    expect(input.value).toBe('25')
  })

  it('explicit { eager: true } behaves identically to the default', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, DATE_MASK, { eager: true })

    press(input, '2', '2', 1)
    await flushRafs()
    press(input, '5', '25', 2)
    await flushRafs()
    expect(input.value).toBe('25/')
  })
})

// ---------------------------------------------------------------------------
// bind() — eager: false opts out
// ---------------------------------------------------------------------------

describe('bind() — eager: false opts out of the reveal', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('typing the same digits never adds the separator early', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, DATE_MASK, { eager: false })

    press(input, '2', '2', 1)
    await flushRafs()
    press(input, '5', '25', 2)
    await flushRafs()
    expect(input.value).toBe('25')
  })

  it('the separator only appears once the next segment gets a real digit', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, DATE_MASK, { eager: false })

    press(input, '2', '2', 1)
    await flushRafs()
    press(input, '5', '25', 2)
    await flushRafs()
    expect(input.value).toBe('25')

    press(input, '1', '251', 3)
    await flushRafs()
    expect(input.value).toBe('25/1')
  })
})

// ---------------------------------------------------------------------------
// bind() — eager never resurrects a separator the user just deleted
//
// Regression coverage for the CPF bug report: typing "012" into
// "999.999.999-99" eagerly shows "012.", but Backspacing through that "."
// used to make the mask instantly re-add it — so the very first Backspace
// looked like a no-op, and continuing to type landed a digit *after* a stale
// "." instead of extending the still-incomplete first block.
// ---------------------------------------------------------------------------

const CPF_MASK = '999.999.999-99'

/** Dispatch a real `input` event — the primary path `bind()` uses (see bind.ts). */
function dispatchInput(
  input: HTMLInputElement,
  options: { data?: string | null; inputType?: string } = {},
): void {
  const event = new Event('input', { bubbles: true, cancelable: false })
  Object.defineProperty(event, 'data', { value: options.data ?? null, configurable: true })
  Object.defineProperty(event, 'inputType', { value: options.inputType ?? '', configurable: true })
  Object.defineProperty(event, 'isComposing', { value: false, configurable: true })
  input.dispatchEvent(event)
}

/** Simulate one real-browser keystroke via `input`: the mutation has already landed by the time `input` fires. */
function typeCharViaInput(input: HTMLInputElement, ch: string): void {
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? start
  input.value = input.value.slice(0, start) + ch + input.value.slice(end)
  input.setSelectionRange(start + ch.length, start + ch.length)
  dispatchInput(input, { data: ch, inputType: 'insertText' })
}

/** Simulate one real-browser Backspace via `input`. */
function backspaceViaInput(input: HTMLInputElement): void {
  const pos = input.selectionStart ?? input.value.length
  if (pos === 0) return
  input.value = input.value.slice(0, pos - 1) + input.value.slice(pos)
  input.setSelectionRange(pos - 1, pos - 1)
  dispatchInput(input, { inputType: 'deleteContentBackward' })
}

describe('bind() — eager does not resurrect a separator removed by Backspace/Delete (CPF regression, via real `input` events)', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('reproduces and fixes the exact reported sequence: "012" → "012." → (3× Backspace) → "0" → type "1" → "01"', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, CPF_MASK) // eager on by default

    typeCharViaInput(input, '0')
    typeCharViaInput(input, '1')
    typeCharViaInput(input, '2')
    expect(input.value).toBe('012.') // eager reveals the "." once the first block fills
    expect(input.selectionStart).toBe(4)

    backspaceViaInput(input) // removes the eagerly-added "."
    expect(input.value).toBe('012')
    expect(input.selectionStart).toBe(3)

    backspaceViaInput(input) // removes "2"
    expect(input.value).toBe('01')
    expect(input.selectionStart).toBe(2)

    backspaceViaInput(input) // removes "1"
    expect(input.value).toBe('0')
    expect(input.selectionStart).toBe(1)

    // Typing a digit now must extend the still-incomplete first block, not
    // land after a stale "." — this was the visible bug ("01.").
    typeCharViaInput(input, '1')
    expect(input.value).toBe('01')
    expect(input.selectionStart).toBe(2)
  })

  it('Delete-forward is equally protected from resurrecting a removed separator', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, CPF_MASK)

    typeCharViaInput(input, '0')
    typeCharViaInput(input, '1')
    typeCharViaInput(input, '2')
    expect(input.value).toBe('012.')

    // Delete-forward at the position right before the "." removes it.
    input.setSelectionRange(3, 3)
    input.value = input.value.slice(0, 3) + input.value.slice(4)
    input.setSelectionRange(3, 3)
    dispatchInput(input, { inputType: 'deleteContentForward' })
    expect(input.value).toBe('012')
  })

  it('a full block still eagerly reveals its separator again once re-completed by typing (not by an undone delete)', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, CPF_MASK)

    typeCharViaInput(input, '0')
    typeCharViaInput(input, '1')
    typeCharViaInput(input, '2')
    expect(input.value).toBe('012.')

    backspaceViaInput(input) // "012." → "012" (separator gone, not re-added)
    expect(input.value).toBe('012')

    backspaceViaInput(input) // "012" → "01"
    expect(input.value).toBe('01')

    // Typing the 3rd digit back in is a genuine insert — eager legitimately
    // reveals the separator again, same as the very first time.
    typeCharViaInput(input, '2')
    expect(input.value).toBe('012.')
    expect(input.selectionStart).toBe(4)
  })

  it('has no race condition: a rapid Backspace burst (no rAF between keystrokes) still lands on the correct final value', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, CPF_MASK)

    // `input` is synchronous (no rAF involved), so "rapid" here means what it
    // means for any real browser: each keystroke's `input` event is fully
    // handled, top to bottom, before the next one fires — there is no
    // scheduling window for a stale frame to land out of order.
    typeCharViaInput(input, '0')
    typeCharViaInput(input, '1')
    typeCharViaInput(input, '2')
    expect(input.value).toBe('012.')

    backspaceViaInput(input)
    backspaceViaInput(input)
    backspaceViaInput(input)
    expect(input.value).toBe('0')
    expect(input.selectionStart).toBe(1)
  })

  it('has no race condition on the legacy keydown+rAF fallback path either (typing burst, zero flushes, then settle)', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, CPF_MASK)

    // Drive the digit-typing burst through the `keydown` fallback (as if
    // `input` never fired), queuing all three keystrokes' rAF callbacks
    // before any of them run.
    press(input, '0', '0', 1)
    press(input, '1', '01', 2)
    press(input, '2', '012', 3)
    await flushRafs()
    // Same final state as typing the same three digits with a flush after
    // each — the queued frames re-read live DOM state when they actually
    // run, not the stale snapshot captured at schedule time, so bursting
    // them converges to the identical result.
    expect(input.value).toBe('012.')
    expect(input.selectionStart).toBe(4)
  })

  it('has no race condition on a rapid Backspace-Backspace burst through the legacy fallback path', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, CPF_MASK)

    // Reach "012." the normal way first (flushed), then fire two Backspaces
    // back-to-back with no flush in between — each one's native browser
    // mutation (removing one character) applied immediately, but neither's
    // mask reprocessing has run yet.
    press(input, '0', '0', 1)
    await flushRafs()
    press(input, '1', '01', 2)
    await flushRafs()
    press(input, '2', '012', 3)
    await flushRafs()
    expect(input.value).toBe('012.')

    press(input, 'Backspace', '012', 3) // browser removes the eagerly-added "."
    press(input, 'Backspace', '01', 2) // browser removes "2", queued before the first frame ran
    await flushRafs()

    // Converges to exactly what two flushed Backspaces would produce: the
    // separator is gone for good, and only one real digit was removed by
    // each keystroke — no digit lost, no separator resurrected.
    expect(input.value).toBe('01')
    expect(input.selectionStart).toBe(2)
  })
})
