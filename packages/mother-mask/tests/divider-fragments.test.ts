import { describe, it, expect, afterEach } from 'vitest'
import { applyMask, bind } from '../src/index'
import type { ApplyMaskOptions, MaskPattern } from '../src/index'

// ---------------------------------------------------------------------------
// Deleting a selection that cuts *through* a multi-character divider.
//
// Reported case: "(999) 999-9999" holding "(555) 123-4567", select the
// "(555)" (the space after it stays selected out) and press Delete. The
// browser hands back " 123-4567" — where that lone space is the surviving
// tail of ") " — and the render collapsed it to "(123-4567": the "123"
// repacked into the area code and both framing characters vanished.
//
// Two separate defects met there. A divider fragment was treated as noise, so
// nothing anchored "123" to its own segment; and the non-eager pass `bind()`
// runs for every deletion dropped the "(" that the selection had covered.
// Expected: "(|) 123-4567" — an emptied first field, its frame intact, caret
// inside it.
// ---------------------------------------------------------------------------

const PHONE = '(999) 999-9999'
const FULL = '(555) 123-4567'
/** Three-character divider, so a fragment can survive at more than one length. */
const SPACED = '99 - 99'
/** Escaped leading literal — the mask opens with two characters, not one. */
const ESCAPED = '\\A-99.99'
const CPF = '999.999.999-99'
const DATE = '99/99/9999'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let createdInputs: HTMLInputElement[] = []

afterEach(() => {
  for (const el of createdInputs) el.remove()
  createdInputs = []
})

function setupInput(value = ''): HTMLInputElement {
  const input = document.createElement('input')
  input.value = value
  document.body.appendChild(input)
  createdInputs.push(input)
  return input
}

async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
}

/** Delete the current selection the way a browser does, then fire `input`. */
function deleteSelection(
  input: HTMLInputElement,
  inputType: 'deleteContentBackward' | 'deleteContentForward' | 'deleteByCut' = 'deleteContentBackward',
): void {
  const start = input.selectionStart ?? 0
  const end = input.selectionEnd ?? start
  input.value = input.value.slice(0, start) + input.value.slice(end)
  input.setSelectionRange(start, start)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType }))
}

/** Backspace at a collapsed caret the way a browser does, then fire `input`. */
function backspace(input: HTMLInputElement): void {
  const pos = input.selectionStart ?? 0
  const width = Array.from(input.value.slice(0, pos)).pop()?.length ?? 0
  input.value = input.value.slice(0, pos - width) + input.value.slice(pos)
  input.setSelectionRange(pos - width, pos - width)
  input.dispatchEvent(
    new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }),
  )
}

/** Type one character over the current selection, then fire `input`. */
function type(input: HTMLInputElement, ch: string): void {
  const start = input.selectionStart ?? 0
  const end = input.selectionEnd ?? start
  input.value = input.value.slice(0, start) + ch + input.value.slice(end)
  input.setSelectionRange(start + ch.length, start + ch.length)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }))
}

/** Dispatch a keydown and apply the browser's default action (the `keydown` fallback path). */
function press(input: HTMLInputElement, key: string, valueAfter: string, caretAfter: number): void {
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  input.value = valueAfter
  input.setSelectionRange(caretAfter, caretAfter)
}

/** Render the value with the caret marked, so failures read as what the user would see. */
function marked(input: HTMLInputElement): string {
  const c = input.selectionStart ?? 0
  return `${input.value.slice(0, c)}|${input.value.slice(c)}`
}

/** Same rendering for a pure `applyMask` result. */
function mask(value: string, pattern: MaskPattern, caret: number, options?: ApplyMaskOptions): string {
  const m = applyMask(value, pattern, caret, options)
  return `${m.value.slice(0, m.caret)}|${m.value.slice(m.caret)}`
}

/**
 * `bind()` recomputes every deletion with eager off (see `eagerForEdit`), so
 * both settings have to agree on all of these — the sweeps below assert each
 * case twice rather than trusting one configuration.
 */
const EAGER_SETTINGS = [true, false] as const

// ---------------------------------------------------------------------------
// The reported case
// ---------------------------------------------------------------------------

describe('the reported case — deleting a field along with its closing divider', () => {
  it('keeps the frame and leaves the caret inside the emptied field', () => {
    // Browser state after selecting "(555)" out of "(555) 123-4567".
    for (const eager of EAGER_SETTINGS) {
      expect(applyMask(' 123-4567', PHONE, 0, { eager })).toEqual({
        value: '() 123-4567',
        caret: 1,
      })
    }
  })

  it('does the same through bind(), for Backspace and forward Delete', () => {
    for (const eager of EAGER_SETTINGS) {
      for (const inputType of ['deleteContentBackward', 'deleteContentForward'] as const) {
        const input = setupInput(FULL)
        bind(input, PHONE, { eager })
        input.setSelectionRange(0, 5)
        deleteSelection(input, inputType)
        expect(marked(input), `${inputType} eager=${eager}`).toBe('(|) 123-4567')
      }
    }
  })

  it('does the same through the keydown fallback path', async () => {
    for (const eager of EAGER_SETTINGS) {
      const input = setupInput(FULL)
      bind(input, PHONE, { eager })
      input.setSelectionRange(0, 5)
      press(input, 'Backspace', ' 123-4567', 0)
      await flushRafs()
      expect(marked(input), `eager=${eager}`).toBe('(|) 123-4567')
    }
  })

  it('does the same for a cut, whose inputType carries no direction', () => {
    for (const eager of EAGER_SETTINGS) {
      const input = setupInput(FULL)
      bind(input, PHONE, { eager })
      input.setSelectionRange(0, 5)
      deleteSelection(input, 'deleteByCut')
      expect(marked(input), `eager=${eager}`).toBe('(|) 123-4567')
    }
  })

  it('replaces the selection with a typed digit without disturbing the rest', () => {
    // Same selection, but typed over rather than deleted. The " " left of
    // "123-4567" still anchors it, so the digit lands alone in the area code.
    for (const eager of EAGER_SETTINGS) {
      const input = setupInput(FULL)
      bind(input, PHONE, { eager })
      input.setSelectionRange(0, 5)
      type(input, '9')
      expect(marked(input), `eager=${eager}`).toBe('(9|) 123-4567')
      type(input, '8')
      expect(marked(input), `eager=${eager}`).toBe('(98|) 123-4567')
      type(input, '7')
      // ") " now divides two fields that both hold text, so it is not a
      // frontier the caret is carried across.
      expect(marked(input), `eager=${eager}`).toBe('(987|) 123-4567')
    }
  })

  it('reports the framed value to onChange', () => {
    const seen: string[] = []
    const input = setupInput(FULL)
    bind(input, PHONE, (value) => seen.push(value))
    input.setSelectionRange(0, 5)
    deleteSelection(input)
    expect(seen).toEqual(['() 123-4567'])
  })

  it('lets the user retype the area code straight into the emptied field', () => {
    const input = setupInput(FULL)
    bind(input, PHONE)
    input.setSelectionRange(0, 5)
    deleteSelection(input)
    for (const ch of '999') type(input, ch)
    // The ") " divides two fields that both hold text now, so it is not a
    // frontier the caret is carried across — the untouched "123" stays put.
    expect(marked(input)).toBe('(999|) 123-4567')
  })
})

// ---------------------------------------------------------------------------
// When the divider is swallowed whole, the caret is the only evidence left
// ---------------------------------------------------------------------------

describe('a selection that takes the whole divider', () => {
  it('holds the untouched tail in its own field when typed over', () => {
    // Selecting "(555) " — space included — and typing "9" leaves "9123-4567",
    // where "123" reads exactly like more of the area code. Only the caret says
    // otherwise, and capacity proves it: "123-4567" fills the rest of the mask
    // exactly, so it cannot have come from the field being typed into.
    for (const eager of EAGER_SETTINGS) {
      expect(applyMask('9123-4567', PHONE, 1, { eager })).toEqual({
        value: '(9) 123-4567',
        caret: 2,
      })

      const input = setupInput(FULL)
      bind(input, PHONE, { eager })
      input.setSelectionRange(0, 6)
      type(input, '9')
      expect(marked(input), `bind eager=${eager}`).toBe('(9|) 123-4567')
    }
  })

  it('keeps filling the same field as more characters are typed', () => {
    const input = setupInput(FULL)
    bind(input, PHONE)
    input.setSelectionRange(0, 6)
    for (const [ch, expected] of [
      ['9', '(9|) 123-4567'],
      ['8', '(98|) 123-4567'],
      ['7', '(987|) 123-4567'],
    ] as const) {
      type(input, ch)
      expect(marked(input)).toBe(expected)
    }
  })

  it('applies to any mask, not just the leading field', () => {
    // "999-999" holding "123-456": select "123-", type "78".
    for (const eager of EAGER_SETTINGS) {
      expect(applyMask('7456', '999-999', 1, { eager }).value).toBe('7-456')
      expect(applyMask('78456', '999-999', 2, { eager }).value).toBe('78-456')
      // Deleting the same selection lands in the same place.
      expect(applyMask('1456', '999-999', 1, { eager }).value).toBe('1-456')
    }
  })

  it('treats a forward-deleted divider as fixed text rather than a reflow', () => {
    for (const eager of EAGER_SETTINGS) {
      const input = setupInput('12-345')
      bind(input, '999-999', { eager })
      input.setSelectionRange(2, 2)
      deleteSelection(input, 'deleteContentForward')
      expect(marked(input), `eager=${eager}`).toBe('12-|345')
    }
  })

  it('leaves the caret alone when it carries no information', () => {
    // A caret that is not sitting behind something this edit put in the field
    // says nothing, so the value packs from the left as it always has. That is
    // what keeps `process()` and friends — which mask at caret 0 — stable.
    expect(applyMask('123-4567', PHONE, 0).value).toBe('(123) -4567')
    expect(applyMask('1456', '999-999', 0).value).toBe('145-6')
    expect(applyMask('9123-4567', PHONE, 9).value).toBe('(912) 3-4567')
  })

  it('never overrules a divider that is still in the value', () => {
    // The anchoring already knows where these belong; letting the caret move
    // them would also break idempotence, since bind() re-masks its own output
    // on every keystroke.
    for (const eager of EAGER_SETTINGS) {
      for (const [value, caret] of [
        ['82--2', 1], ['22--3', 1], ['(9) 123-4567', 2], ['7-456', 1], ['12-345', 2],
      ] as const) {
        const pattern = value.includes('--') ? '99--99' : value.startsWith('(') ? PHONE : '999-999'
        const first = applyMask(value, pattern, caret, { eager })
        expect(first.value, `${value}@${caret} eager=${eager}`).toBe(value)
        const again = applyMask(first.value, pattern, first.caret, { eager })
        expect(again.value, `re-mask ${value}@${caret} eager=${eager}`).toBe(first.value)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Surviving fragments anchor their segment
// ---------------------------------------------------------------------------

describe('a surviving divider fragment anchors the data behind it', () => {
  // Every selection that ends *inside* ") " leaves part of it behind. The
  // untouched "123-4567" must stay in the segments it was already in.
  const cases: [start: number, end: number, raw: string, expected: string][] = [
    [0, 4, ') 123-4567', '(|) 123-4567'],
    [0, 5, ' 123-4567', '(|) 123-4567'],
    [1, 4, '() 123-4567', '(|) 123-4567'],
    [1, 5, '( 123-4567', '(|) 123-4567'],
    [2, 5, '(5 123-4567', '(5|) 123-4567'],
    [3, 5, '(55 123-4567', '(55|) 123-4567'],
    [4, 5, '(555 123-4567', '(555|) 123-4567'],
  ]

  for (const [start, end, raw, expected] of cases) {
    it(`selection [${start},${end}) leaves ${JSON.stringify(raw)}`, () => {
      expect(FULL.slice(0, start) + FULL.slice(end)).toBe(raw)
      for (const eager of EAGER_SETTINGS) {
        expect(mask(raw, PHONE, start, { eager }), `applyMask eager=${eager}`).toBe(expected)

        const input = setupInput(FULL)
        bind(input, PHONE, { eager })
        input.setSelectionRange(start, end)
        deleteSelection(input)
        expect(marked(input), `bind eager=${eager}`).toBe(expected)
      }
    })
  }

  it('anchors on a fragment of any length of a wider divider', () => {
    // " - " can survive as "- " or as " ", and neither may repack "34".
    for (const eager of EAGER_SETTINGS) {
      expect(mask('- 34', SPACED, 0, { eager }), 'tail "- "').toBe('| - 34')
      expect(mask(' 34', SPACED, 0, { eager }), 'tail " "').toBe('| - 34')
      expect(mask('1- 34', SPACED, 1, { eager }), 'tail "- " after a digit').toBe('1| - 34')
      expect(mask('1 34', SPACED, 2, { eager }), 'tail " " after a digit').toBe('1 - |34')
    }
  })

  it('anchors on a fragment of a multi-character escaped divider', () => {
    for (const eager of EAGER_SETTINGS) {
      // "A-" opens the mask, so deleting "A-12" leaves ".34" with no fragment
      // of the opening literal — the frame is rebuilt from the surviving ".".
      expect(mask('.34', ESCAPED, 0, { eager })).toBe('A-|.34')
    }
  })
})

// ---------------------------------------------------------------------------
// Fragments are weaker evidence than an intact divider
// ---------------------------------------------------------------------------

describe('an intact divider always outranks a fragment', () => {
  it('prefers a whole divider further along over a fragment right here', () => {
    // "- 34" opens with a "-", which is both a complete run-2 divider and the
    // "- " tail of run 1's " - ". The complete one wins, so "34" lands in the
    // last field rather than the middle one.
    for (const eager of EAGER_SETTINGS) {
      expect(applyMask('- 34', '99 - 99-99', 0, { eager }).value).toBe('-34')
    }
  })

  it('still rejects a fragment that cannot hold what is left', () => {
    // A fragment is only an anchor while everything after it fits from that
    // segment on; "12345" cannot fit in the last two slots, so the space is
    // noise and the digits pack from the left.
    for (const eager of EAGER_SETTINGS) {
      expect(applyMask(' 12345', SPACED, 0, { eager }).value).toBe('12 - 34')
    }
  })
})

// ---------------------------------------------------------------------------
// The restored frame is structure, not a resurrection
// ---------------------------------------------------------------------------

describe('the restored opening literal', () => {
  it('comes back only while the divider closing its field survives', () => {
    for (const eager of EAGER_SETTINGS) {
      // ") " is still there: the frame is intact, so "(" returns.
      expect(applyMask(') 123-4567', PHONE, 0, { eager }).value).toBe('() 123-4567')
      // Nothing of ") " left: "(" is gone for good.
      expect(applyMask('-4567', PHONE, 0, { eager: false }).value).toBe('-4567')
    }
  })

  it('can still be backspaced past instead of trapping the caret', () => {
    const input = setupInput('() 123-4567')
    bind(input, PHONE)
    input.setSelectionRange(1, 1)
    backspace(input)
    // The "(" cannot go while ") 123-4567" holds the frame open, but the
    // keystroke still moves the caret, exactly as over any fixed character.
    expect(marked(input)).toBe('|() 123-4567')
    backspace(input)
    expect(marked(input)).toBe('|() 123-4567')
  })

  it('is removable once the field behind it is the only thing left', () => {
    const input = setupInput('(555) ')
    bind(input, PHONE)
    input.setSelectionRange(6, 6)
    for (const expected of ['(555|', '(55|', '(5|', '|']) {
      backspace(input)
      expect(marked(input)).toBe(expected)
    }
  })

  it('never appears for a value with no data in it at all', () => {
    for (const eager of EAGER_SETTINGS) {
      expect(applyMask(') ', PHONE, 0, { eager: false }).value).toBe('')
      expect(applyMask('x', PHONE, 1, { eager }).value).toBe(eager ? '(' : '')
    }
  })
})

// ---------------------------------------------------------------------------
// Masks that cannot fragment must not change
// ---------------------------------------------------------------------------

describe('single-character dividers are untouched', () => {
  it('still drops the dividers around segments that are simply empty', () => {
    expect(applyMask('015-39', CPF, 3, { eager: false })).toEqual({ value: '015-39', caret: 3 })
    expect(applyMask('015-39', CPF, 3)).toEqual({ value: '015.-39', caret: 4 })
  })

  it('deletes a whole field out of a date without disturbing the year', () => {
    for (const eager of EAGER_SETTINGS) {
      const input = setupInput('25/12/2025')
      bind(input, DATE, { eager })
      input.setSelectionRange(3, 5)
      deleteSelection(input)
      expect(marked(input), `eager=${eager}`).toBe('25/|/2025')
    }
  })

  it('leaves flat masking alone', () => {
    // Flat mode is defined to repack everything from the left; a fragment is
    // no more meaningful there than any other stray character.
    expect(applyMask(' 123-4567', PHONE, 0, { segmented: false }).value).toBe('(123) 456-7')
  })
})

// ---------------------------------------------------------------------------
// Astral separators
// ---------------------------------------------------------------------------

describe('astral-plane dividers', () => {
  const EMOJI = '99\u{1F642}\u{1F642}99'

  it('fragments on code point boundaries, never on a lone surrogate', () => {
    for (const eager of EAGER_SETTINGS) {
      const m = applyMask('\u{1F642}34', EMOJI, 2, { eager })
      expect(m.value).toBe('\u{1F642}\u{1F642}34')
      // Caret 4 is between the two emoji — a whole number of code points in.
      expect(m.caret).toBe(4)
      expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(m.value)).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// Whole-sweep invariants
// ---------------------------------------------------------------------------

describe('every selection-delete on every fragmenting mask', () => {
  const SWEEPS: { name: string, pattern: MaskPattern, full: string }[] = [
    { name: 'phone', pattern: PHONE, full: FULL },
    { name: 'spaced', pattern: SPACED, full: '12 - 34' },
    { name: 'escaped prefix', pattern: ESCAPED, full: 'A-12.34' },
    { name: 'cpf', pattern: CPF, full: '012.153.441-39' },
  ]

  for (const { name, pattern, full } of SWEEPS) {
    it(`${name}: renders a value that masks back to itself`, () => {
      const failures: string[] = []
      for (let start = 0; start <= full.length; start++) {
        for (let end = start + 1; end <= full.length; end++) {
          for (const eager of EAGER_SETTINGS) {
            const raw = full.slice(0, start) + full.slice(end)
            const first = applyMask(raw, pattern, start, { eager })
            const again = applyMask(first.value, pattern, first.caret, { eager })
            if (again.value !== first.value) {
              failures.push(`[${start},${end}) eager=${eager}: ${JSON.stringify(first.value)} -> ${JSON.stringify(again.value)}`)
            }
          }
        }
      }
      expect(failures).toEqual([])
    })

    it(`${name}: never drops a character the deletion did not select`, () => {
      const failures: string[] = []
      // Every mask swept here is digits-only, so anything else the render
      // shows is mask structure rather than data the user typed.
      const digits = (s: string) => s.replace(/[^0-9]/g, '')
      for (let start = 0; start <= full.length; start++) {
        for (let end = start + 1; end <= full.length; end++) {
          for (const eager of EAGER_SETTINGS) {
            const raw = full.slice(0, start) + full.slice(end)
            const out = applyMask(raw, pattern, start, { eager }).value
            if (digits(out) !== digits(raw)) {
              failures.push(`[${start},${end}) eager=${eager}: ${JSON.stringify(raw)} -> ${JSON.stringify(out)}`)
            }
          }
        }
      }
      expect(failures).toEqual([])
    })

    it(`${name}: keeps the caret inside the rendered value`, () => {
      const failures: string[] = []
      for (let start = 0; start <= full.length; start++) {
        for (let end = start + 1; end <= full.length; end++) {
          for (const eager of EAGER_SETTINGS) {
            const raw = full.slice(0, start) + full.slice(end)
            const m = applyMask(raw, pattern, start, { eager })
            if (m.caret < 0 || m.caret > m.value.length) {
              failures.push(`[${start},${end}) eager=${eager}: caret ${m.caret} of ${JSON.stringify(m.value)}`)
            }
          }
        }
      }
      expect(failures).toEqual([])
    })

    it(`${name}: backspacing from anywhere always reaches an empty field`, () => {
      // Restored structure must never wedge the caret: repeated Backspace
      // has to keep making progress until the input is empty.
      for (const eager of EAGER_SETTINGS) {
        const input = setupInput(full)
        bind(input, pattern, { eager })
        input.setSelectionRange(full.length, full.length)
        for (let step = 0; step < full.length * 2 + 4; step++) {
          if (input.value === '') break
          const before = `${input.value}@${input.selectionStart}`
          backspace(input)
          expect(`${input.value}@${input.selectionStart}`, `${name} eager=${eager} stuck at ${before}`).not.toBe(before)
        }
        expect(input.value, `${name} eager=${eager}`).toBe('')
      }
    })
  }
})

// ---------------------------------------------------------------------------
// Paste over a selection that cuts a divider
// ---------------------------------------------------------------------------

describe('pasting over a selection that cuts a divider', () => {
  it('drops the pasted digits into the field the fragment anchors', async () => {
    const input = setupInput(FULL)
    bind(input, PHONE)
    input.setSelectionRange(0, 5)
    // Browser applies the paste, then the mask reformats on the next frame.
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    input.value = '999 123-4567'
    input.setSelectionRange(3, 3)
    await flushRafs()
    // Both fields hold text, so the caret stops at the divider it filled up to.
    expect(marked(input)).toBe('(999|) 123-4567')
  })
})
