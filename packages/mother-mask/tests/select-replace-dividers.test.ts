import { describe, it, expect, afterEach } from 'vitest'
import { applyMask, bind, buildMask } from '../src/index'
import type { ApplyMaskOptions, MaskPattern } from '../src/index'
import { restoreSwallowedSeparators } from '../src/bind-shared'
import { PatternCompiler } from '../src/pattern'

// ---------------------------------------------------------------------------
// Typing over a selection destroys the same dividers the equivalent Delete
// would, and `bind()` gives it the same rescue.
//
// Reported case: with "9{1,2}/9{1,2}/9{4}" holding "3/12/1986", selecting
// "3/12" and typing "4" left "4/1986". Every separator in that mask reads
// alike, so the lone surviving "/" was taken for the day's and the untouched
// year broke apart into "4/19/86". The fixed "99/99/9999" failed identically —
// this was never about quantifiers, only about masks whose separators cannot
// tell their fields apart once one of them is gone.
//
// The rescue is conditional, unlike the delete one: replacing a selection
// leaves the user typing forward, so the divider only goes back when the
// plain reformat would otherwise move text the edit never touched. Retyping a
// CPF over "012.153.441" keeps its "-39" either way, and there a restored dot
// would only sit in the user's way.
// ---------------------------------------------------------------------------

const FLEX_DATE = '9{1,2}/9{1,2}/9{4}'
const DATE = '99/99/9999'
const CPF = '999.999.999-99'
const PHONE = '(99) 99999-9999'

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
}

/**
 * A bound input already holding `value`.
 *
 * Seeded *before* binding so the binder's baseline matches what is on screen —
 * that baseline is how a later edit knows what it destroyed.
 */
function bound(value: string, mask: MaskPattern, options?: ApplyMaskOptions): HTMLInputElement {
  const input = document.createElement('input')
  document.body.appendChild(input)
  input.value = value
  bind(input, mask, options ?? null)
  return input
}

/** Type `text` over the selection `[start, end)` the way a browser does. */
function typeOver(input: HTMLInputElement, start: number, end: number, text: string): void {
  input.setSelectionRange(start, end)
  input.value = input.value.slice(0, start) + text + input.value.slice(end)
  input.setSelectionRange(start + text.length, start + text.length)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
}

/** Type at the current caret. */
function type(input: HTMLInputElement, text: string): void {
  const at = input.selectionStart ?? 0
  typeOver(input, at, at, text)
}

/** Delete the selection `[start, end)`. */
function deleteRange(
  input: HTMLInputElement,
  start: number,
  end: number,
  inputType: 'deleteContentBackward' | 'deleteContentForward' = 'deleteContentBackward',
): void {
  input.setSelectionRange(start, end)
  input.value = input.value.slice(0, start) + input.value.slice(end)
  input.setSelectionRange(start, start)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType }))
}

/** Render the value with the caret marked, so failures read as what the user sees. */
function withCaret(input: HTMLInputElement): string {
  const c = input.selectionStart ?? 0
  return `${input.value.slice(0, c)}|${input.value.slice(c)}`
}

// ---------------------------------------------------------------------------
// The reported regression
// ---------------------------------------------------------------------------

describe('the reported regression — replacing a selection that spans a divider', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input.remove()
  })

  it('keeps "1986" in the year instead of re-segmenting it', () => {
    input = bound('3/12/1986', FLEX_DATE)
    typeOver(input, 0, 4, '4') // select "3/12"
    expect(withCaret(input)).toBe('4|//1986')
  })

  it('fails the same way, and is fixed the same way, on a fixed-width mask', () => {
    // Never a quantifier problem: `99/99/9999` re-segmented the year too.
    input = bound('3/12/1986', DATE)
    typeOver(input, 0, 4, '4')
    expect(withCaret(input)).toBe('4|//1986')
  })

  it('holds through the keystrokes that follow the replacement', () => {
    input = bound('3/12/1986', FLEX_DATE)
    typeOver(input, 0, 4, '4')
    const seen = [withCaret(input)]
    for (const ch of '78') {
      type(input, ch)
      seen.push(withCaret(input))
    }
    // The day still has a free slot, so the first "7" widens it to "47";
    // only then does eager hand the caret across into the month.
    expect(seen).toEqual(['4|//1986', '47/|/1986', '47/8|/1986'])
  })

  it('reaches the same place through the keydown/rAF fallback', async () => {
    input = bound('3/12/1986', FLEX_DATE)
    input.setSelectionRange(0, 4)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true, cancelable: true }))
    input.value = '4/1986'
    input.setSelectionRange(1, 1)
    await flushRafs()
    // The `keydown` path has no `inputType`/`data`, so it cannot know a
    // selection was replaced — it reformats the raw value as struck. The
    // `input` event is the authoritative path and fires first on every modern
    // browser; this only records that the fallback stays self-consistent.
    expect(input.value).toBe('4/19/86')
  })
})

// ---------------------------------------------------------------------------
// Every selection shape
// ---------------------------------------------------------------------------

describe('replacing each field of a date, with and without its divider', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input.remove()
  })

  const cases: [string, number, number, string, string][] = [
    ['the day alone', 0, 1, '4', '4|/12/1986'],
    ['the day and its divider', 0, 2, '4', '4|/12/1986'],
    ['the day, divider and month', 0, 4, '4', '4|//1986'],
    ['the day through the second divider', 0, 5, '4', '4|//1986'],
    ['the month alone', 2, 4, '7', '3/7|/1986'],
    ['the month and its divider', 2, 5, '7', '3/7|/1986'],
    ['the year alone', 5, 9, '2', '3/12/2|'],
    ['everything', 0, 9, '4', '4|'],
  ]

  for (const [name, start, end, ch, expected] of cases) {
    it(`${name} → ${expected}`, () => {
      input = bound('3/12/1986', FLEX_DATE)
      typeOver(input, start, end, ch)
      expect(withCaret(input)).toBe(expected)
    })
  }

  it('accepts a multi-character replacement', () => {
    input = bound('3/12/1986', FLEX_DATE)
    typeOver(input, 0, 4, '25')
    expect(withCaret(input)).toBe('25/|/1986')
  })

  it('handles a two-digit day being replaced by one', () => {
    input = bound('12/12/1986', FLEX_DATE)
    typeOver(input, 0, 5, '4')
    expect(withCaret(input)).toBe('4|//1986')
  })

  it('keeps the year when the month and its divider go mid-value', () => {
    input = bound('12/12/1986', FLEX_DATE)
    typeOver(input, 3, 6, '4')
    expect(withCaret(input)).toBe('12/4|/1986')
  })

  it('does not fire when the replacement swallowed no divider at all', () => {
    input = bound('12/12/1986', FLEX_DATE)
    typeOver(input, 3, 5, '4') // just the month digits
    expect(withCaret(input)).toBe('12/4|/1986')
  })

  it('leaves nothing to pin when the selection runs to the end', () => {
    input = bound('3/12/1986', FLEX_DATE)
    typeOver(input, 2, 9, '7')
    expect(withCaret(input)).toBe('3/7|')
  })
})

// ---------------------------------------------------------------------------
// Masks that never needed the rescue keep their exact behavior
// ---------------------------------------------------------------------------

describe('masks whose separators already pin the tail are untouched', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input.remove()
  })

  it('the CPF retype that segmented editing was built for still works', () => {
    // "-" is distinct, so "39" was never in danger; restoring the dots would
    // only get in the way of the digits still being typed.
    input = bound('012.153.441-39', CPF)
    typeOver(input, 0, 11, '0')
    expect(withCaret(input)).toBe('0|-39')
  })

  it('retyping the whole CPF prefix lands exactly where it always did', () => {
    input = bound('012.153.441-39', CPF)
    typeOver(input, 0, 11, '0')
    for (const ch of '15153441') type(input, ch)
    expect(withCaret(input)).toBe('015.153.441|-39')
  })

  it('a phone area code replaced by typing keeps the rest in place', () => {
    input = bound('(11) 98765-4321', PHONE)
    typeOver(input, 0, 5, '9')
    expect(withCaret(input)).toBe('(9|) 98765-4321')
  })

  it('ordered arrays are excluded — the resolved member can change', () => {
    input = bound('(11) 98765-4321', ['(99) 9999-9999', '(99) 99999-9999'])
    typeOver(input, 0, 5, '9')
    expect(input.value).toBe(buildMask('998765-4321', ['(99) 9999-9999', '(99) 99999-9999'], 1).process())
  })

  it('resolver masks are excluded too', () => {
    const resolveMask = (): MaskPattern => '9999 9999 9999 9999'
    input = bound('1234 5678 9012 3456', '9999 9999 9999 9999', { resolveMask })
    typeOver(input, 0, 5, '9')
    expect(input.value).toBe(buildMask('95678 9012 3456', '9999 9999 9999 9999', 1, { resolveMask }).process())
  })
})

// ---------------------------------------------------------------------------
// Deletes are unchanged
// ---------------------------------------------------------------------------

describe('deleting a selection keeps its existing, unconditional rescue', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input.remove()
  })

  it('deleting the day and its divider empties the day and pins the year', () => {
    input = bound('3/12/1986', FLEX_DATE)
    deleteRange(input, 0, 4)
    expect(withCaret(input)).toBe('|//1986')
  })

  it('deleting a phone area code leaves the number where it was', () => {
    input = bound('(11) 98765-4321', PHONE)
    deleteRange(input, 0, 5)
    expect(input.value).toBe('() 98765-4321')
  })

  it('forward delete behaves the same as backspace here', () => {
    input = bound('3/12/1986', FLEX_DATE)
    deleteRange(input, 2, 5, 'deleteContentForward')
    expect(input.value).toBe('3//1986')
  })
})

// ---------------------------------------------------------------------------
// Other insert types, custom tokens, escapes
// ---------------------------------------------------------------------------

describe('the rescue is scoped to edits that report what they inserted', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input.remove()
  })

  it('an insert type without `data` reformats the raw value as before', () => {
    input = bound('3/12/1986', FLEX_DATE)
    input.setSelectionRange(0, 4)
    input.value = '4/1986'
    input.setSelectionRange(1, 1)
    // `insertFromPaste` and IME commits leave `data` null.
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }))
    expect(input.value).toBe('4/19/86')
  })

  it('a plain insert with no selection is untouched', () => {
    input = bound('3/12/1986', FLEX_DATE)
    typeOver(input, 1, 1, '7')
    expect(withCaret(input)).toBe('37|/12/1986')
  })

  it('works with custom tokens and transforms', () => {
    const options: ApplyMaskOptions = {
      tokens: { U: { match: /[a-z]/i, transform: (char) => char.toUpperCase() } },
    }
    input = bound('AB::CD::EF', 'U{1,2}::U{1,2}::U{2}', options)
    typeOver(input, 0, 6, 'x')
    expect(withCaret(input)).toBe('X|::::EF')
  })

  it('works with an escaped literal in the pattern', () => {
    input = bound('A-12-34', '\\A-99-99')
    typeOver(input, 2, 5, '7')
    expect(input.value).toBe('A-7-34')
  })
})

// ---------------------------------------------------------------------------
// restoreSwallowedSeparators — the splice generalization
// ---------------------------------------------------------------------------

describe('restoreSwallowedSeparators() with an insertion', () => {
  const isData = (ch: string): boolean => new PatternCompiler().isData(ch)

  it('puts a swallowed divider back directly behind the inserted text', () => {
    expect(restoreSwallowedSeparators('4/1986', 1, 4, '3/12/1986', isData, 1)).toBe('4//1986')
    // The inserted character is kept verbatim, whatever it is — filtering it
    // is the engine's job, not this one's.
    expect(restoreSwallowedSeparators('X/1986', 1, 4, '3/12/1986', isData, 1)).toBe('X//1986')
  })

  it('restores every divider the selection crossed, in order', () => {
    expect(restoreSwallowedSeparators('9765-4321', 1, 7, '(11) 98765-4321', isData, 1))
      .toBe('9() 765-4321')
  })

  it('is the existing pure-deletion behavior when nothing was inserted', () => {
    expect(restoreSwallowedSeparators('/1986', 0, 4, '3/12/1986', isData, 0)).toBe('//1986')
    expect(restoreSwallowedSeparators('/1986', 0, 4, '3/12/1986', isData)).toBe('//1986')
  })

  it('leaves anything that is not a single clean splice alone', () => {
    // Prefix does not line up — the text before the cut changed too.
    expect(restoreSwallowedSeparators('9X/1986', 2, 3, '3/12/1986', isData, 1)).toBe('9X/1986')
    // Suffix does not line up.
    expect(restoreSwallowedSeparators('4/198', 1, 4, '3/12/1986', isData, 1)).toBe('4/198')
    // Inserted more than there is room for before the caret.
    expect(restoreSwallowedSeparators('4/1986', 1, 4, '3/12/1986', isData, 5)).toBe('4/1986')
    // Nothing removed.
    expect(restoreSwallowedSeparators('4/1986', 1, 0, '3/12/1986', isData, 1)).toBe('4/1986')
  })

  it('leaves a selection that destroyed no data alone', () => {
    // Only divider text was replaced — plain divider erosion, not a swallow.
    expect(restoreSwallowedSeparators('3x12/1986', 2, 1, '3/12/1986', isData, 1)).toBe('3x12/1986')
  })

  it('leaves a cut with nothing surviving past it alone', () => {
    expect(restoreSwallowedSeparators('3/7', 3, 6, '3/12/1986', isData, 1)).toBe('3/7')
  })
})

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

describe('re-masking a render at its own caret stays a no-op', () => {
  it('holds for value and caret across generated values', () => {
    const masks = [
      FLEX_DATE, DATE, CPF, PHONE, '9{1,2}//9{1,2}//9{4}', '99--9-9', '99.99.99.99',
      '9{4}-9{1,2}-9{1,2}', 'Z{2,4}-9{1,3}', '(999) 999-9999', '99:99', 'AAA-9999',
    ]
    const alphabet = '0123456789AByz./-: ()'
    let seed = 5150
    const rnd = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }

    for (let i = 0; i < 20000; i++) {
      const mask = masks[Math.floor(rnd() * masks.length)]
      let value = ''
      const len = Math.floor(rnd() * 20)
      for (let j = 0; j < len; j++) value += alphabet[Math.floor(rnd() * alphabet.length)]
      const caret = Math.floor(rnd() * (value.length + 1))
      const eager = rnd() < 0.5

      const first = applyMask(value, mask, caret, { eager })
      const second = applyMask(first.value, mask, first.caret, { eager })
      expect({ mask, value, caret, eager, out: second.value, at: second.caret }).toEqual({
        mask, value, caret, eager, out: first.value, at: first.caret,
      })
    }
  })
})

// ---------------------------------------------------------------------------
// The caret stays in the field being typed
//
// A replacement that leaves a bounded-quantifier field below its maximum has
// not finished that field — the mask cannot know whether the user meant "2" or
// is on their way to "22". Handing the caret across the divider would spend
// the next keystroke on the wrong field, so it stays put until the field is
// genuinely full and the ordinary eager reveal moves it on.
// ---------------------------------------------------------------------------

describe('a replacement leaves a partly filled field open', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input.remove()
  })

  it('lets a one-digit day grow to two after replacing "3/1" with "2"', () => {
    input = bound('3/1/1998', FLEX_DATE)
    typeOver(input, 0, 3, '2')
    expect(withCaret(input)).toBe('2|//1998')

    type(input, '2')
    expect(withCaret(input)).toBe('22/|/1998')

    type(input, '2')
    expect(withCaret(input)).toBe('22/2|/1998')
  })

  it('moves on by itself when the replacement already fills the field', () => {
    input = bound('3/12/1986', FLEX_DATE)
    typeOver(input, 0, 4, '25')
    expect(withCaret(input)).toBe('25/|/1986')
    type(input, '7')
    expect(withCaret(input)).toBe('25/7|/1986')
  })

  it('holds the caret in a fixed-width field the same way', () => {
    input = bound('25/12/2025', DATE)
    typeOver(input, 0, 5, '4')
    expect(withCaret(input)).toBe('4|//2025')
    type(input, '7')
    expect(withCaret(input)).toBe('47/|/2025')
  })

  it('keeps a replaced month open for its second digit', () => {
    input = bound('3/12/1986', FLEX_DATE)
    typeOver(input, 2, 4, '4')
    expect(withCaret(input)).toBe('3/4|/1986')
    type(input, '5')
    expect(withCaret(input)).toBe('3/45|/1986')
  })

  it('keeps a replaced day open when only the day was selected', () => {
    input = bound('3/1/1998', FLEX_DATE)
    typeOver(input, 0, 1, '2')
    expect(withCaret(input)).toBe('2|/1/1998')
    type(input, '5')
    expect(withCaret(input)).toBe('25|/1/1998')
  })

  it('never jumps a divider that stands in front of untouched text', () => {
    // The month is not empty here, so nothing about this edit is a frontier.
    input = bound('12/12/1986', FLEX_DATE)
    typeOver(input, 0, 2, '3')
    expect(withCaret(input)).toBe('3|/12/1986')
  })

  it('leaves plain forward typing exactly as it was', () => {
    input = bound('', FLEX_DATE)
    const seen: string[] = []
    for (const ch of '3/4/1986') {
      type(input, ch)
      seen.push(withCaret(input))
    }
    expect(seen).toEqual([
      '3|', '3/|', '3/4|', '3/4/|', '3/4/1|', '3/4/19|', '3/4/198|', '3/4/1986|',
    ])
  })

  it('leaves the CPF retype flow exactly as it was', () => {
    input = bound('012.153.441-39', CPF)
    typeOver(input, 0, 11, '0')
    const seen = [withCaret(input)]
    for (const ch of '15') {
      type(input, ch)
      seen.push(withCaret(input))
    }
    expect(seen).toEqual(['0|-39', '01|-39', '015.|-39'])
  })
})

// ---------------------------------------------------------------------------
// Backspacing a divider
//
// Peeling a separator off with Backspace is ordinary erosion and stays that
// way — but a divider whose removal would re-segment untouched text is not
// erodible, because there is no value the mask can render that both drops it
// and keeps the fields where they are. With `99/99/9999` holding "13//1986",
// erasing the second "/" leaves "13/1986", which re-reads as 13 / 19 / 86.
// ---------------------------------------------------------------------------

describe('backspacing a divider that pins untouched text', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input.remove()
  })

  /** Backspace once at the current caret. */
  function backspace(target: HTMLInputElement): void {
    const at = target.selectionStart ?? 0
    if (at === 0) return
    target.value = target.value.slice(0, at - 1) + target.value.slice(at)
    target.setSelectionRange(at - 1, at - 1)
    target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }))
  }

  function caretAt(target: HTMLInputElement, at: number): HTMLInputElement {
    target.setSelectionRange(at, at)
    return target
  }

  it('keeps the year together when the empty month\'s divider is erased', () => {
    input = bound('13//1986', DATE)
    backspace(caretAt(input, 3))
    expect(withCaret(input)).toBe('13|//1986')
  })

  it('does the same on a quantified mask', () => {
    input = bound('13//1986', FLEX_DATE)
    backspace(caretAt(input, 3))
    expect(withCaret(input)).toBe('13|//1986')
  })

  it('protects the first divider too', () => {
    // Dropping it would leave "1/2025", which re-reads as 1 / 20 / 25.
    input = bound('1//2025', DATE)
    backspace(caretAt(input, 2))
    expect(withCaret(input)).toBe('1|//2025')
  })

  it('erodes the day instead, when Backspace is held', () => {
    input = bound('13//1986', DATE)
    caretAt(input, 3)
    const seen: string[] = []
    for (let i = 0; i < 3; i++) {
      backspace(input)
      seen.push(withCaret(input))
    }
    expect(seen).toEqual(['13|//1986', '1|//1986', '|//1986'])
  })

  it('still erodes a divider whose removal costs nothing', () => {
    // "-" is distinct, so "4444" is pinned either way and the ") " can go.
    input = bound('(111) -4444', '(999) 999-9999')
    caretAt(input, 6)
    const seen: string[] = []
    for (let i = 0; i < 3; i++) {
      backspace(input)
      seen.push(withCaret(input))
    }
    expect(seen).toEqual(['(111|-4444', '(11|-4444', '(1|-4444'])
  })

  it('still drops an eager divider the user just backspaced', () => {
    input = bound('012.', CPF)
    backspace(caretAt(input, 4))
    expect(withCaret(input)).toBe('012|')
  })

  it('leaves a divider selected mid-way alone, fragment and all', () => {
    // The cut stops inside ") ", stranding the space. That fragment is
    // divider text the mask may absorb — only field data must not move.
    for (const [start, end] of [[4, 5], [5, 6], [4, 6]] as [number, number][]) {
      const field = bound('(111) -4444', '(999) 999-9999')
      field.setSelectionRange(start, end)
      field.value = field.value.slice(0, start) + field.value.slice(end)
      field.setSelectionRange(start, start)
      field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }))
      expect({ start, end, out: `${field.value}@${field.selectionStart}` })
        .toEqual({ start, end, out: '(111-4444@4' })
      field.remove()
    }
    input = bound('', DATE)
  })

  it('drains a full value one character at a time, unchanged', () => {
    input = bound('13/12/1986', DATE)
    caretAt(input, 10)
    const seen: string[] = []
    for (let i = 0; i < 8; i++) {
      backspace(input)
      seen.push(withCaret(input))
    }
    expect(seen).toEqual([
      '13/12/198|', '13/12/19|', '13/12/1|', '13/12|', '13/1|', '13|', '1|', '|',
    ])
  })

  it('forward Delete on the same divider is protected too', () => {
    input = bound('13//1986', DATE)
    input.setSelectionRange(2, 2)
    input.value = '13/1986'
    input.setSelectionRange(2, 2)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentForward' }))
    expect(input.value).toBe('13//1986')
  })

  it('refills the emptied month after the divider survived', () => {
    input = bound('13//1986', DATE)
    backspace(caretAt(input, 3))
    expect(withCaret(input)).toBe('13|//1986')
    input.setSelectionRange(3, 3)
    type(input, '7')
    expect(withCaret(input)).toBe('13/7|/1986')
  })
})
