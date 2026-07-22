import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Helpers — mirrors tests/fast-interactions.test.ts and tests/stress.test.ts,
// adapted to bindDecimal()'s free-growing integer part (no fixed pattern/
// maxlength, no character-type slot restrictions beyond digit/separator/sign).
// ---------------------------------------------------------------------------

/** Flush pending requestAnimationFrame callbacks (one "frame" per call). */
async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
}

/**
 * Simulate ONE keystroke: dispatch keydown (our handler runs synchronously
 * and schedules an rAF), then apply the browser's default action by setting
 * `value`/caret directly — same two-step flow every other suite in this repo
 * uses to model real keydown → native-insert timing.
 */
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

/** Type each character in `chars` back-to-back, appending at the current end. */
function typeChars(
  input: HTMLInputElement,
  chars: string,
  eventName: 'keydown' | 'keyup' = 'keydown',
): void {
  let v = input.value
  for (const ch of chars) {
    v += ch
    press(input, ch, v, v.length, eventName)
  }
}

/** Press Backspace `count` times, removing one char from the end each time. */
function backspaceN(
  input: HTMLInputElement,
  count: number,
  eventName: 'keydown' | 'keyup' = 'keydown',
): void {
  let v = input.value
  let caret = input.selectionStart ?? v.length
  for (let i = 0; i < count; i++) {
    if (caret === 0) break
    v = v.slice(0, caret - 1) + v.slice(caret)
    caret--
    press(input, 'Backspace', v, caret, eventName)
  }
}

/** Insert a single character at `pos` without a selection (mouse-click-then-type). */
function insertAt(input: HTMLInputElement, pos: number, ch: string): void {
  const v = input.value.slice(0, pos) + ch + input.value.slice(pos)
  press(input, ch, v, pos + 1)
}

/** Simulate a mouse drag-select of `[start, end)` followed by typing `ch` over it. */
function selectAndType(input: HTMLInputElement, start: number, end: number, ch: string): void {
  input.setSelectionRange(start, end)
  const v = input.value.slice(0, start) + ch + input.value.slice(end)
  press(input, ch, v, start + 1)
}

/** Simulate pasting `text` at the current caret (or over the current selection). */
function pasteAt(input: HTMLInputElement, text: string): void {
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? start
  const before = input.value.slice(0, start)
  const after = input.value.slice(end)
  input.value = before + text + after
  input.setSelectionRange(start + text.length, start + text.length)
  input.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
}

/** Simulate a mouse click placing the caret at `pos` with no selection. */
function clickAt(input: HTMLInputElement, pos: number): void {
  input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  input.setSelectionRange(pos, pos)
  input.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  input.dispatchEvent(new Event('click', { bubbles: true }))
}

/** Simulate a double-click selecting the whole value (browsers' "select word" on an all-digit field). */
function doubleClickSelectAll(input: HTMLInputElement): void {
  input.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  input.setSelectionRange(0, input.value.length)
}

// A small xorshift PRNG so fuzz runs are deterministic and reproducible.
function makeRng(seed: number): () => number {
  let state = seed || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state |= 0
    return (state >>> 0) / 0xffffffff
  }
}

function setupInput(): HTMLInputElement {
  const input = document.createElement('input')
  document.body.appendChild(input)
  return input
}

// ---------------------------------------------------------------------------
// 1. Fast typing — multiple digits inserted before any rAF fires
// ---------------------------------------------------------------------------

describe('bindDecimal() fast typing — digits inserted before any rAF fires', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('4 digits typed fast cross the thousands-grouping threshold correctly', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    typeChars(input, '1234')
    await flushRafs()
    expect(input.value).toBe('$1,234.00')
  })

  it('7 digits typed fast group into two thousands separators', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    typeChars(input, '1234567')
    await flushRafs()
    expect(input.value).toBe('1,234,567.00')
  })

  it('no keydown is ever defaultPrevented while typing digits (no max-length concept)', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    let anyPrevented = false
    let v = ''
    for (const ch of '123456789012345') {
      v += ch
      const e = new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true })
      input.dispatchEvent(e)
      if (e.defaultPrevented) anyPrevented = true
      input.value = v
      input.setSelectionRange(v.length, v.length)
    }
    await flushRafs()
    expect(anyPrevented).toBe(false)
    expect(input.value).toBe('123,456,789,012,345.00')
  })

  it('typing digit, separator, then fraction digits fast fills the fraction left to right', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    typeChars(input, '423.4')
    await flushRafs()
    expect(input.value).toBe('423.40')
  })

  it('typing past decimalPlaces fast drops the overflow digit instead of shifting the window', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    typeChars(input, '423.4567')
    await flushRafs()
    expect(input.value).toBe('423.45')
  })

  it('rapid keystrokes each schedule their own rAF but converge to one correct final value', async () => {
    const { bindDecimal } = await import('../src/index')
    const cb = vi.fn()
    bindDecimal(input, { prefix: '$', onChange: cb })
    typeChars(input, '9999')
    // Deliberately flush every pending rAF (one per keystroke) rather than
    // just the minimum — every intermediate reformat must still be valid.
    await flushRafs(8)
    expect(input.value).toBe('$9,999.00')
    expect(cb).toHaveBeenLastCalledWith('$9,999.00', 9999)
  })
})

// ---------------------------------------------------------------------------
// 2. Fast delete sequences
// ---------------------------------------------------------------------------

describe('bindDecimal() fast delete sequences', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('backspacing the whole fraction one digit at a time re-pads with zeros each step', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    input.value = '423.42'
    input.setSelectionRange(6, 6)
    backspaceN(input, 1)
    await flushRafs()
    expect(input.value).toBe('423.40')
  })

  it('backspacing through the separator merges then unmerges to drop the last integer digit', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    // "$423.00", caret right after "3" (before "."): backspace removes "3".
    input.value = '$423.00'
    input.setSelectionRange(4, 4)
    backspaceN(input, 1)
    await flushRafs()
    expect(input.value).toBe('$42.00')

    // Now caret right after the "." itself in "$42.00": backspace deletes
    // the "." — the browser has already merged "42" + "00" → "$4200" by the
    // time our handler's rAF reads target.value — which should read as
    // "drop the last integer digit", not "become the integer 4200".
    press(input, 'Backspace', '$4200', 3)
    await flushRafs()
    expect(input.value).toBe('$4.00')
  })

  it('draining an integer-only value one backspace at a time ends empty', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    input.value = '9'
    input.setSelectionRange(1, 1)
    press(input, 'Backspace', '', 0)
    await flushRafs()
    expect(input.value).toBe('')
  })

  it('forward Delete on a fully-typed value behaves like the fast-typing tests expect for bind() — value shrinks correctly', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    input.value = '$1,234.00'
    input.setSelectionRange(2, 2) // caret right after "$1", before ","
    // Delete removes the "1": browser produces "$,234.00"
    press(input, 'Delete', '$,234.00', 2)
    await flushRafs()
    expect(input.value).toBe('$234.00')
  })

  it('rapid backspace burst across the fraction and separator never throws and settles correctly', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    input.value = '$1,234.56'
    input.setSelectionRange(9, 9)
    expect(() => backspaceN(input, 9)).not.toThrow()
    await flushRafs(4)
    expect(input.value).toBe('')
  })
})

// ---------------------------------------------------------------------------
// 3. Simulated mouse interactions — click-to-place-caret, drag-select-retype
// ---------------------------------------------------------------------------

describe('bindDecimal() simulated mouse interactions', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('clicking mid-value to place the caret does not itself mutate the value', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    input.value = '$1,234.56'
    input.setSelectionRange(9, 9)
    clickAt(input, 4) // click between "1," and "234"
    await flushRafs()
    expect(input.value).toBe('$1,234.56')
    expect(input.selectionStart).toBe(4)
  })

  it('click to place caret then type a digit inserts it at that position', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    input.value = '15'
    clickAt(input, 1) // caret between "1" and "5"
    insertAt(input, 1, '2')
    await flushRafs()
    expect(input.value).toBe('125.00')
  })

  it('drag-select two digits then type a replacement digit before any rAF fires', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    input.value = '1234.56'
    selectAndType(input, 1, 3, '9') // select "23", type "9" → "19" + "4.56"
    await flushRafs()
    expect(input.value).toBe('194.56')
  })

  it('double-click select-all then retype replaces the whole value', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    input.value = '$1,234.00'
    input.setSelectionRange(0, 9)
    doubleClickSelectAll(input)
    press(input, '7', '7', 1)
    await flushRafs()
    expect(input.value).toBe('$7.00')
  })

  it('drag-select across the decimal separator and retype collapses to a fresh value', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    input.value = '423.42'
    // Select "3.4" (indices 2..5, spanning the separator) and replace with
    // "9" — the browser produces raw text "4292" (the separator itself was
    // inside the selection, so it's gone too), which re-parses as one
    // continuous integer, not a fresh "429.2".
    selectAndType(input, 2, 5, '9')
    await flushRafs()
    expect(input.value).toBe('4,292.00')
  })

  it('selecting the thousands separator itself and retyping a digit reflows grouping', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    input.value = '1,234.00'
    selectAndType(input, 1, 2, '9') // select "," and replace with "9" → "19234.00"
    await flushRafs()
    expect(input.value).toBe('19,234.00')
  })
})

// ---------------------------------------------------------------------------
// 4. Copy / cut / paste edge cases
// ---------------------------------------------------------------------------

describe('bindDecimal() copy / cut / paste edge cases', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('pastes over a selection, combining the surviving digits with the pasted ones', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    input.value = '1234.56'
    input.setSelectionRange(1, 3) // select "23"
    pasteAt(input, '99')
    await flushRafs(1)
    // Surviving "1" + pasted "99" + surviving "4" regroups as the integer grows to 4 digits.
    expect(input.value).toBe('1,994.56')
  })

  it('pastes a fully-formatted currency string idempotently', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    input.setSelectionRange(0, 0)
    pasteAt(input, '$1,234.56')
    await flushRafs(1)
    expect(input.value).toBe('$1,234.56')
  })

  it('pastes noisy text (spaces, currency symbols) and keeps only the digits/separator', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    input.setSelectionRange(0, 0)
    pasteAt(input, '  $ 1 234.56 USD ')
    await flushRafs(1)
    expect(input.value).toBe('1,234.56')
  })

  it('pastes a negative value when allowNegative is enabled', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$', allowNegative: true })
    input.setSelectionRange(0, 0)
    pasteAt(input, '-1234.5')
    await flushRafs(1)
    expect(input.value).toBe('-$1,234.50')
  })

  it('pastes a negative value that is dropped when allowNegative is disabled (default)', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    input.setSelectionRange(0, 0)
    pasteAt(input, '-1234.5')
    await flushRafs(1)
    expect(input.value).toBe('$1,234.50')
  })

  it('replaces the entire value on paste when everything was selected first (Ctrl+A then paste)', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    input.value = '9,999.99'
    input.setSelectionRange(0, 8)
    pasteAt(input, '42')
    await flushRafs(1)
    expect(input.value).toBe('42.00')
  })

  it('a cut (no paste/keydown fired) leaves the raw post-cut value unmasked until the next interaction', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    input.value = '$1,234.56'
    input.setSelectionRange(0, 9)
    // Simulate the browser's native cut: selection removed, only a 'cut'
    // event fires — bindDecimal does not listen for it (same as bind()),
    // so nothing reformats until the next keydown/paste.
    input.value = ''
    input.dispatchEvent(new Event('cut', { bubbles: true, cancelable: true }))
    expect(input.value).toBe('')
    // The next keystroke (typing fresh digits) still formats correctly.
    typeChars(input, '5')
    await flushRafs()
    expect(input.value).toBe('$5.00')
  })
})

// ---------------------------------------------------------------------------
// 5. Negative-sign interactions
// ---------------------------------------------------------------------------

describe('bindDecimal() negative-sign interactions', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('typing "-" anywhere in the digit stream (not just at the start) still flips the sign', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { allowNegative: true })
    input.value = '42'
    input.setSelectionRange(2, 2)
    // Types "-" in the middle: "4-2"
    insertAt(input, 1, '-')
    await flushRafs()
    expect(input.value).toBe('-42.00')
  })

  it('backspacing the literal "-" character turns the value back positive', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$', allowNegative: true })
    input.value = '-$42.00'
    input.setSelectionRange(1, 1) // caret right after "-"
    backspaceN(input, 1)
    await flushRafs()
    expect(input.value).toBe('$42.00')
  })

  it('typing a second "-" once already negative does not toggle back to positive (it is dropped as noise)', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { allowNegative: true })
    input.value = '-42'
    input.setSelectionRange(3, 3)
    insertAt(input, 3, '-')
    await flushRafs()
    expect(input.value).toBe('-42.00')
  })
})

// ---------------------------------------------------------------------------
// 6. iOS (keyup) parity for fast interactions
// ---------------------------------------------------------------------------

describe('bindDecimal() fast interactions — iOS (keyup events)', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('fast digit burst via keyup reaches the correct final masked value', async () => {
    vi.stubGlobal('navigator', { userAgent: 'iPad; CPU OS 16_0 like Mac OS X' })
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    typeChars(input, '1234', 'keyup')
    await flushRafs()
    expect(input.value).toBe('$1,234.00')
  })

  it('fast backspace burst via keyup drains correctly', async () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone; CPU iPhone OS 16_0 like Mac OS X' })
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    input.value = '423.42'
    input.setSelectionRange(6, 6)
    backspaceN(input, 6, 'keyup')
    await flushRafs(2)
    expect(input.value).toBe('')
  })

  it('select-and-retype via keyup produces the same result as keydown', async () => {
    vi.stubGlobal('navigator', { userAgent: 'iPad; CPU OS 16_0 like Mac OS X' })
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input)
    input.value = '1234.56'
    input.setSelectionRange(1, 3)
    const v = input.value.slice(0, 1) + '9' + input.value.slice(3)
    press(input, '9', v, 2, 'keyup')
    await flushRafs()
    expect(input.value).toBe('194.56')
  })
})

// ---------------------------------------------------------------------------
// 7. Locale / options combos exercised under fast interaction
// ---------------------------------------------------------------------------

describe('bindDecimal() fast interactions — locale and option combinations', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('EU-style separators (comma decimal, dot thousands) format correctly under fast typing', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { separator: '.', decimalSeparator: ',', suffix: ' €' })
    typeChars(input, '1234')
    await flushRafs()
    expect(input.value).toBe('1.234,00 €')
  })

  it('a numeric-keypad "." is normalized to the configured "," decimalSeparator mid-burst', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { decimalSeparator: ',' })
    typeChars(input, '42')
    input.value = '42.'
    press(input, '.', '42.', 3)
    input.value = '42,4'
    press(input, '4', '42,4', 4)
    await flushRafs()
    expect(input.value).toBe('42,40')
  })

  it('decimalPlaces: 0 (whole numbers) never opens a fraction segment even if "." is typed fast', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { decimalPlaces: 0, suffix: ' units' })
    typeChars(input, '42.99')
    await flushRafs()
    expect(input.value).toBe('4,299 units')
  })

  it('segmented: false (no thousands grouping) still fast-formats correctly', async () => {
    const { bindDecimal } = await import('../src/index')
    bindDecimal(input, { segmented: false })
    typeChars(input, '1234567')
    await flushRafs()
    expect(input.value).toBe('1234567.00')
  })
})

// ---------------------------------------------------------------------------
// 8. Randomized fuzz — invariant checks across many simulated user sessions
// ---------------------------------------------------------------------------

describe('bindDecimal() randomized user-interaction fuzzing (invariant checks)', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  function checkInvariants(value: string, opts: { decimalPlaces: number; decimalSeparator: string }): void {
    if (value === '') return
    const sepIdx = value.indexOf(opts.decimalSeparator)
    if (opts.decimalPlaces > 0) {
      // Exactly one decimal separator, and the fraction is exactly decimalPlaces wide.
      expect(sepIdx).toBeGreaterThanOrEqual(0)
      const fracPart = value.slice(sepIdx + opts.decimalSeparator.length)
      const fracDigitsOnly = fracPart.replace(/\D/g, '')
      expect(fracDigitsOnly.length).toBe(opts.decimalPlaces)
    }
  }

  it('30 random typing/deleting/pasting sessions each converge to an idempotent, parseable value', async () => {
    const { applyDecimalMask, unmaskDecimal } = await import('../src/decimal-mask')
    const digitsAndSep = '0123456789.'

    for (let seed = 1; seed <= 30; seed++) {
      vi.resetModules()
      const mod = await import('../src/index')
      const rng = makeRng(seed * 104729)
      const opts = { decimalPlaces: 2, prefix: '$' }

      const el = document.createElement('input')
      document.body.appendChild(el)
      mod.bindDecimal(el, opts)

      const opCount = 5 + Math.floor(rng() * 15)
      for (let i = 0; i < opCount; i++) {
        const roll = rng()
        const v = el.value
        if (roll < 0.55) {
          const ch = digitsAndSep[Math.floor(rng() * digitsAndSep.length)]
          const pos = Math.floor(rng() * (v.length + 1))
          el.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }))
          el.value = v.slice(0, pos) + ch + v.slice(pos)
          el.setSelectionRange(pos + 1, pos + 1)
        } else if (roll < 0.8 && v.length > 0) {
          const pos = 1 + Math.floor(rng() * v.length)
          el.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }),
          )
          el.value = v.slice(0, pos - 1) + v.slice(pos)
          el.setSelectionRange(pos - 1, pos - 1)
        } else {
          const chunkLen = 1 + Math.floor(rng() * 4)
          let chunk = ''
          for (let j = 0; j < chunkLen; j++) chunk += digitsAndSep[Math.floor(rng() * digitsAndSep.length)]
          const pos = Math.floor(rng() * (v.length + 1))
          el.value = v.slice(0, pos) + chunk + v.slice(pos)
          el.setSelectionRange(pos + chunk.length, pos + chunk.length)
          el.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
        }
      }

      await flushRafs(3)

      // Invariant 1: re-applying the mask to the settled value is a no-op.
      const settled = el.value
      if (settled !== '') {
        const reapplied = applyDecimalMask(settled, settled.length, opts)
        expect(reapplied.value).toBe(settled)
      }
      // Invariant 2: exactly one 2-digit fraction segment when non-empty.
      checkInvariants(settled, { decimalPlaces: 2, decimalSeparator: '.' })
      // Invariant 3: always parses to a finite number.
      expect(Number.isFinite(unmaskDecimal(settled, opts))).toBe(true)
      // Invariant 4: caret stays within bounds.
      const c = el.selectionStart ?? 0
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(el.value.length)

      el.remove()
    }
  })

  it('sustained burst of 150 fast keystrokes (digits + occasional separator) never throws', async () => {
    const { bindDecimal, applyDecimalMask } = await import('../src/index')
    bindDecimal(input, { prefix: '$' })
    const rng = makeRng(2026)
    let v = ''
    let separatorUsed = false
    for (let i = 0; i < 150; i++) {
      const useSep = !separatorUsed && rng() < 0.02
      const ch = useSep ? '.' : '0123456789'[Math.floor(rng() * 10)]
      if (useSep) separatorUsed = true
      v += ch
      expect(() => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }))
      }).not.toThrow()
      input.value = v
      input.setSelectionRange(v.length, v.length)
    }
    await flushRafs(2)
    expect(applyDecimalMask(input.value, input.value.length, { prefix: '$' }).value).toBe(input.value)
  })
})
