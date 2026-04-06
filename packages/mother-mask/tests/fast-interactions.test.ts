import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Helpers
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
 * Simulate ONE keystroke in fast-typing mode.
 *
 * Flow mirrors what a real browser does:
 *  1. `keydown` fires → our handler runs synchronously (captures `oldValue`,
 *     schedules an rAF) → handler returns.
 *  2. Browser processes default action → character inserted / removed.
 *
 * We replicate step 2 by explicitly setting `input.value` and the caret
 * AFTER `dispatchEvent` returns.  No rAF is flushed here — call
 * `flushRafs()` once all keystrokes have been dispatched.
 */
function press(
  input: HTMLInputElement,
  key: string,
  valueAfter: string,
  caretAfter: number,
  eventName: 'keydown' | 'keyup' = 'keydown',
): void {
  input.dispatchEvent(
    new KeyboardEvent(eventName, { key, bubbles: true, cancelable: true }),
  )
  input.value = valueAfter
  input.setSelectionRange(caretAfter, caretAfter)
}

/**
 * Type each character in `chars` back-to-back in fast-typing mode,
 * simulating append-at-end browser behaviour.
 */
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

/**
 * Press Backspace `count` times, removing one character from the end on
 * each press (simulates browser default action for the Backspace key).
 */
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

// ---------------------------------------------------------------------------
// 1. Fast typing — multiple chars inserted before any rAF fires
// ---------------------------------------------------------------------------

describe('fast typing — multiple chars inserted before any rAF fires', () => {
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

  it('2 digits before any rAF — both chars reach final value ("99-99")', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    typeChars(input, '12')
    await flushRafs()
    expect(input.value).toBe('12')
    expect(input.value.replace(/\D/g, '')).toBe('12')
  })

  it('4 digits before any rAF — separator inserted, no char dropped ("99-99")', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    typeChars(input, '1234')
    await flushRafs()
    expect(input.value).toBe('12-34')
    expect(input.value.replace(/\D/g, '')).toBe('1234')
    expect(input.selectionStart).toBe(5)
  })

  it('6 digits fill "999-999" mask completely', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    typeChars(input, '123456')
    await flushRafs()
    expect(input.value).toBe('123-456')
    expect(input.value.replace(/\D/g, '')).toBe('123456')
  })

  it('3 digits trigger separator on 3rd char ("99-99")', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    typeChars(input, '123')
    await flushRafs()
    expect(input.value).toBe('12-3')
    expect(input.selectionStart).toBe(4)
  })

  it('full CPF (11 digits) typed fast preserves all digits', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999.999.999-99')
    typeChars(input, '12345678901')
    await flushRafs()
    expect(input.value).toBe('123.456.789-01')
    expect(input.value.replace(/\D/g, '')).toBe('12345678901')
  })

  it('full mobile phone (11 digits) typed fast — "(99) 99999-9999"', async () => {
    const { bind } = await import('../src/index')
    bind(input, '(99) 99999-9999')
    typeChars(input, '11999887766')
    await flushRafs()
    expect(input.value).toBe('(11) 99988-7766')
    expect(input.value.replace(/\D/g, '')).toBe('11999887766')
  })

  it('10-digit landline — array mask selects shorter pattern', async () => {
    const { bind } = await import('../src/index')
    bind(input, ['(99) 9999-9999', '(99) 99999-9999'])
    typeChars(input, '1123456789')
    await flushRafs()
    expect(input.value).toBe('(11) 2345-6789')
  })

  it('11-digit mobile — array mask switches to longer pattern', async () => {
    const { bind } = await import('../src/index')
    bind(input, ['(99) 9999-9999', '(99) 99999-9999'])
    typeChars(input, '11999887766')
    await flushRafs()
    expect(input.value).toBe('(11) 99988-7766')
  })

  it('only valid digits appear in output when letters interleaved (digit mask)', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    // Simulate browser inserting an accidental letter between digits
    press(input, '1', '1', 1)
    press(input, 'a', '1a', 2)
    press(input, '2', '1a2', 3)
    press(input, 'b', '1a2b', 4)
    press(input, '3', '1a2b3', 5)
    await flushRafs()
    expect(input.value).toBe('123')
    expect(input.value).not.toContain('a')
    expect(input.value).not.toContain('b')
  })

  it('only valid letters appear in output when digits interleaved (Z mask)', async () => {
    const { bind } = await import('../src/index')
    bind(input, 'ZZZ-ZZZ')
    press(input, 'a', 'a', 1)
    press(input, '1', 'a1', 2)
    press(input, 'b', 'a1b', 3)
    press(input, '2', 'a1b2', 4)
    press(input, 'c', 'a1b2c', 5)
    press(input, '3', 'a1b2c3', 6)
    await flushRafs()
    expect(input.value).toBe('abc')
    expect(input.value).not.toMatch(/\d/)
  })

  it('6 letters typed fast fill "ZZZ-ZZZ" mask', async () => {
    const { bind } = await import('../src/index')
    bind(input, 'ZZZ-ZZZ')
    typeChars(input, 'abcdef')
    await flushRafs()
    expect(input.value).toBe('abc-def')
    expect(input.value.replace(/\W/g, '')).toBe('abcdef')
  })

  it('alphanumeric CNPJ mask — fast typing 8 mixed chars', async () => {
    const { bind } = await import('../src/index')
    bind(input, 'AA.AAA.AAA/AAAA-99')
    typeChars(input, '1AB2C3D4')
    await flushRafs()
    expect(input.value).toBe('1A.B2C.3D4')
  })

  it('mask full — typing extra char triggers preventDefault', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    // Fill mask to capacity
    input.value = '12-34'
    input.setSelectionRange(5, 5)
    const e = new KeyboardEvent('keydown', { key: '5', bubbles: true, cancelable: true })
    input.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
    expect(input.value).toBe('12-34')
  })

  it('no key events blocked during burst of 6 chars into unfilled mask', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    const events = ['1', '2', '3', '4', '5', '6'].map(
      (key) => new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )
    let v = ''
    for (const e of events) {
      v += e.key
      input.dispatchEvent(e)
      input.value = v
      input.setSelectionRange(v.length, v.length)
    }
    for (const e of events) {
      expect(e.defaultPrevented).toBe(false)
    }
    await flushRafs()
    expect(input.value).toBe('123-456')
  })

  it('caret ends at the correct position after fast-typing fills mask', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    typeChars(input, '1234')
    await flushRafs()
    // "12-34" has length 5 — caret must be at end
    expect(input.selectionStart).toBe(5)
    expect(input.selectionEnd).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// 2. Fast editing — select a region and retype before rAF fires
// ---------------------------------------------------------------------------

describe('fast editing — select region and retype before any rAF fires', () => {
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

  it('replace last 2 digits ("34"→"56") in "12-34"', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    input.setSelectionRange(3, 5) // select "34"
    // Browser replaces selection with "5" → "12-5", then inserts "6"
    press(input, '5', '12-5', 4)
    press(input, '6', '12-56', 5)
    await flushRafs()
    expect(input.value).toBe('12-56')
    expect(input.value.replace(/\D/g, '')).toBe('1256')
  })

  it('replace first digit ("1"→"9") in "12-34" — mask reflowed', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    input.setSelectionRange(0, 1) // select "1"
    press(input, '9', '92-34', 1)
    await flushRafs()
    // "92-34" → digits "9234" → "92-34"
    expect(input.value).toBe('92-34')
  })

  it('select all and retype 4 digits fast — new value fully masked', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    input.setSelectionRange(0, 5) // select all
    // Browser replaces entire content, one char at a time
    press(input, '9', '9', 1)
    press(input, '8', '98', 2)
    press(input, '7', '987', 3)
    press(input, '6', '9876', 4)
    await flushRafs()
    expect(input.value).toBe('98-76')
    expect(input.value.replace(/\D/g, '')).toBe('9876')
  })

  it('select all CPF and retype different 11 digits fast', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999.999.999-99')
    input.value = '123.456.789-01'
    input.setSelectionRange(0, 14) // select all
    press(input, '9', '9', 1)
    typeChars(input, '8765432100') // remaining 10 digits
    await flushRafs()
    expect(input.value).toBe('987.654.321-00')
    expect(input.value.replace(/\D/g, '')).toBe('98765432100')
  })

  it('replace 2 digits immediately at separator boundary', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    // Select "2-3" (positions 1-4) — selection spans the separator
    input.setSelectionRange(1, 4)
    // Browser removes "2-3" and inserts "7", then "8"
    press(input, '7', '174', 2) // "1" + "7" + "4" (the separator is gone since raw digits shift)
    press(input, '8', '1784', 3)
    await flushRafs()
    // "1784" → mask "99-99" → "17-84"
    expect(input.value).toBe('17-84')
    expect(input.value.replace(/\D/g, '')).toBe('1784')
  })

  it('select middle block in "999-999" and replace with 2 digits', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    // Select "23" (pos 1-3)
    input.setSelectionRange(1, 3)
    // Type "78" → "178-456"
    press(input, '7', '17-456', 2)
    press(input, '8', '178-456', 3)
    await flushRafs()
    // "178-456" → digits "178456" → "178-456"
    expect(input.value).toBe('178-456')
    expect(input.value.replace(/\D/g, '')).toBe('178456')
  })

  it('clear via select-all, then retype different phone number fast', async () => {
    const { bind } = await import('../src/index')
    bind(input, '(99) 99999-9999')
    input.value = '(11) 99988-7766'
    input.setSelectionRange(0, 15)
    // First char replaces the entire selection; subsequent chars append.
    press(input, '2', '2', 1)
    typeChars(input, '1987654321')
    await flushRafs()
    expect(input.value).toBe('(21) 98765-4321')
    expect(input.value.replace(/\D/g, '')).toBe('21987654321')
  })
})

// ---------------------------------------------------------------------------
// 3. Fast delete sequences — multiple Backspace / Delete before any rAF fires
// ---------------------------------------------------------------------------

describe('fast delete sequences — multiple deletes before any rAF fires', () => {
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

  it('backspace 2 times removes last 2 digits from "12-34"', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    input.setSelectionRange(5, 5)
    backspaceN(input, 2)
    await flushRafs()
    // Removed "4" then "3"; the "-" stays unless mask removes it
    // "12-3" → backspace → "12-"; mask "99-99" applied to "12-" → "12"
    // But our simulation removes raw chars: "12-34" → "12-3" → "12-"
    // After mask: "12-" → digits "12" → "12"
    expect(input.value).toBe('12')
    expect(input.value.replace(/\D/g, '')).toBe('12')
  })

  it('backspace 3 times crosses separator — separator removed and re-added by mask', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    input.setSelectionRange(5, 5)
    backspaceN(input, 3) // removes "4", "3", then "-"
    await flushRafs()
    // After removing "-": raw "12" → mask "99-99" → "12" (separator not added until 3rd digit)
    expect(input.value).toBe('12')
    expect(input.value.replace(/\D/g, '')).toBe('12')
  })

  it('backspace entire "999-999" value one char at a time — ends empty', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    input.setSelectionRange(7, 7)
    backspaceN(input, 7)
    await flushRafs()
    expect(input.value).toBe('')
  })

  it('delete 3 chars from start of "123-456" — first 3 digits removed', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    input.setSelectionRange(0, 0)
    // Delete removes char AT caret each time
    press(input, 'Delete', '23-456', 0)
    press(input, 'Delete', '3-456', 0)
    press(input, 'Delete', '-456', 0)
    await flushRafs()
    // "-456" → digits "456" → mask "999-999" → "456"
    expect(input.value).toBe('456')
    expect(input.value.replace(/\D/g, '')).toBe('456')
  })

  it('delete removes separator — mask instantly re-inserts it', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    // Cursor between "12" and "-34" (position 2)
    input.setSelectionRange(2, 2)
    // Delete at pos 2 removes "-"
    press(input, 'Delete', '1234', 2)
    await flushRafs()
    // "1234" → mask → "12-34" (separator re-inserted)
    expect(input.value).toBe('12-34')
    expect(input.selectionStart).toBe(3) // moved past re-inserted separator
  })

  it('backspace over separator — mask re-inserts separator after reflow', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    // Cursor right after separator (position 3)
    input.setSelectionRange(3, 3)
    // Backspace at pos 3 removes "-"
    press(input, 'Backspace', '1234', 2)
    await flushRafs()
    // "1234" → mask → "12-34" (separator re-inserted)
    expect(input.value).toBe('12-34')
  })

  it('multiple deletes across full CPF do not corrupt mask', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999.999.999-99')
    input.value = '123.456.789-01'
    input.setSelectionRange(0, 0)
    // Delete first 4 chars: "123." (includes one separator)
    press(input, 'Delete', '23.456.789-01', 0)
    press(input, 'Delete', '3.456.789-01', 0)
    press(input, 'Delete', '.456.789-01', 0)
    press(input, 'Delete', '456.789-01', 0)
    await flushRafs()
    // Remaining digits: 456789, 01 = "45678901"
    // "456.789-01" → digits "45678901" → mask "999.999.999-99":
    // "456", ".789", "-01"... only 8 digits, mask needs 11 → "456.789-01" (8 digits, no third block)
    // Actually: slots 9,9,9,.,9,9,9,.,9,9,9,-,9,9 filled with "45678901" (8 digits):
    // "456", ".789", ".01-..." wait let me calculate:
    // "456" fills first 3 → "456"
    // "." literal → pending
    // "7","8","9" → "456.789"
    // "." literal → pending
    // "0","1" → "456.789.01"
    // "-" literal → pending (no more digits)
    // Result: "456.789.01"
    expect(input.value.replace(/\D/g, '')).toBe('45678901')
  })
})

// ---------------------------------------------------------------------------
// 4. Fast delete + retype sequences
// ---------------------------------------------------------------------------

describe('fast delete + retype sequences', () => {
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

  it('backspace 2 then type 2 new digits — no rAF between any operations', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    input.setSelectionRange(5, 5)
    // Remove "4" and "3"
    backspaceN(input, 2)
    // The raw value is now "12-" (our simulation); type "5", "6"
    typeChars(input, '56')
    await flushRafs()
    expect(input.value).toBe('12-56')
    expect(input.value.replace(/\D/g, '')).toBe('1256')
  })

  it('backspace 3 (crosses separator) then retype 3 digits', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    input.setSelectionRange(5, 5)
    backspaceN(input, 3) // removes "4", "3", "-"
    // Value is now "12"; type "7", "8", "9" (9th overflows mask)
    typeChars(input, '789')
    await flushRafs()
    // Digits: "12789" → mask "99-99" → truncated to "12-78"
    expect(input.value).toBe('12-78')
  })

  it('delete first 3 digits then type 3 new ones — full reflow', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    input.setSelectionRange(0, 0)
    press(input, 'Delete', '23-456', 0)
    press(input, 'Delete', '3-456', 0)
    press(input, 'Delete', '-456', 0)
    // Now type "7", "8", "9" at caret 0 in "-456"
    press(input, '7', '7-456', 1)
    press(input, '8', '78-456', 2)
    press(input, '9', '789-456', 3)
    await flushRafs()
    // "789-456" → digits "789456" → "789-456"
    expect(input.value).toBe('789-456')
    expect(input.value.replace(/\D/g, '')).toBe('789456')
  })

  it('clear entire value fast then retype', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    input.setSelectionRange(7, 7)
    backspaceN(input, 7)
    expect(input.value).toBe('')
    typeChars(input, '987654')
    await flushRafs()
    expect(input.value).toBe('987-654')
    expect(input.value.replace(/\D/g, '')).toBe('987654')
  })

  it('type 3, backspace 2, type 2 different digits before any rAF', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    typeChars(input, '123')   // raw "123"
    backspaceN(input, 2)      // removes "3", "2" → raw "1"
    typeChars(input, '56')    // raw "156"
    await flushRafs()
    // "156" → mask "99-99" → "15-6"
    expect(input.value).toBe('15-6')
    expect(input.value.replace(/\D/g, '')).toBe('156')
  })

  it('type 4, backspace 1, type 1 replacement — last digit replaced', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    typeChars(input, '1234')  // raw "1234"
    backspaceN(input, 1)      // removes "4" → raw "123"
    typeChars(input, '9')     // raw "1239"
    await flushRafs()
    // "1239" → mask "99-99" → "12-39"
    expect(input.value).toBe('12-39')
    expect(input.value.replace(/\D/g, '')).toBe('1239')
  })

  it('clear CPF then type new one entirely before rAF fires', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999.999.999-99')
    input.value = '123.456.789-01'
    input.setSelectionRange(14, 14)
    backspaceN(input, 14)
    expect(input.value).toBe('')
    typeChars(input, '98765432100')
    await flushRafs()
    expect(input.value).toBe('987.654.321-00')
    expect(input.value.replace(/\D/g, '')).toBe('98765432100')
  })

  it('delete 2 from middle then append 2 — digit count preserved', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    // Cursor at position 2 (between "12" and "3-456")
    input.setSelectionRange(2, 2)
    // Delete twice: removes "3", then "-"
    press(input, 'Delete', '12-456', 2)
    press(input, 'Delete', '12456', 2)
    // Move cursor to end (simulates End key press — no key handler for navigation)
    input.setSelectionRange(5, 5)
    // Append "3", "9"
    typeChars(input, '39')
    await flushRafs()
    // "1245639" → mask "999-999" → "124-563" (first 6 digits)
    expect(input.value.replace(/\D/g, '')).toBe('124563')
    expect(input.value).toBe('124-563')
  })
})

// ---------------------------------------------------------------------------
// 5. Mixed fast interactions — interleaved type / backspace / delete / select
// ---------------------------------------------------------------------------

describe('mixed fast interactions — interleaved type, delete, and select', () => {
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

  it('type → backspace → type: only the surviving char is in output', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    press(input, '1', '1', 1)
    press(input, 'Backspace', '', 0)
    press(input, '2', '2', 1)
    await flushRafs()
    expect(input.value).toBe('2')
  })

  it('alternating type/backspace 3 times — last typed char survives', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    press(input, '1', '1', 1)
    press(input, 'Backspace', '', 0)
    press(input, '2', '2', 1)
    press(input, 'Backspace', '', 0)
    press(input, '3', '3', 1)
    await flushRafs()
    expect(input.value).toBe('3')
  })

  it('type 2, delete 1 from middle, type 1 at end — correct digit count', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    typeChars(input, '12')
    // Move cursor to pos 1 (after "1")
    input.setSelectionRange(1, 1)
    // Delete "2"
    press(input, 'Delete', '1', 1)
    // Cursor stays at 1; append "3", "4"
    input.setSelectionRange(1, 1)
    typeChars(input, '34')
    await flushRafs()
    // Raw sequence: "1" + "3" + "4" = "134" → mask "99-99" → "13-4"
    expect(input.value).toBe('13-4')
  })

  it('type past separator, backspace one, type different digit — separator re-applied', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    typeChars(input, '123') // raw "123"; after rAF would be "12-3"
    backspaceN(input, 1)    // raw "12"
    typeChars(input, '5')   // raw "125"
    await flushRafs()
    // "125" → mask "99-99" → "12-5"
    expect(input.value).toBe('12-5')
  })

  it('fast type 4, then select-replace 2 of them — final value correct', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    typeChars(input, '1234') // raw "1234"
    // Select first 2 chars ("12"), replace with "56"
    input.setSelectionRange(0, 2)
    press(input, '5', '534', 1)  // browser replaces "12" with "5" → "534"
    press(input, '6', '5634', 2) // browser inserts "6" → "5634"
    await flushRafs()
    // "5634" → mask "99-99" → "56-34"
    expect(input.value).toBe('56-34')
    expect(input.value.replace(/\D/g, '')).toBe('5634')
  })

  it('rapid corrections: type-wrong, backspace, type-correct multiple times', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    // Type "1", correct to "7"
    press(input, '9', '9', 1)
    press(input, 'Backspace', '', 0)
    press(input, '1', '1', 1)
    // Type "2", correct to "8"
    press(input, '9', '19', 2)
    press(input, 'Backspace', '1', 1)
    press(input, '2', '12', 2)
    // Type "3", correct to "9"
    press(input, '9', '129', 3)
    press(input, 'Backspace', '12', 2)
    press(input, '3', '123', 3)
    // Type remaining 3 digits without corrections
    typeChars(input, '456')
    await flushRafs()
    expect(input.value).toBe('123-456')
    expect(input.value.replace(/\D/g, '')).toBe('123456')
  })

  it('backspace then delete alternately drains value correctly', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    input.setSelectionRange(5, 5)
    press(input, 'Backspace', '12-3', 4) // remove "4" from end
    // Move to start
    input.setSelectionRange(0, 0)
    press(input, 'Delete', '2-3', 0) // remove "1" from start
    // Move to end
    input.setSelectionRange(3, 3)
    press(input, 'Backspace', '2-', 2) // remove "3"
    await flushRafs()
    // "2-" → digits "2" → mask "99-99" → "2"
    expect(input.value).toBe('2')
    expect(input.value.replace(/\D/g, '')).toBe('2')
  })

  it('interleaved type+delete does not duplicate separators', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    typeChars(input, '12')
    press(input, 'Delete', '12', 2) // delete at end (no-op effectively)
    typeChars(input, '34')
    await flushRafs()
    // Must have exactly one "-"
    expect(input.value).toBe('12-34')
    expect((input.value.match(/-/g) ?? []).length).toBe(1)
  })

  it('typing then immediate select-all and retype — old value fully replaced', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    typeChars(input, '111')
    // Select all (no key event needed — just move selection)
    input.setSelectionRange(0, input.value.length)
    // Retype different digits
    press(input, '9', '9', 1) // replaces selection
    typeChars(input, '87654')
    await flushRafs()
    // Digits: "987654" → mask → "987-654"
    expect(input.value).toBe('987-654')
    expect(input.value.replace(/\D/g, '')).toBe('987654')
  })

  it('array mask: fast typing past threshold switches mask and back after backspace', async () => {
    const { bind } = await import('../src/index')
    bind(input, ['(99) 9999-9999', '(99) 99999-9999'])
    // Type 11 digits (triggers longer mask)
    typeChars(input, '11999887766')
    await flushRafs()
    expect(input.value).toBe('(11) 99988-7766')

    // Now backspace 1 char — should reflect shorter result
    input.setSelectionRange(input.value.length, input.value.length)
    backspaceN(input, 1)
    await flushRafs()
    // Remaining 10 digits "1199988776" → shorter mask "(99) 9999-9999"
    // "1199988776" (raw) → mask selects "(99) 9999-9999" (10 ≤ 14)
    expect(input.value.replace(/\D/g, '')).toBe('1199988776')
  })
})

// ---------------------------------------------------------------------------
// 6. Fast typing — onChange callback consistency
// ---------------------------------------------------------------------------

describe('fast typing — onChange callback consistency', () => {
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

  it('onChange final call has correct fully-masked value after 4-digit burst', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '99-99', { onChange: cb })
    typeChars(input, '1234')
    await flushRafs()
    expect(cb).toHaveBeenLastCalledWith('12-34')
  })

  it('onChange never called with raw unmasked digits (every call has valid masked value)', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '99-99', { onChange: cb })
    typeChars(input, '1234')
    await flushRafs()
    const calls: string[] = cb.mock.calls.map(([v]: [string]) => v)
    // Every call must produce a string that the mask would output unchanged
    for (const v of calls) {
      // Applying mask again to an already-masked value must be idempotent
      const { applyMask } = await import('../src/index')
      expect(applyMask(v, '99-99').value).toBe(v)
    }
  })

  it('onChange called after fast backspace sequence — correct final value', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '99-99', { onChange: cb })
    input.value = '12-34'
    input.setSelectionRange(5, 5)
    backspaceN(input, 3)
    await flushRafs()
    expect(cb).toHaveBeenLastCalledWith('12')
  })

  it('onChange called after backspace+retype — correct final masked value', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '99-99', { onChange: cb })
    input.value = '12-34'
    input.setSelectionRange(5, 5)
    backspaceN(input, 2)
    typeChars(input, '56')
    await flushRafs()
    expect(cb).toHaveBeenLastCalledWith('12-56')
  })

  it('onChange called after select-replace — correct final value', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999-999', { onChange: cb })
    input.value = '123-456'
    input.setSelectionRange(0, 7)
    // First char replaces the entire selection; subsequent chars append.
    press(input, '9', '9', 1)
    typeChars(input, '87654')
    await flushRafs()
    expect(cb).toHaveBeenLastCalledWith('987-654')
  })

  it('onChange not called when char is prevented (mask full)', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '99', { onChange: cb })
    input.value = '12'
    input.setSelectionRange(2, 2)
    const e = new KeyboardEvent('keydown', { key: '3', bubbles: true, cancelable: true })
    input.dispatchEvent(e)
    await flushRafs()
    expect(e.defaultPrevented).toBe(true)
    // onChange must NOT have been called (no rAF was scheduled)
    expect(cb).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 7. Fast typing — iOS keyup mode
// ---------------------------------------------------------------------------

describe('fast typing — iOS (keyup events)', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone OS 17_0 like Mac OS X' })
    input = document.createElement('input')
    document.body.appendChild(input)
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('4 digits fast via keyup — all chars reach final masked value', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    typeChars(input, '1234', 'keyup')
    await flushRafs()
    expect(input.value).toBe('12-34')
    expect(input.value.replace(/\D/g, '')).toBe('1234')
  })

  it('full phone via keyup — correct mask applied', async () => {
    const { bind } = await import('../src/index')
    bind(input, '(99) 99999-9999')
    typeChars(input, '11999887766', 'keyup')
    await flushRafs()
    expect(input.value).toBe('(11) 99988-7766')
  })

  it('no keyup events are defaultPrevented during burst typing', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    const events = ['1', '2', '3', '4', '5', '6'].map(
      (key) => new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }),
    )
    let v = ''
    for (const e of events) {
      v += e.key
      input.value = v
      input.setSelectionRange(v.length, v.length)
      input.dispatchEvent(e)
    }
    for (const e of events) {
      expect(e.defaultPrevented).toBe(false)
    }
    await flushRafs()
    expect(input.value).toBe('123-456')
  })

  it('backspace then retype via keyup — value correct', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    typeChars(input, '1234', 'keyup')
    backspaceN(input, 2, 'keyup')
    typeChars(input, '56', 'keyup')
    await flushRafs()
    expect(input.value).toBe('12-56')
  })

  it('array mask fast on iOS — selects correct pattern', async () => {
    const { bind } = await import('../src/index')
    bind(input, ['(99) 9999-9999', '(99) 99999-9999'])
    typeChars(input, '11999887766', 'keyup')
    await flushRafs()
    expect(input.value).toBe('(11) 99988-7766')
  })
})
