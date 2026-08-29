import { describe, it, expect } from 'vitest'
import { applyMask, bind } from '../src/index'
import type { MaskPattern } from '../src/index'
import { restoreSwallowedSeparators } from '../src/bind-shared'
import { PatternCompiler } from '../src/pattern'

// ---------------------------------------------------------------------------
// Reported case: selecting a whole field *and* the separator introducing the
// next one — "(11) " out of "(11) 98765-4321" — and deleting used to hand the
// engine "98765-4321", indistinguishable from fresh digits typed into an
// empty mask. The untouched "98765" and "4321" would scatter across the
// wrong fields: "(98) 765-4321". `bind()` now restores the separator(s) an
// edit swallowed whole before masking, so untouched data stays in the field
// it was always in and only the field the user actually touched empties.
//
// This is deliberately a `bind()`-only fix (see `restoreSwallowedSeparators`
// in bind-shared.ts): pure `applyMask`/`buildMask`/`process` are functions of
// `(value, caret)` alone and can't tell "the user just deleted through here"
// from "these are the first characters ever typed" — that ambiguity is
// exactly why `applyMask('123-4567', PHONE, 0)` still packs from the left
// (see tests/divider-edge-cases.test.ts). `bind()` knows an edit happened and
// which one, so it can resolve the ambiguity pure `applyMask` cannot.
// ---------------------------------------------------------------------------

const PHONE = '(99) 99999-9999' // Brazilian mobile: 2 + 5 + 4 digits, distinct separators
const CPF = '999.999.999-99'
const REPEATED_COLON = 'HH:HH:HH' // three fields, the *same* separator twice
const PHONE_ARRAY: MaskPattern = ['(99) 9999-9999', '(99) 99999-9999']

function setupInput(): HTMLInputElement {
  const input = document.createElement('input')
  document.body.appendChild(input)
  return input
}

/** Type one character over the current selection the way a browser does, then fire `input`. */
function type(input: HTMLInputElement, ch: string): void {
  const start = input.selectionStart ?? 0
  const end = input.selectionEnd ?? start
  input.value = input.value.slice(0, start) + ch + input.value.slice(end)
  input.setSelectionRange(start + ch.length, start + ch.length)
  input.dispatchEvent(
    new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }),
  )
}

function fill(input: HTMLInputElement, raw: string): void {
  for (const ch of raw) type(input, ch)
}

/** Apply a deletion the way a browser does (collapsed caret or selection), then fire `input`. */
function deleteWith(
  input: HTMLInputElement,
  inputType: 'deleteContentBackward' | 'deleteContentForward' | 'deleteByCut' | 'deleteWordBackward' | 'deleteSoftLineBackward',
): void {
  const start = input.selectionStart ?? 0
  const end = input.selectionEnd ?? start
  if (start !== end) {
    input.value = input.value.slice(0, start) + input.value.slice(end)
    input.setSelectionRange(start, start)
  } else if (inputType === 'deleteContentBackward' || inputType === 'deleteWordBackward' || inputType === 'deleteSoftLineBackward') {
    const width = Array.from(input.value.slice(0, start)).pop()?.length ?? 0
    input.value = input.value.slice(0, start - width) + input.value.slice(start)
    input.setSelectionRange(start - width, start - width)
  } else {
    const width = Array.from(input.value.slice(start))[0]?.length ?? 0
    input.value = input.value.slice(0, start) + input.value.slice(start + width)
    input.setSelectionRange(start, start)
  }
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType }))
}

function select(input: HTMLInputElement, start: number, end: number): void {
  input.setSelectionRange(start, end)
}

/** Dispatch a keydown and apply the browser's default action (the `keydown` fallback path). */
function press(input: HTMLInputElement, key: string, valueAfter: string, caretAfter: number): void {
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  input.value = valueAfter
  input.setSelectionRange(caretAfter, caretAfter)
}

async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
}

// ---------------------------------------------------------------------------
// The exact reported scenario, and the shapes right around it
// ---------------------------------------------------------------------------

describe('selecting a field and its closing separator, then deleting', () => {
  for (const key of ['deleteContentBackward', 'deleteContentForward'] as const) {
    it(`restores "() " and leaves "98765-4321" untouched (${key})`, () => {
      const input = setupInput()
      bind(input, PHONE)
      fill(input, '11987654321')
      expect(input.value).toBe('(11) 98765-4321')

      select(input, 0, 5) // "(11) " — both digits, the closing paren, and the space
      deleteWith(input, key)
      expect(input.value).toBe('() 98765-4321')
      expect(input.selectionStart).toBe(1)
    })

    it(`does the same when the opening paren is left out of the selection (${key})`, () => {
      const input = setupInput()
      bind(input, PHONE)
      fill(input, '11987654321')

      select(input, 1, 5) // "11) " — the "(" itself survives untouched
      deleteWith(input, key)
      expect(input.value).toBe('() 98765-4321')
      expect(input.selectionStart).toBe(1)
    })
  }

  it('restores the frame via Cut (deleteByCut) exactly like Backspace/Delete', () => {
    const input = setupInput()
    bind(input, PHONE)
    fill(input, '11987654321')

    select(input, 0, 5)
    deleteWith(input, 'deleteByCut')
    expect(input.value).toBe('() 98765-4321')
  })

  it('a selection stopping before the space needed no rescue in the first place', () => {
    // "(11" and "(11)" both leave the space behind, which the pure algorithm
    // already reads as the tail of ") " on its own — this is a regression
    // lock on the pre-existing behavior the rescue must not disturb.
    for (const end of [3, 4]) {
      const input = setupInput()
      bind(input, PHONE)
      fill(input, '11987654321')
      select(input, 0, end)
      deleteWith(input, 'deleteContentBackward')
      expect(input.value).toBe('() 98765-4321')
    }
  })

  it('also drops the digits the selection actually reached', () => {
    // Selecting "(11) 9" removes the area code, its frame, *and* the mobile
    // field's own first digit — that digit is genuinely gone, but "8765" and
    // "4321" (never touched) still land in their own fields.
    const input = setupInput()
    bind(input, PHONE)
    fill(input, '11987654321')
    select(input, 0, 6)
    deleteWith(input, 'deleteContentBackward')
    expect(input.value).toBe('() 8765-4321')
  })

  it('restores every separator a wider selection swallows, provided one still survives', () => {
    // "(11) 98765" removes both fields' data and the "(11) " frame, but
    // leaves the "-" standing — that surviving separator is what lets the
    // rescue trust restoring "() " ahead of it too, emptying both fields
    // instead of letting "4321" scatter across them.
    const input = setupInput()
    bind(input, PHONE)
    fill(input, '11987654321')
    select(input, 0, 10)
    deleteWith(input, 'deleteContentBackward')
    expect(input.value).toBe('() -4321')
  })
})

// ---------------------------------------------------------------------------
// Every field the deletion fully crosses reappears empty, all the way up to
// wiping out the mask's *only* separator — capacity is what pins each
// restored separator to the one field it can mean, not how many candidates
// happen to survive elsewhere in the value.
// ---------------------------------------------------------------------------

describe('restoring holds even when the deletion crosses every separator', () => {
  it('empties both leading fields and still keeps "4321" as the last one', () => {
    const input = setupInput()
    bind(input, PHONE)
    fill(input, '11987654321')

    // "(11) 98765-" takes every separator with it — the frame *and* the
    // "-" — but "4321" was never touched, so it stays the last field.
    select(input, 0, 11)
    deleteWith(input, 'deleteContentBackward')
    expect(input.value).toBe('() -4321')
  })

  it('clearing the whole field still clears the whole field', () => {
    const input = setupInput()
    bind(input, PHONE)
    fill(input, '11987654321')
    select(input, 0, input.value.length)
    deleteWith(input, 'deleteContentBackward')
    expect(input.value).toBe('')
  })
})

// ---------------------------------------------------------------------------
// A separator repeating elsewhere in the mask does not confuse the rescue —
// the restored copy lands exactly where the deleted one stood, and the
// engine's own capacity check resolves the rest, exactly as it would for any
// other anchor (see the doc comment on restoreSwallowedSeparators).
// ---------------------------------------------------------------------------

describe('a separator that repeats elsewhere in the mask', () => {
  it('still restores the correct occurrence and keeps "b2" and "c3" in their own fields', () => {
    const input = setupInput()
    bind(input, REPEATED_COLON, { tokens: { H: /[0-9a-f]/i } })
    fill(input, 'a1b2c3')
    expect(input.value).toBe('a1:b2:c3')

    select(input, 0, 3) // "a1:" — first field and its own colon
    deleteWith(input, 'deleteContentBackward')

    // "b2" and "c3" keep their own field's identity instead of "b2" sliding
    // into the now-empty first field, even though ":" appears twice in the mask.
    expect(input.value).toBe(':b2:c3')
  })
})

// ---------------------------------------------------------------------------
// CPF: the README's own repeated-separator example, with three dots and a
// distinct trailing dash — the same shape as the reported phone case, just
// with punctuation instead of a parenthesized frame.
// ---------------------------------------------------------------------------

describe('CPF (999.999.999-99)', () => {
  it('restores the swallowed "." and keeps every later group in place', () => {
    const input = setupInput()
    bind(input, CPF)
    fill(input, '12345678901')
    expect(input.value).toBe('123.456.789-01')

    select(input, 0, 4) // "123." — first group and its own dot
    deleteWith(input, 'deleteContentBackward')
    expect(input.value).toBe('.456.789-01')
  })
})

// ---------------------------------------------------------------------------
// Masks without a leading frame — the rescue is not specific to "(" openers
// ---------------------------------------------------------------------------

describe('a mask with two distinct separators and no leading literal', () => {
  it('restores the swallowed "#" and keeps "cd" and "ef" in their own fields', () => {
    const input = setupInput()
    bind(input, 'LL#LL@LL', { tokens: { L: /\p{L}/u } })
    fill(input, 'abcdef')
    expect(input.value).toBe('ab#cd@ef')

    select(input, 0, 3) // "ab#"
    deleteWith(input, 'deleteContentBackward')
    expect(input.value).toBe('#cd@ef')
  })
})

// ---------------------------------------------------------------------------
// Divider erosion — one keystroke (or a selection confined to the divider)
// peeling back separator text on purpose — must keep working unrescued.
// ---------------------------------------------------------------------------

describe('deleting only separator text is left alone, however wide', () => {
  it('a single Backspace through the space keeps collapsing the divider', () => {
    const input = setupInput()
    bind(input, PHONE)
    input.value = '(11) -4321'
    input.setSelectionRange(5, 5)
    deleteWith(input, 'deleteContentBackward')
    expect(input.value).toBe('(11-4321')
  })

  it('a selection confined to ") " alone (no data in range) is not restored', () => {
    const input = setupInput()
    bind(input, PHONE)
    input.value = '(11) -4321'
    select(input, 3, 5) // ") " only
    deleteWith(input, 'deleteContentBackward')
    expect(input.value).toBe('(11-4321')
  })

  it('backspacing the eager "." off "012." still deletes it for good', () => {
    const input = setupInput()
    bind(input, '999.999')
    input.value = '012.'
    input.setSelectionRange(4, 4)
    deleteWith(input, 'deleteContentBackward')
    expect(input.value).toBe('012')
  })
})

// ---------------------------------------------------------------------------
// Word/line deletes are a deliberate bulk clear — never rescued
// ---------------------------------------------------------------------------

describe('word and line deletes bypass the rescue', () => {
  it('deleteWordBackward reformats the struck-through value as-is', () => {
    const input = setupInput()
    bind(input, PHONE)
    fill(input, '11987654321')
    expect(input.value).toBe('(11) 98765-4321')

    // Simulate the OS word-delete having already removed "(11) " from the DOM.
    input.value = '98765-4321'
    input.setSelectionRange(0, 0)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteWordBackward' }))

    const plain = applyMask('98765-4321', PHONE, 0, { eager: false })
    expect(input.value).toBe(plain.value)
  })
})

// ---------------------------------------------------------------------------
// Array and resolver masks — which pattern applies can change with the new,
// shorter data count, so a literal restored from the old layout could land
// somewhere the newly-resolved pattern never had. Never rescued.
// ---------------------------------------------------------------------------

describe('array masks bypass the rescue', () => {
  it('reformats through whichever array member the shorter data now resolves to', () => {
    const input = setupInput()
    bind(input, PHONE_ARRAY)
    fill(input, '1199988766') // 10 digits -> the shorter '(99) 9999-9999' member
    expect(input.value).toBe('(11) 9998-8766')

    select(input, 0, 5) // "(11) "
    deleteWith(input, 'deleteContentBackward')

    const plain = applyMask('9998-8766', PHONE_ARRAY, 0, { eager: false })
    expect(input.value).toBe(plain.value)
  })
})

// ---------------------------------------------------------------------------
// eager has no bearing on the rescue either way
// ---------------------------------------------------------------------------

describe('eager setting does not change the rescue', () => {
  for (const eager of [true, false]) {
    it(`still restores "() " with eager=${eager}`, () => {
      const input = setupInput()
      bind(input, PHONE, { eager })
      fill(input, '11987654321')
      select(input, 0, 5)
      deleteWith(input, 'deleteContentBackward')
      expect(input.value).toBe('() 98765-4321')
    })
  }
})

// ---------------------------------------------------------------------------
// The `keydown`/rAF fallback path (`onKey`, used when a browser never fires
// `input` reliably) does not carry `InputEvent.inputType` at all, so it has
// no signal to tell a plain content delete from a word/line delete — it is
// intentionally left out of scope for the rescue. This is a scope boundary,
// not a passing assertion of desired behavior: it documents what the
// fallback path does today.
// ---------------------------------------------------------------------------

describe('the keydown/rAF fallback path is out of scope for the rescue', () => {
  it('packs from the left, matching pure applyMask on the raw value', async () => {
    const input = setupInput()
    bind(input, PHONE)
    input.value = '(11) 98765-4321'
    input.setSelectionRange(0, 5) // "(11) "

    // Only `keydown` fires here (no `input` event), isolating the fallback
    // path `onKey` schedules via `requestAnimationFrame` — the same path
    // browsers that never fire `input` reliably would take.
    press(input, 'Backspace', '98765-4321', 0)
    await flushRafs()

    const plain = applyMask('98765-4321', PHONE, 0, { eager: false })
    expect(input.value).toBe(plain.value)
    expect(input.value).not.toBe('() 98765-4321')
  })
})

// ---------------------------------------------------------------------------
// Unit-level coverage of the pure helper itself
// ---------------------------------------------------------------------------

describe('restoreSwallowedSeparators (unit)', () => {
  const compiler = new PatternCompiler()
  const isData = (ch: string): boolean => compiler.isData(ch)

  it('is a no-op when nothing was deleted', () => {
    expect(restoreSwallowedSeparators('abc', 1, 0, 'abc', isData)).toBe('abc')
  })

  it('bails when the shape is not a pure [pos, pos+len) cut', () => {
    // "previousValue" and "rawValue" do not agree outside the claimed range.
    expect(restoreSwallowedSeparators('XYZ', 1, 1, 'abc', isData)).toBe('XYZ')
  })

  it('bails when the deletion runs past the end of previousValue', () => {
    expect(restoreSwallowedSeparators('ab', 1, 5, 'abc', isData)).toBe('ab')
  })

  it('restores a single swallowed separator ahead of surviving data', () => {
    // "(11) " deleted from "(11) 98765-4321", leaving "98765-4321".
    expect(restoreSwallowedSeparators('98765-4321', 0, 5, '(11) 98765-4321', isData)).toBe('() 98765-4321')
  })

  it('restores every separator the deletion crossed, in order', () => {
    expect(restoreSwallowedSeparators('4321', 0, 11, '(11) 98765-4321', isData)).toBe('() -4321')
  })

  it('drops nothing when the removed span held no separator at all', () => {
    // Removing "1198765" (all data, no literal) from "1198765-4321" leaves
    // "-4321" — there is no separator in the deleted span to restore.
    expect(restoreSwallowedSeparators('-4321', 0, 7, '1198765-4321', isData)).toBe('-4321')
  })

  it('declines when the removed span held no data at all', () => {
    // Removing just the space from "(11) 4321" leaves "(11)4321" — that
    // space was pure divider erosion, not a swallow alongside real data.
    expect(restoreSwallowedSeparators('(11)4321', 4, 1, '(11) 4321', isData)).toBe('(11)4321')
  })

  it('declines when nothing survives after the cut to corroborate a boundary', () => {
    expect(restoreSwallowedSeparators('', 0, 15, '(11) 98765-4321', isData)).toBe('')
  })

  it('restores even a mask\'s one and only separator, capacity pinning the split', () => {
    // "ab-" (the whole first field, plus the divider) is gone; "cd" was
    // never touched, so it stays the second field instead of sliding into
    // the now-empty first one.
    expect(restoreSwallowedSeparators('cd', 0, 3, 'ab-cd', isData)).toBe('-cd')
  })
})
