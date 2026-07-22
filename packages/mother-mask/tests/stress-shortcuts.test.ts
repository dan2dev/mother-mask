import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { applyMask, process } from '../src/index'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
}

/** Dispatch a keydown and unconditionally apply the given post-state (assumes not prevented). */
function press(
  input: HTMLInputElement,
  key: string,
  valueAfter: string,
  caretAfter: number,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  input.dispatchEvent(e)
  input.value = valueAfter
  input.setSelectionRange(caretAfter, caretAfter)
  return e
}

/** Dispatch a keydown and only apply the post-state if the browser wouldn't have blocked it. */
function pressGuarded(
  input: HTMLInputElement,
  key: string,
  valueAfter: string,
  caretAfter: number,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  input.dispatchEvent(e)
  if (!e.defaultPrevented) {
    input.value = valueAfter
    input.setSelectionRange(caretAfter, caretAfter)
  }
  return e
}

/** Dispatch a pure navigation/selection keydown (no value change) and set the resulting selection. */
function navigate(
  input: HTMLInputElement,
  key: string,
  selStart: number,
  selEnd: number,
  init: KeyboardEventInit = {},
): void {
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }))
  input.setSelectionRange(selStart, selEnd)
}

/** Type `chars` one at a time, flushing rAFs every `flushEvery` characters (0 = never flush mid-stream). */
async function typeAtSpeed(
  input: HTMLInputElement,
  chars: string,
  flushEvery: number,
): Promise<void> {
  let v = input.value
  let count = 0
  for (const ch of chars) {
    v += ch
    press(input, ch, v, v.length)
    count++
    if (flushEvery > 0 && count % flushEvery === 0) {
      await flushRafs()
      v = input.value
    }
  }
}

function setupInput(): HTMLInputElement {
  const input = document.createElement('input')
  document.body.appendChild(input)
  return input
}

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

// ---------------------------------------------------------------------------
// 1. Typing at different speeds converges to the same result
// ---------------------------------------------------------------------------

describe('stress — typing speed independence', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  const cases: Array<{ mask: string; raw: string }> = [
    { mask: '99-99', raw: '1234' },
    { mask: '999-999', raw: '123456' },
    { mask: '999.999.999-99', raw: '12345678901' },
    { mask: '(99) 99999-9999', raw: '11999887766' },
    { mask: 'ZZZ-ZZZ', raw: 'abcdef' },
    { mask: 'AA.AAA.AAA/AAAA-99', raw: '1AB2C3D4E5F678' },
  ]

  for (const { mask, raw } of cases) {
    it(`"${raw}" into "${mask}" — fast (no mid-stream flush) matches canonical output`, async () => {
      const { bind } = await import('../src/index')
      bind(input, mask)
      await typeAtSpeed(input, raw, 0)
      await flushRafs()
      expect(input.value).toBe(process(raw, mask))
    })

    it(`"${raw}" into "${mask}" — slow (flush after every char) matches canonical output`, async () => {
      const { bind } = await import('../src/index')
      bind(input, mask)
      await typeAtSpeed(input, raw, 1)
      await flushRafs()
      expect(input.value).toBe(process(raw, mask))
    })

    it(`"${raw}" into "${mask}" — medium speed (flush every 2 chars) matches canonical output`, async () => {
      const { bind } = await import('../src/index')
      bind(input, mask)
      await typeAtSpeed(input, raw, 2)
      await flushRafs()
      expect(input.value).toBe(process(raw, mask))
    })

    it(`"${raw}" into "${mask}" — bursty speed (flush every 3 chars) matches canonical output`, async () => {
      const { bind } = await import('../src/index')
      bind(input, mask)
      await typeAtSpeed(input, raw, 3)
      await flushRafs()
      expect(input.value).toBe(process(raw, mask))
    })
  }

  it('variable speed within a single session (slow start, fast burst, slow finish)', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999.999.999-99')
    // slow: first 3 digits, flushed one at a time
    await typeAtSpeed(input, '123', 1)
    // fast burst: next 5 digits, no flush
    await typeAtSpeed(input, '45678', 0)
    await flushRafs()
    // slow: last 3 digits
    await typeAtSpeed(input, '901', 1)
    await flushRafs()
    expect(input.value).toBe(process('12345678901', '999.999.999-99'))
  })
})

// ---------------------------------------------------------------------------
// 2. Keyboard shortcuts for selection
// ---------------------------------------------------------------------------

describe('stress — keyboard-shortcut selection', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('Ctrl+A (select all) then typing a single char replaces the entire value', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    input.setSelectionRange(0, 0)
    // Ctrl+A: browser selects everything, no value change
    navigate(input, 'a', 0, 7, { ctrlKey: true })
    await flushRafs()
    expect(input.value).toBe('123-456') // untouched, still fully selected in spirit
    // Now type a replacement char — browser replaces the (0,7) selection
    press(input, '9', '9', 1)
    await flushRafs()
    expect(input.value).toBe('9')
  })

  it('Cmd+A (metaKey, macOS) then fast multi-char retype replaces everything', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999.999.999-99')
    input.value = '123.456.789-01'
    navigate(input, 'a', 0, 14, { metaKey: true })
    press(input, '9', '9', 1)
    let v = '9'
    for (const ch of '87654321000') {
      v += ch
      press(input, ch, v, v.length)
    }
    await flushRafs()
    expect(input.value).toBe(process('987654321000', '999.999.999-99'))
  })

  it('Shift+ArrowRight extends selection char by char, then Delete removes the block', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    input.setSelectionRange(1, 1)
    navigate(input, 'ArrowRight', 1, 2, { shiftKey: true })
    navigate(input, 'ArrowRight', 1, 3, { shiftKey: true })
    navigate(input, 'ArrowRight', 1, 4, { shiftKey: true }) // now selects "23-"
    press(input, 'Delete', '1456', 1)
    await flushRafs()
    expect(input.value.replace(/\D/g, '')).toBe('1456')
    expect(input.value).toBe(process('1456', '999-999'))
  })

  it('Shift+End selects from caret to the end, typing replaces the tail', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999-999')
    input.value = '123-456-789'
    input.setSelectionRange(4, 4)
    navigate(input, 'End', 4, 11, { shiftKey: true }) // selects "456-789"
    press(input, '9', '1239', 5)
    let v = '1239'
    for (const ch of '99') {
      v += ch
      press(input, ch, v, v.length)
    }
    await flushRafs()
    expect(input.value.replace(/\D/g, '')).toBe('123999')
    expect(input.value).toBe(process('123999', '999-999-999'))
  })

  it('Shift+Home selects from caret to the start, typing replaces the head', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '123-456'
    input.setSelectionRange(5, 5) // caret between "123-4" and "56"
    navigate(input, 'Home', 0, 5, { shiftKey: true }) // selects "123-4"
    press(input, '7', '756', 1)
    await flushRafs()
    expect(input.value.replace(/\D/g, '')).toBe('756')
    expect(input.value).toBe(process('756', '999-999'))
  })

  it('mouse/word double-click style selection (non-adjacent block) then multi-char paste', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999.999.999-99')
    input.value = '123.456.789-01'
    input.setSelectionRange(4, 7) // select middle block "456"
    // Simulate a paste replacing just that selection
    const before = input.value.slice(0, 4)
    const after = input.value.slice(7)
    input.value = before + '000' + after
    input.setSelectionRange(7, 7)
    input.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
    await flushRafs(1)
    expect(input.value.replace(/\D/g, '')).toBe('12300078901')
    expect(input.value).toBe(process('12300078901', '999.999.999-99'))
  })

  it('Ctrl+Backspace (delete previous word) removes multiple chars in one keystroke', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999-999')
    input.value = '123-456-789'
    input.setSelectionRange(11, 11)
    // Browser deletes the whole trailing word "789" in one default action
    press(input, 'Backspace', '123-456-', 8, { ctrlKey: true })
    await flushRafs()
    expect(input.value.replace(/\D/g, '')).toBe('123456')
    expect(input.value).toBe(process('123456', '999-999-999'))
  })

  it('Ctrl+Delete (delete next word) removes multiple chars in one keystroke', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999-999')
    input.value = '123-456-789'
    input.setSelectionRange(0, 0)
    // Browser deletes the whole leading word "123" in one default action
    press(input, 'Delete', '-456-789', 0, { ctrlKey: true })
    await flushRafs()
    expect(input.value.replace(/\D/g, '')).toBe('456789')
    // Segmented mode (default): the whole first segment was deleted, so it
    // stays empty instead of pulling "456"/"789" left across the "-".
    expect(input.value).toBe('-456-789')
  })

  it('select-all shortcut immediately followed by Backspace clears the field', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99-99')
    input.value = '12-34'
    navigate(input, 'a', 0, 5, { ctrlKey: true })
    press(input, 'Backspace', '', 0)
    await flushRafs()
    expect(input.value).toBe('')
  })

  it('rapid shift-arrow selection growth followed by fast multi-char overwrite', async () => {
    const { bind } = await import('../src/index')
    bind(input, '(99) 99999-9999')
    input.value = '(11) 99988-7766'
    input.setSelectionRange(15, 15)
    for (let i = 0; i < 5; i++) {
      navigate(input, 'ArrowLeft', 15 - i - 1, 15, { shiftKey: true })
    }
    // selection now covers last 5 chars "7766" area; replace with 5 fresh digits fast
    press(input, '1', '(11) 999881', 12)
    let v = '(11) 999881'
    for (const ch of '2345') {
      v += ch
      press(input, ch, v, v.length)
    }
    await flushRafs()
    expect(applyMask(input.value, '(99) 99999-9999').value).toBe(input.value)
  })
})

// ---------------------------------------------------------------------------
// 3. Multi-char-at-once insertion (IME / autofill / predictive text paths)
// ---------------------------------------------------------------------------

describe('stress — multi-char insertion via non-standard key events', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('key "Unidentified" inserting a multi-char chunk is masked correctly (longer than before)', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999-999')
    input.value = '123'
    input.setSelectionRange(3, 3)
    press(input, 'Unidentified', '123456', 6) // predictive text inserted "456" in one go
    await flushRafs()
    expect(input.value).toBe(process('123456', '999-999-999'))
  })

  it('key "Unidentified" replacing a chunk with equal length (autocorrect swap)', async () => {
    const { bind } = await import('../src/index')
    bind(input, 'ZZZ-ZZZ')
    input.value = 'abc-def'
    input.setSelectionRange(4, 7)
    press(input, 'Unidentified', 'abc-xyz', 7) // autocorrect swapped "def" -> "xyz", same length
    await flushRafs()
    expect(input.value).toBe('abc-xyz')
  })

  it('keydown with no "key" (older Android WebView) processes a multi-char chunk', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999.999.999-99')
    input.value = '12345'
    input.setSelectionRange(5, 5)
    // Dispatch without `key` — KeyboardEventInit defaults key to ''
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true }))
    input.value = '12345678' // Android IME committed 3 more digits at once
    input.setSelectionRange(8, 8)
    await flushRafs(2)
    expect(input.value).toBe(process('12345678', '999.999.999-99'))
  })

  it('keyless path blocks a real keyed char event that arrives before its rAF resolves', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '12'
    input.setSelectionRange(2, 2)
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true }))
    input.value = '1234' // IME committed "34" in one shot, still in flight (no rAF yet)
    input.setSelectionRange(4, 4)
    // A real keystroke race-arrives before the keyless path's rAF has fired
    const blocked = pressGuarded(input, '9', '12349', 5)
    expect(blocked.defaultPrevented).toBe(true)
    await flushRafs(2)
    // Only the IME-committed digits should have made it through
    expect(input.value).toBe(process('1234', '999-999'))
  })

  it('two rapid keyless (Android) events back-to-back both resolve without corrupting the value', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999-999')
    input.value = ''
    input.setSelectionRange(0, 0)
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true }))
    input.value = '123'
    input.setSelectionRange(3, 3)
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true }))
    input.value = '123456'
    input.setSelectionRange(6, 6)
    await flushRafs(3)
    expect(applyMask(input.value, '999-999-999').value).toBe(input.value)
    expect(input.value.replace(/\D/g, '')).toBe('123456')
  })

  it('Unidentified-key burst simulating swipe/glide typing (multiple word-chunks in sequence)', async () => {
    const { bind } = await import('../src/index')
    bind(input, 'ZZZ-ZZZ-ZZZ')
    input.value = ''
    input.setSelectionRange(0, 0)
    press(input, 'Unidentified', 'abc', 3)
    await flushRafs()
    press(input, 'Unidentified', 'abcdef', 6)
    await flushRafs()
    press(input, 'Unidentified', 'abcdefghi', 9)
    await flushRafs()
    expect(input.value).toBe(process('abcdefghi', 'ZZZ-ZZZ-ZZZ'))
  })
})

// ---------------------------------------------------------------------------
// 4. Combined fuzz test — variable speed + shortcuts + multi-char ops
// ---------------------------------------------------------------------------

describe('stress — combined fuzz (speed + shortcuts + multi-char)', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  const masks = ['99-99', '999-999-999', '999.999.999-99', '(99) 99999-9999', 'ZZZ-ZZZ']
  const alphabets = ['0123456789', '0123456789', '0123456789', '0123456789', 'abcdefghijklmnop']

  it('80 randomized sessions mixing typing speed, shortcut selection, paste and word-delete stay valid', async () => {
    for (let seed = 1; seed <= 80; seed++) {
      vi.resetModules()
      const { bind } = await import('../src/index')
      const rng = makeRng(seed * 104729)
      const idx = seed % masks.length
      const mask = masks[idx]
      const alphabet = alphabets[idx]

      const el = document.createElement('input')
      document.body.appendChild(el)
      bind(el, mask)

      const opCount = 6 + Math.floor(rng() * 12)
      for (let i = 0; i < opCount; i++) {
        const roll = rng()
        const v = el.value

        if (roll < 0.35) {
          // single-char insert at random position, random chance to flush immediately (speed variance)
          const ch = alphabet[Math.floor(rng() * alphabet.length)]
          const pos = Math.floor(rng() * (v.length + 1))
          el.setSelectionRange(pos, pos)
          const e = new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true })
          el.dispatchEvent(e)
          if (!e.defaultPrevented) {
            el.value = v.slice(0, pos) + ch + v.slice(pos)
            el.setSelectionRange(pos + 1, pos + 1)
          }
        } else if (roll < 0.55 && v.length > 0) {
          // select a random range then retype a random chunk, one keystroke at a
          // time (first char replaces the selection, rest append) — mirrors real
          // browser semantics and lets the "mask full" guard block mid-chunk.
          const a = Math.floor(rng() * v.length)
          const b = a + Math.floor(rng() * (v.length - a + 1))
          el.setSelectionRange(a, b)
          const chunkLen = 1 + Math.floor(rng() * 3)
          let cur = v
          for (let j = 0; j < chunkLen; j++) {
            const ch = alphabet[Math.floor(rng() * alphabet.length)]
            const selStart = el.selectionStart ?? 0
            const selEnd = el.selectionEnd ?? selStart
            const e = new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true })
            el.dispatchEvent(e)
            if (e.defaultPrevented) break
            cur = cur.slice(0, selStart) + ch + cur.slice(selEnd)
            el.value = cur
            el.setSelectionRange(selStart + 1, selStart + 1)
          }
        } else if (roll < 0.75 && v.length > 0) {
          // word-delete style multi-char backspace/delete
          const isBack = rng() < 0.5
          const removeLen = 1 + Math.floor(rng() * Math.min(4, v.length))
          if (isBack) {
            const end = v.length
            const start = Math.max(0, end - removeLen)
            el.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'Backspace', ctrlKey: true, bubbles: true, cancelable: true }),
            )
            el.value = v.slice(0, start) + v.slice(end)
            el.setSelectionRange(start, start)
          } else {
            const start = 0
            const end = Math.min(v.length, removeLen)
            el.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'Delete', ctrlKey: true, bubbles: true, cancelable: true }),
            )
            el.value = v.slice(0, start) + v.slice(end)
            el.setSelectionRange(start, start)
          }
        } else if (roll < 0.9) {
          // multi-char paste
          const chunkLen = 1 + Math.floor(rng() * 5)
          let chunk = ''
          for (let j = 0; j < chunkLen; j++) chunk += alphabet[Math.floor(rng() * alphabet.length)]
          const pos = Math.floor(rng() * (v.length + 1))
          el.value = v.slice(0, pos) + chunk + v.slice(pos)
          el.setSelectionRange(pos + chunk.length, pos + chunk.length)
          el.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
        } else {
          // Unidentified-key multi-char commit (IME-style)
          const chunkLen = 1 + Math.floor(rng() * 3)
          let chunk = ''
          for (let j = 0; j < chunkLen; j++) chunk += alphabet[Math.floor(rng() * alphabet.length)]
          el.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Unidentified', bubbles: true, cancelable: true }),
          )
          el.value = v + chunk
          el.setSelectionRange(v.length + chunk.length, v.length + chunk.length)
        }
      }

      await flushRafs(3)

      expect(applyMask(el.value, mask).value).toBe(el.value)
      expect(el.value.length).toBeLessThanOrEqual(mask.length)
      const c = el.selectionStart ?? 0
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(el.value.length)

      el.remove()
    }
  })
})
