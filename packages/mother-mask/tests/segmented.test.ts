import { describe, it, expect, vi, afterEach } from 'vitest'
import { applyMask } from '../src/index'

// ---------------------------------------------------------------------------
// Helpers (mirrors tests/stress.test.ts)
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
// applyMask() — segmented is the default; this is the underlying bug fix
// ---------------------------------------------------------------------------

describe('applyMask() — segmented mode (default) keeps fields independent', () => {
  it('replaces a selected segment with a shorter value without shifting the following segments', () => {
    // "25/12/2025" — user selects "12" (the month) and types "3", shrinking it by one char.
    // Browser already spliced this correctly to "25/3/2025"; only the reflow logic was buggy.
    const r = applyMask('25/3/2025', DATE_MASK, 4)
    expect(r).toEqual({ value: '25/3/2025', caret: 4 })
  })

  it('passing { segmented: false } opts back into the historical bleed-through behavior', () => {
    const r = applyMask('25/3/2025', DATE_MASK, 4, { segmented: false })
    expect(r.value).not.toBe('25/3/2025')
    expect(r.value).toBe('25/32/025') // month steals a year digit, year loses one
  })

  it('replaces a selected segment with a same-length value (unaffected either way)', () => {
    const r = applyMask('25/05/2025', DATE_MASK, 5)
    expect(r).toEqual({ value: '25/05/2025', caret: 5 })
  })

  it('replaces a selected segment with a longer value — overflow flows into the next segment', () => {
    // Selecting "12" and typing/pasting "123" over it. Segmented mode never *discards*
    // data (that would risk losing real input — see the array-mask reflow tests in
    // fast-interactions.test.ts) — it only refuses to bleed backward. Forward overflow
    // still flows on, same as the flat algorithm: the extra "3" pushes into the year.
    const r = applyMask('25/123/2025', DATE_MASK, 6)
    expect(r.value).toBe('25/12/3202')
  })

  it('deleting an entire segment leaves it empty instead of pulling the next segment left', () => {
    // Selecting "12" and pressing Delete/Backspace leaves "25//2025".
    const r = applyMask('25//2025', DATE_MASK, 3)
    expect(r.value).toBe('25//2025')
  })

  it('editing the first segment (day) leaves month/year untouched', () => {
    const r = applyMask('3/12/2025', DATE_MASK, 1)
    expect(r.value).toBe('3/12/2025')
  })

  it('editing the last segment (year) still works — no following separator to protect', () => {
    const r = applyMask('25/12/9', DATE_MASK, 7)
    expect(r.value).toBe('25/12/9')
  })

  it('skips a stray non-matching char inside a segment instead of treating it as a boundary', () => {
    // A junk letter landed inside the month segment (e.g. autocorrect); it isn't
    // the segment's separator, so it's just noise to skip over, not a boundary.
    const r = applyMask('25/1x2/2025', DATE_MASK, 7)
    expect(r.value).toBe('25/12/2025')
  })

  it('a fully raw, unformatted digit stream still fills every segment (paste fast path preserved)', () => {
    const r = applyMask('25122025', DATE_MASK, 8)
    expect(r.value).toBe('25/12/2025')
  })

  it('progressively completing a shrunk segment reflows correctly as more digits arrive', () => {
    const step1 = applyMask('25/0/2025', DATE_MASK, 4)
    expect(step1.value).toBe('25/0/2025')
    const step2 = applyMask('25/05/2025', DATE_MASK, 5)
    expect(step2.value).toBe('25/05/2025')
  })
})

// ---------------------------------------------------------------------------
// bind() — segmented is the default; { segmented: false } opts back into flat/reflow
// ---------------------------------------------------------------------------

describe('bind() — segmented date mask keeps day/month/year independent', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('selecting the month and typing a single replacement digit does not disturb the year', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, DATE_MASK) // segmented by default
    input.value = '25/12/2025'
    input.setSelectionRange(3, 5) // select "12"
    press(input, '3', '25/3/2025', 4)
    await flushRafs()
    expect(input.value).toBe('25/3/2025')
  })

  it('continuing to type after a shrinking replace fills the month back in correctly', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, DATE_MASK)
    input.value = '25/12/2025'
    input.setSelectionRange(3, 5) // select "12"
    press(input, '0', '25/0/2025', 4)
    await flushRafs()
    expect(input.value).toBe('25/0/2025')

    press(input, '5', '25/05/2025', 5)
    await flushRafs()
    expect(input.value).toBe('25/05/2025')
  })

  it('pasting a 2-digit replacement over the month keeps everything else in place', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, DATE_MASK)
    input.value = '25/12/2025'
    input.setSelectionRange(3, 5) // select "12"
    const before = input.value.slice(0, 3)
    const after = input.value.slice(5)
    input.value = before + '07' + after
    input.setSelectionRange(5, 5)
    input.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
    await flushRafs(1)
    expect(input.value).toBe('25/07/2025')
  })

  it('deleting the whole month segment (Delete key) leaves day and year untouched', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, DATE_MASK)
    input.value = '25/12/2025'
    input.setSelectionRange(3, 5) // select "12"
    press(input, 'Delete', '25//2025', 3)
    await flushRafs()
    expect(input.value).toBe('25//2025')
  })

  it('{ segmented: false } opts back into flat/reflow mode for this same interaction', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, DATE_MASK, { segmented: false })
    input.value = '25/12/2025'
    input.setSelectionRange(3, 5) // select "12"
    press(input, '3', '25/3/2025', 4)
    await flushRafs()
    expect(input.value).not.toBe('25/3/2025')
  })
})
