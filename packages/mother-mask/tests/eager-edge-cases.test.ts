import { describe, it, expect, vi, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Edge cases the exhaustive position/selection sweep in caret-matrix.test.ts
// can't naturally reach: paste, IME composition, array-mask pattern
// switching, word-jump deletes (Ctrl+Backspace/Delete), select-all + retype,
// and multi-mask interleaved type/delete/retype sequences. All exercised at
// both `eager` settings (default-on and explicit `eager: false`), covering
// typing, deleting, replacing, and typing-over-a-selection.
//
// caret-matrix.test.ts already proves eager holds at *every* caret position
// and selection range across six mask shapes for insert/replace/delete; this
// file complements it with the qualitative scenarios that matter in practice
// but aren't just "one more position in the sweep".
// ---------------------------------------------------------------------------

async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
}

function setupInput(): HTMLInputElement {
  const input = document.createElement('input')
  document.body.appendChild(input)
  return input
}

/** Dispatch a real `input` event — the primary path `bind()` uses. */
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

/** Simulate one real-browser keystroke via `input`. */
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

/** Dispatch a keydown and unconditionally apply the given post-state (assumes not prevented). */
function press(
  input: HTMLInputElement,
  key: string,
  valueAfter: string,
  caretAfter: number,
  init: KeyboardEventInit = {},
): void {
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }))
  input.value = valueAfter
  input.setSelectionRange(caretAfter, caretAfter)
}

const CPF_MASK = '999.999.999-99'
const DATE_MASK = '99/99/9999'
const PHONE_MASK = ['(99) 9999-9999', '(99) 99999-9999']

let input: HTMLInputElement

afterEach(() => {
  input.remove()
  vi.unstubAllGlobals()
  vi.resetModules()
})

// ---------------------------------------------------------------------------
// Paste
// ---------------------------------------------------------------------------

describe('bind() — paste', () => {
  it('eager (default): pasting digits that complete a segment reveals the next separator', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, CPF_MASK)

    input.value = '012'
    input.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
    await flushRafs(1)
    expect(input.value).toBe('012.')
  })

  it('eager: false: pasting the same digits does not reveal the separator early', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, CPF_MASK, { eager: false })

    input.value = '012'
    input.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
    await flushRafs(1)
    expect(input.value).toBe('012')
  })

  it('eager (default): pasting over a selection still reveals the separator (paste is always insert-like, never delete-suppressed)', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, CPF_MASK)
    input.value = '056.789.123-45'
    input.setSelectionRange(0, 3) // select "056"

    // Simulate pasting "012" over the selection.
    input.value = '012' + '.789.123-45'
    input.setSelectionRange(3, 3)
    input.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
    await flushRafs(1)
    expect(input.value).toBe('012.789.123-45')
  })
})

// ---------------------------------------------------------------------------
// IME composition
// ---------------------------------------------------------------------------

describe('bind() — composition (IME) end', () => {
  it('eager (default): finishing a composition that completes a segment reveals the next separator', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, CPF_MASK)

    input.dispatchEvent(new Event('compositionstart', { bubbles: true }))
    input.value = '012'
    input.setSelectionRange(3, 3)
    dispatchInput(input, { data: '012', inputType: 'insertCompositionText', isComposing: true })
    // Formatted live during composition (see bind.ts) — eager applies here too.
    expect(input.value).toBe('012.')

    input.dispatchEvent(new Event('compositionend', { bubbles: true }))
    expect(input.value).toBe('012.')
  })

  it('eager: false: composition never reveals the separator early', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, CPF_MASK, { eager: false })

    input.dispatchEvent(new Event('compositionstart', { bubbles: true }))
    input.value = '012'
    input.setSelectionRange(3, 3)
    dispatchInput(input, { data: '012', inputType: 'insertCompositionText', isComposing: true })
    expect(input.value).toBe('012')

    input.dispatchEvent(new Event('compositionend', { bubbles: true }))
    expect(input.value).toBe('012')
  })
})

// ---------------------------------------------------------------------------
// Array masks — eager across the pattern-switch boundary
// ---------------------------------------------------------------------------

describe('bind() — array masks with eager', () => {
  it('eager (default): completing the area code reveals ") " before the number block is typed', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, PHONE_MASK)

    typeCharViaInput(input, '1')
    expect(input.value).toBe('(1')
    typeCharViaInput(input, '1')
    expect(input.value).toBe('(11) ') // area code segment complete → eager reveal
    expect(input.selectionStart).toBe(5)
  })

  it('eager: false: completing the area code does not reveal ") " early', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, PHONE_MASK, { eager: false })

    typeCharViaInput(input, '1')
    typeCharViaInput(input, '1')
    expect(input.value).toBe('(11')
  })

  it('eager (default): completing the short pattern\'s 4-digit block reveals the "-" while the mask can still grow to the long pattern', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, PHONE_MASK)

    for (const ch of '119998') typeCharViaInput(input, ch)
    // 6 data chars ≤ 10 (short pattern's slot count) → short pattern selected;
    // its 4-digit block ("9998") is complete → eager reveals the trailing "-".
    expect(input.value).toBe('(11) 9998-')
  })

  it('Backspace right after that reveal removes the "-" for good, not resurrected, even though the array mask could still grow', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, PHONE_MASK)

    for (const ch of '119998') typeCharViaInput(input, ch)
    expect(input.value).toBe('(11) 9998-')

    backspaceViaInput(input)
    expect(input.value).toBe('(11) 9998')

    // Typing on extends into the next block. Note this "-" is *not* an eager
    // reveal — it's the base (always-on) masking algorithm flushing the
    // literal it was already holding pending, because real data ('7') now
    // follows it, same as it would with eager off.
    typeCharViaInput(input, '7')
    expect(input.value).toBe('(11) 9998-7')
  })

  it('typing past the short pattern\'s capacity switches to the long pattern and eager still tracks it correctly', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, PHONE_MASK)

    for (const ch of '11999887766') typeCharViaInput(input, ch)
    // Fully typed 11-digit number — long pattern selected, fully filled, no
    // trailing literal left for eager to add.
    expect(input.value).toBe('(11) 99988-7766')

    backspaceViaInput(input) // remove trailing "6"
    // Dropping to 10 data chars switches the array mask back to the short
    // pattern (its slot count), which only fits 4 digits in the first inner
    // block — a normal array-mask reflow, independent of eager.
    expect(input.value).toBe('(11) 9998-8776')
  })
})

// ---------------------------------------------------------------------------
// Word-jump deletes (Ctrl+Backspace / Ctrl+Delete) never resurrect eager
// ---------------------------------------------------------------------------

describe('bind() — Ctrl+Backspace / Ctrl+Delete never resurrect an eager separator', () => {
  it('Ctrl+Backspace deleting back across an eagerly-revealed separator does not bring it back', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, CPF_MASK)

    press(input, '0', '0', 1)
    await flushRafs()
    press(input, '1', '01', 2)
    await flushRafs()
    press(input, '2', '012', 3)
    await flushRafs()
    expect(input.value).toBe('012.') // eager reveal

    // Browser's Ctrl+Backspace deletes the whole previous "word" in one go —
    // here, everything back to the start (no word boundary before it).
    press(input, 'Backspace', '', 0, { ctrlKey: true })
    await flushRafs()
    expect(input.value).toBe('')
  })

  it('Ctrl+Delete deleting forward across an eagerly-revealed separator does not bring it back', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, CPF_MASK)

    press(input, '0', '0', 1)
    await flushRafs()
    press(input, '1', '01', 2)
    await flushRafs()
    press(input, '2', '012', 3)
    await flushRafs()
    expect(input.value).toBe('012.')

    input.setSelectionRange(0, 0)
    // Ctrl+Delete removes the whole following "word" — here, the digits and
    // the separator the mask had eagerly added after them.
    press(input, 'Delete', '', 0, { ctrlKey: true })
    await flushRafs()
    expect(input.value).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Select-all + retype
// ---------------------------------------------------------------------------

describe('bind() — select-all and retype with eager', () => {
  it('eager (default): retyping from scratch after select-all still reveals separators as segments complete', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, CPF_MASK)

    for (const ch of '012') typeCharViaInput(input, ch)
    expect(input.value).toBe('012.')

    input.setSelectionRange(0, input.value.length) // select all
    typeCharViaInput(input, '9') // replaces the whole selection with "9"
    expect(input.value).toBe('9')

    typeCharViaInput(input, '8')
    typeCharViaInput(input, '7')
    expect(input.value).toBe('987.') // eager reveal on the fresh value
  })

  it('eager: false: retyping from scratch after select-all never reveals the separator early', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, CPF_MASK, { eager: false })

    for (const ch of '012') typeCharViaInput(input, ch)
    expect(input.value).toBe('012')

    input.setSelectionRange(0, input.value.length)
    typeCharViaInput(input, '9')
    typeCharViaInput(input, '8')
    typeCharViaInput(input, '7')
    expect(input.value).toBe('987')
  })
})

// ---------------------------------------------------------------------------
// Interleaved type → delete → retype, beyond CPF (date + array phone)
// ---------------------------------------------------------------------------

describe('bind() — interleaved type/delete/retype sequences stay correct across masks', () => {
  it('date mask: type, backspace through the eager separator, retype, cascade to the next segment', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, DATE_MASK)

    typeCharViaInput(input, '2')
    typeCharViaInput(input, '5')
    expect(input.value).toBe('25/')

    backspaceViaInput(input)
    expect(input.value).toBe('25')

    backspaceViaInput(input)
    expect(input.value).toBe('2')

    typeCharViaInput(input, '5')
    expect(input.value).toBe('25/') // genuine re-completion — eager fires again

    typeCharViaInput(input, '1')
    typeCharViaInput(input, '2')
    expect(input.value).toBe('25/12/') // cascades to the year boundary
    expect(input.selectionStart).toBe(6)

    backspaceViaInput(input) // remove the eagerly-added "/" before the year
    expect(input.value).toBe('25/12')
  })

  it('date mask, eager: false: the same sequence never reveals separators early, delete behavior is unchanged', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, DATE_MASK, { eager: false })

    typeCharViaInput(input, '2')
    typeCharViaInput(input, '5')
    expect(input.value).toBe('25')

    backspaceViaInput(input)
    expect(input.value).toBe('2')

    typeCharViaInput(input, '5')
    typeCharViaInput(input, '1')
    typeCharViaInput(input, '2')
    expect(input.value).toBe('25/12')
  })

  it('phone array mask: type area code, delete into it, retype, then fill the rest', async () => {
    const { bind } = await import('../src/index')
    input = setupInput()
    bind(input, PHONE_MASK)

    typeCharViaInput(input, '1')
    typeCharViaInput(input, '1')
    expect(input.value).toBe('(11) ')

    backspaceViaInput(input) // remove the eagerly-added ") "
    expect(input.value).toBe('(11')

    backspaceViaInput(input) // remove "1"
    expect(input.value).toBe('(1')

    typeCharViaInput(input, '1') // re-complete the area code
    expect(input.value).toBe('(11) ')

    for (const ch of '999887766') typeCharViaInput(input, ch)
    expect(input.value).toBe('(11) 99988-7766')
  })
})
