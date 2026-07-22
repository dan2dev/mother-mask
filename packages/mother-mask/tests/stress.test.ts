import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { applyMask } from '../src/index'

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

/** Simulate one keystroke: dispatch keydown, then apply the browser's default action. */
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

/** Insert a single character at `pos` without a selection (middle-of-input typing). */
function insertAt(input: HTMLInputElement, pos: number, ch: string): void {
  const v = input.value.slice(0, pos) + ch + input.value.slice(pos)
  press(input, ch, v, pos + 1)
}

// A small xorshift PRNG so stress runs are deterministic and reproducible.
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
// 1. Copy & paste edge cases
// ---------------------------------------------------------------------------

describe('stress — copy & paste', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('paste into empty input masks the full pasted value', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999.999.999-99')
    input.setSelectionRange(0, 0)
    pasteAt(input, '12345678901')
    await flushRafs(1)
    expect(input.value).toBe('123.456.789-01')
  })

  it('paste in the middle of existing content inserts and reflows the mask', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '12-56'
    // caret between "12-" and "56" — raw digits are "1256"
    input.setSelectionRange(3, 3)
    pasteAt(input, '34')
    await flushRafs(1)
    // raw becomes "12" + "34" + "56" = "123456"
    expect(input.value).toBe('123-456')
    expect(input.value.replace(/\D/g, '')).toBe('123456')
  })

  it('paste over an active selection replaces only the selected range', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    input.setSelectionRange(1, 3) // select "23"
    pasteAt(input, '99')
    await flushRafs(1)
    // raw: "1" + "99" + "456" = "199456"
    expect(input.value.replace(/\D/g, '')).toBe('199456')
    expect(input.value).toBe('199-456')
  })

  it('pasted text with mixed valid/invalid characters keeps only matching chars', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.setSelectionRange(0, 0)
    pasteAt(input, 'a1b2c3-d4e5f6')
    await flushRafs(1)
    expect(input.value).toBe('123-456')
    expect(input.value.replace(/\D/g, '')).toBe('123456')
  })

  it('paste exceeding mask capacity truncates to the mask length', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.setSelectionRange(0, 0)
    pasteAt(input, '123456789')
    await flushRafs(1)
    expect(input.value).toBe('12-34')
  })

  it('paste already-formatted text (with punctuation) is idempotent', async () => {
    const { bind } = await import('../src/index')
    bind(input, '(99) 99999-9999')
    input.setSelectionRange(0, 0)
    pasteAt(input, '(11) 99988-7766')
    await flushRafs(1)
    expect(input.value).toBe('(11) 99988-7766')
  })

  it('paste selects the correct array-mask pattern by data length', async () => {
    const { bind } = await import('../src/index')
    bind(input, ['(99) 9999-9999', '(99) 99999-9999'])
    input.setSelectionRange(0, 0)
    pasteAt(input, '11999887766')
    await flushRafs(1)
    expect(input.value).toBe('(11) 99988-7766')
  })

  it('two rapid pastes before any rAF fires — only the final content wins', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.setSelectionRange(0, 0)
    pasteAt(input, '111') // schedules a paste rAF reading target.value at flush time
    input.value = '999999'
    input.setSelectionRange(6, 6)
    input.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
    await flushRafs(1)
    expect(input.value).toBe('999-999')
  })

  it('paste triggers onChange with the final masked value', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999.999.999-99', { onChange: cb })
    input.setSelectionRange(0, 0)
    pasteAt(input, '12345678901')
    await flushRafs(1)
    expect(cb).toHaveBeenLastCalledWith('123.456.789-01')
  })

  it('paste of only invalid characters yields an empty masked value', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.setSelectionRange(0, 0)
    pasteAt(input, 'no digits here!!')
    await flushRafs(1)
    expect(input.value).toBe('')
  })

  it('paste followed immediately by fast typing (no rAF between) — both merge correctly', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.setSelectionRange(0, 0)
    pasteAt(input, '123')
    // continue typing before the paste rAF has flushed
    typeChars(input, '456')
    await flushRafs(1)
    expect(input.value).toBe('123-456')
  })

  it('paste alphanumeric CNPJ value mid-string reflows correctly', async () => {
    const { bind } = await import('../src/index')
    bind(input, 'AA.AAA.AAA/AAAA-99')
    input.value = '1A.B2C.3D4/5E6F-78'
    input.setSelectionRange(5, 5) // caret inside "B2C" block
    pasteAt(input, 'X9')
    await flushRafs(1)
    // Just assert idempotency and that only valid chars survive — the exact
    // reflow depends on slot classes, so check invariants rather than exact string.
    expect(applyMask(input.value, 'AA.AAA.AAA/AAAA-99').value).toBe(input.value)
  })
})

// ---------------------------------------------------------------------------
// 2. Typing from the middle of the input (no selection, collapsed caret)
// ---------------------------------------------------------------------------

describe('stress — typing from the middle of the input', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('insert a single digit between two existing digits', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '15'
    input.setSelectionRange(1, 1) // caret between "1" and "5"
    insertAt(input, 1, '2')
    await flushRafs()
    // raw becomes "125"
    expect(input.value.replace(/\D/g, '')).toBe('125')
    expect(input.value).toBe('125')
  })

  it('insert a single digit just before the separator', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-56' // 5 digits, mask not yet full (masked length 6 < mask length 7)
    input.setSelectionRange(3, 3) // caret right after "123", before "-"
    insertAt(input, 3, '4')
    await flushRafs()
    // raw digits: "123" + "4" + "56" = "123456" → mask "999-999" → "123-456"
    expect(input.value.replace(/\D/g, '')).toBe('123456')
    expect(input.value).toBe('123-456')
  })

  it('insert several characters one at a time in the middle, cursor advancing each time', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999-999')
    input.value = '111999'
    input.setSelectionRange(3, 3)
    insertAt(input, 3, '2')
    insertAt(input, 4, '2')
    insertAt(input, 5, '2')
    await flushRafs()
    expect(input.value.replace(/\D/g, '')).toBe('111222999')
    expect(input.value).toBe('111-222-999')
  })

  it('insert a letter into a digit slot mid-string is silently dropped', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '12456'
    input.setSelectionRange(2, 2)
    insertAt(input, 2, 'x')
    await flushRafs()
    expect(input.value).not.toContain('x')
    expect(input.value.replace(/\D/g, '')).toBe('12456')
  })

  it('inserting mid-string when the mask is already full is blocked (preventDefault)', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    input.setSelectionRange(2, 2) // collapsed caret in the middle, mask is full
    const e = new KeyboardEvent('keydown', { key: '9', bubbles: true, cancelable: true })
    input.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
    expect(input.value).toBe('12-34')
  })

  it('insert at the very start of a partially filled mask shifts everything right', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '456'
    input.setSelectionRange(0, 0)
    insertAt(input, 0, '1')
    insertAt(input, 1, '2')
    insertAt(input, 2, '3')
    await flushRafs()
    expect(input.value.replace(/\D/g, '')).toBe('123456')
    expect(input.value).toBe('123-456')
  })

  it('insert into the middle of a partially filled CPF value keeps digit count and formatting correct', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999.999.999-99')
    input.value = '123.456.789' // 9 digits, masked length 11 < mask length 14 (not full)
    input.setSelectionRange(8, 8) // inside formatted string, after "123.456."
    insertAt(input, 8, '9')
    await flushRafs()
    // Result must still be valid under the mask (idempotent) and contain 10 raw
    // digits total (9 original + 1 inserted), within the 11-slot capacity.
    expect(input.value.replace(/\D/g, '').length).toBe(10)
    expect(applyMask(input.value, '999.999.999-99').value).toBe(input.value)
  })
})

// ---------------------------------------------------------------------------
// 3. Single-char and multi-char replacement via selection
// ---------------------------------------------------------------------------

describe('stress — change a single char (or more) via selection', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('select one digit in the middle and replace with a different digit', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    input.setSelectionRange(1, 2) // select "2"
    press(input, '9', '193-456', 2)
    await flushRafs()
    expect(input.value).toBe('193-456')
  })

  it('select one letter in a letter mask and replace it', async () => {
    const { bind } = await import('../src/index')
    bind(input, 'ZZZ-ZZZ')
    input.value = 'abc-def'
    input.setSelectionRange(4, 5) // select "d"
    press(input, 'x', 'abc-xef', 5)
    await flushRafs()
    expect(input.value).toBe('abc-xef')
  })

  it('select the separator itself and type a digit — mask reflows around it', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    input.setSelectionRange(2, 3) // select "-"
    press(input, '9', '1934', 3)
    await flushRafs()
    expect(input.value).toBe('19-34')
  })

  it('select two digits and replace with a single digit — value shrinks by one', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    input.setSelectionRange(1, 3) // select "23"
    press(input, '9', '19-456', 2)
    await flushRafs()
    expect(input.value.replace(/\D/g, '')).toBe('19456')
    // Segmented mode (default): shrinking a selection inside the first block
    // no longer bleeds a digit in from the second block across the "-".
    expect(input.value).toBe('19-456')
  })

  it('select a whole block plus separator and retype two digits', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    input.setSelectionRange(0, 4) // select "123-"
    press(input, '7', '7456', 1)
    press(input, '8', '78456', 2)
    await flushRafs()
    expect(input.value.replace(/\D/g, '')).toBe('78456')
    expect(input.value).toBe('784-56')
  })

  it('select mismatched-type char (letter into a digit slot) — replacement dropped, neighbours preserved', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    input.setSelectionRange(1, 2) // select "2"
    press(input, 'x', '1x3-456', 2)
    await flushRafs()
    expect(input.value.replace(/\D/g, '')).toBe('13456')
    expect(input.value).not.toContain('x')
  })

  it('replace single char at the very end (last slot)', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    input.setSelectionRange(4, 5) // select last "4"
    press(input, '9', '12-39', 5)
    await flushRafs()
    expect(input.value).toBe('12-39')
  })

  it('replace single char at the very start (first slot)', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    input.setSelectionRange(0, 1) // select first "1"
    press(input, '9', '92-34', 1)
    await flushRafs()
    expect(input.value).toBe('92-34')
  })
})

// ---------------------------------------------------------------------------
// 4. Randomized stress tests — invariant checking across many operations
// ---------------------------------------------------------------------------

describe('stress — randomized operation sequences (invariant checks)', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  const masks = ['99-99', '999-999', '999.999.999-99', '(99) 99999-9999', 'ZZZ-ZZZ', 'AA.AAA.AAA/AAAA-99']
  const alphabets = ['0123456789', '0123456789', '0123456789', '0123456789', 'abcdefghij', 'abc012XYZ']

  it('50 random typing sessions each converge to an idempotent, in-bounds, valid value', async () => {
    for (let seed = 1; seed <= 50; seed++) {
      vi.resetModules()
      const { bind } = await import('../src/index')
      const rng = makeRng(seed * 7919)
      const maskIdx = seed % masks.length
      const mask = masks[maskIdx]
      const alphabet = alphabets[maskIdx]

      const el = document.createElement('input')
      document.body.appendChild(el)
      bind(el, mask)

      const opCount = 5 + Math.floor(rng() * 15)
      for (let i = 0; i < opCount; i++) {
        const roll = rng()
        const v = el.value
        const caret = el.selectionStart ?? v.length
        if (roll < 0.6) {
          // insert one random char at a random position
          const ch = alphabet[Math.floor(rng() * alphabet.length)]
          const pos = Math.floor(rng() * (v.length + 1))
          el.dispatchEvent(
            new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }),
          )
          el.value = v.slice(0, pos) + ch + v.slice(pos)
          el.setSelectionRange(pos + 1, pos + 1)
        } else if (roll < 0.85 && v.length > 0) {
          // backspace at a random position
          const pos = 1 + Math.floor(rng() * v.length)
          el.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }),
          )
          el.value = v.slice(0, pos - 1) + v.slice(pos)
          el.setSelectionRange(pos - 1, pos - 1)
        } else {
          // paste a short random chunk
          const chunkLen = 1 + Math.floor(rng() * 4)
          let chunk = ''
          for (let j = 0; j < chunkLen; j++) chunk += alphabet[Math.floor(rng() * alphabet.length)]
          const pos = Math.floor(rng() * (v.length + 1))
          el.value = v.slice(0, pos) + chunk + v.slice(pos)
          el.setSelectionRange(pos + chunk.length, pos + chunk.length)
          el.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
        }
        void caret
      }

      await flushRafs(2)

      // Invariant 1: applying the mask again to the settled value is a no-op.
      expect(applyMask(el.value, mask).value).toBe(el.value)
      // Invariant 2: value never exceeds the mask's own length.
      expect(el.value.length).toBeLessThanOrEqual(mask.length)
      // Invariant 3: caret stays within bounds.
      const c = el.selectionStart ?? 0
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(el.value.length)

      el.remove()
    }
  })

  it('sustained burst of 200 fast keystrokes never throws and settles to a valid value', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999.999.999-99')
    const rng = makeRng(12345)
    let v = ''
    for (let i = 0; i < 200; i++) {
      const ch = '0123456789'[Math.floor(rng() * 10)]
      v += ch
      expect(() => {
        input.dispatchEvent(
          new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }),
        )
      }).not.toThrow()
      input.value = v
      input.setSelectionRange(v.length, v.length)
    }
    await flushRafs(2)
    expect(applyMask(input.value, '999.999.999-99').value).toBe(input.value)
    expect(input.value.replace(/\D/g, '').length).toBeLessThanOrEqual(11)
  })

  it('alternating paste/backspace storm (30 rounds) keeps digit count consistent with visible content', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999-999')
    const rng = makeRng(999)
    for (let round = 0; round < 30; round++) {
      if (rng() < 0.5) {
        const digits = String(Math.floor(rng() * 1000))
        input.setSelectionRange(input.value.length, input.value.length)
        pasteAt(input, digits)
      } else if (input.value.length > 0) {
        const v = input.value
        const caret = v.length
        input.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }),
        )
        input.value = v.slice(0, caret - 1)
        input.setSelectionRange(caret - 1, caret - 1)
      }
    }
    await flushRafs(2)
    expect(applyMask(input.value, '999-999-999').value).toBe(input.value)
    expect(input.value.replace(/\D/g, '').length).toBeLessThanOrEqual(9)
  })
})
