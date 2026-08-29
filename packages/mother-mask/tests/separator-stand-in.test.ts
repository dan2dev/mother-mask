import { describe, it, expect, afterEach } from 'vitest'
import { applyMask, bind, getMaxLength, process } from '../src/index'
import type { ApplyMaskOptions, BindOptions } from '../src/index'

// ---------------------------------------------------------------------------
// Separator stand-ins.
//
// A bounded-quantifier segment (`9{1,2}`) is the one place a mask cannot work
// out its own boundary: only the user knows whether a one-digit day is
// finished. The separator is how they say so — and a person reaching for
// "this field is done" types whichever divider is under their thumb, not
// necessarily the one the mask happens to print. So any punctuation, symbol,
// or space typed there commits the segment exactly as the mask's own
// separator would, and the mask renders its own separator in its place:
// typing "3.4.1986" into `9{1,2}/9{1,2}/9{4}` gives "3/4/1986".
//
// The rule is deliberately confined to that state. Everywhere else the mask
// owns where its dividers go — a segment that reaches its width reveals the
// next divider by itself (eager) — so a stray separator stays the noise it
// has always been, and masks without a bounded quantifier are untouched.
// ---------------------------------------------------------------------------

const DATE = '9{1,2}/9{1,2}/9{4}'
const FIXED_DATE = '99/99/9999'
const CPF = '999.999.999-99'
const PHONE = '(99) 99999-9999'

/**
 * Divider-shaped characters a person might type instead of the mask's own.
 * Spread across Unicode punctuation (`\p{P}`) and symbols (`\p{S}`), ASCII and
 * not, one code unit and two.
 */
const STAND_INS = [
  '.', '-', ' ', ',', ':', ';', '_', '/', '\\', '|', '*', '#', '+', '=', '?',
  '(', ')', '[', ']', '~', '"', "'", '<', '>', '!', '@', '$', '%', '^', '&',
  '。', '·', '，', '、', '–', '—', '€', '£', '©', '➗', '\u{1F600}',
]

/**
 * Characters that must never close a segment: letters and other scripts (a
 * typo, not a decision), and the whitespace that only ever arrives by paste.
 * Digits are excluded because they are content here — they fill the slot.
 */
const NOT_STAND_INS = ['a', 'Z', 'x', '中', 'あ', '가', 'é', 'ß', '\t', '\n', '\r', '\v']

// ---------------------------------------------------------------------------
// DOM helpers (same shapes as quantifier.test.ts)
// ---------------------------------------------------------------------------

async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
}

function bound(value: string, mask: string | string[], options?: BindOptions): HTMLInputElement {
  const input = document.createElement('input')
  document.body.appendChild(input)
  input.value = value
  bind(input, mask, options ?? null)
  return input
}

/** Type one character over the current selection the way a browser does, then fire `input`. */
function type(input: HTMLInputElement, ch: string): void {
  const start = input.selectionStart ?? 0
  const end = input.selectionEnd ?? start
  input.value = input.value.slice(0, start) + ch + input.value.slice(end)
  input.setSelectionRange(start + ch.length, start + ch.length)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }))
}

function deleteWith(input: HTMLInputElement, inputType: 'deleteContentBackward' | 'deleteContentForward'): void {
  const start = input.selectionStart ?? 0
  const end = input.selectionEnd ?? start
  if (start !== end) {
    input.value = input.value.slice(0, start) + input.value.slice(end)
    input.setSelectionRange(start, start)
  } else if (inputType === 'deleteContentBackward') {
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

/** Render the value with the caret marked, so failures read as what the user would see. */
function withCaret(input: HTMLInputElement): string {
  const c = input.selectionStart ?? 0
  return `${input.value.slice(0, c)}|${input.value.slice(c)}`
}

/** `applyMask` result rendered with the caret marked. */
function masked(value: string, mask: string | string[], caret = value.length, options?: ApplyMaskOptions): string {
  const r = applyMask(value, mask, caret, options)
  return `${r.value.slice(0, r.caret)}|${r.value.slice(r.caret)}`
}

/** Type `keys` into a freshly bound input one character at a time, collecting every intermediate state. */
function typeAll(keys: string[], mask: string | string[], options?: BindOptions): string[] {
  const input = bound('', mask, options)
  try {
    return keys.map((ch) => {
      type(input, ch)
      return withCaret(input)
    })
  } finally {
    input.remove()
  }
}

/** `'3<sep>4<sep>1986'` as a keystroke list, so a two-unit separator stays one keystroke. */
function dateKeys(separator: string): string[] {
  return ['3', separator, '4', separator, '1', '9', '8', '6']
}

// ---------------------------------------------------------------------------
// 1. The core equivalence, through the pure helpers
// ---------------------------------------------------------------------------

describe('a stand-in separator commits a ranged segment like the mask\'s own', () => {
  it('closes a one-digit day and renders the mask\'s separator', () => {
    expect(applyMask('4.', DATE, 2)).toEqual({ value: '4/', caret: 2 })
    expect(applyMask('4.', DATE, 2)).toEqual(applyMask('4/', DATE, 2))
  })

  it.each(STAND_INS)('%o behaves exactly as "/" does', (separator) => {
    const value = `4${separator}`
    expect({ separator, r: applyMask(value, DATE, value.length) })
      .toEqual({ separator, r: applyMask('4/', DATE, 2) })
  })

  it.each(STAND_INS)('%o carries a whole date through, separators and all', (separator) => {
    const value = `3${separator}4${separator}1986`
    expect({ separator, out: process(value, DATE) }).toEqual({ separator, out: '3/4/1986' })
  })

  it('accepts a different stand-in in each position, and mixes them with "/"', () => {
    expect(process('3-4.1986', DATE)).toBe('3/4/1986')
    expect(process('3.4/1986', DATE)).toBe('3/4/1986')
    expect(process('3/4-1986', DATE)).toBe('3/4/1986')
    expect(process('3 4,1986', DATE)).toBe('3/4/1986')
  })

  it('leaves content characters as the noise they have always been', () => {
    for (const ch of NOT_STAND_INS) {
      const value = `4${ch}`
      expect({ ch, r: applyMask(value, DATE, value.length) })
        .toEqual({ ch, r: applyMask('4', DATE, 1) })
    }
    // A digit is not noise at all — it is the day's second character.
    expect(applyMask('45', DATE, 2)).toEqual({ value: '45/', caret: 3 })
  })

  it('does not let a stand-in stop a segment short of its minimum', () => {
    // `9{4}` has no range to close, so nothing before the fourth digit commits it.
    expect(process('3/4/19.86', DATE)).toBe('3/4/1986')
    expect(process('3/4/1.986', DATE)).toBe('3/4/1986')
  })

  it('drops overflow past the last segment, exactly as "/" does', () => {
    expect(applyMask('3.4.19867', DATE, 9)).toEqual(applyMask('3/4/19867', DATE, 9))
    expect(process('3.4.19867', DATE)).toBe('3/4/1986')
  })

  it('keeps the committed boundary with { eager: false }', () => {
    // The boundary is the user's own input, not a reveal, so eager has no say.
    expect(applyMask('4.', DATE, 2, { eager: false })).toEqual({ value: '4/', caret: 2 })
    expect(applyMask('3.4.', DATE, 4, { eager: false })).toEqual({ value: '3/4/', caret: 4 })
    expect(process('3.4.1986', DATE, { eager: false })).toBe('3/4/1986')
  })

  it('is absorbed by a separator that is already standing there', () => {
    // "3/" then "." — the divider exists, so the keystroke has nothing to add.
    expect(applyMask('3/.', DATE, 3)).toEqual({ value: '3/', caret: 2 })
    expect(applyMask('3/.', DATE, 3)).toEqual(applyMask('3//', DATE, 3))
  })

  it('holds the caret still when the stand-in lands mid-value', () => {
    expect(masked('3.4/1986', DATE, 2)).toBe('3/|4/1986')
    expect(applyMask('1.2/12/1986', DATE, 2)).toEqual(applyMask('1/2/12/1986', DATE, 2))
  })
})

// ---------------------------------------------------------------------------
// 2. Separators the mask spells with more than one character, or oddly
// ---------------------------------------------------------------------------

describe('the mask prints its own divider, whatever shape that is', () => {
  it('emits a multi-character divider in full', () => {
    const paren = '(9{1,2}) 9{1,3}'
    expect(applyMask('(1.', paren, 3)).toEqual({ value: '(1) ', caret: 4 })
    expect(applyMask('(1.', paren, 3)).toEqual(applyMask('(1) ', paren, 4))
    expect(process('(1.2', paren)).toBe('(1) 2')
    // The opening frame is restored around a value that never had it.
    expect(process('1.2', paren)).toBe('(1) 2')
  })

  it('emits a non-ASCII divider', () => {
    const emDash = '9{1,2}—9{1,2}'
    expect(applyMask('3.', emDash, 2)).toEqual({ value: '3—', caret: 2 })
    expect(applyMask('3.', emDash, 2)).toEqual(applyMask('3—', emDash, 2))
    expect(process('3.4', emDash)).toBe('3—4')
  })

  it('emits an escaped token used as a divider', () => {
    // `\9` is the literal character "9", not a digit slot.
    const escaped = '9{1,2}\\99{1,4}'
    expect(getMaxLength(escaped)).toBe(7)
    expect(applyMask('3.', escaped, 2)).toEqual({ value: '39', caret: 2 })
    expect(applyMask('3.', escaped, 2)).toEqual(applyMask('39', escaped, 2))
    expect(process('3.4', escaped)).toBe('394')
  })

  it('matches the mask\'s own divider even where that divider reads as data', () => {
    // `A{1,4}` accepts digits, so the escaped "9" dividing it from `Z{1,2}`
    // is a character the run before it could equally have held. The engine
    // resolves that ambiguity however it resolves it — the point here is only
    // that a stand-in lands wherever the mask's own divider lands, so the
    // rule adds no reading of its own to an already ambiguous mask.
    const ambiguous = 'A{1,4}\\9Z{1,2}'
    for (const [standIn, own] of [['9/a', '99a'], ['1.a', '19a'], ['9/15*1', '9915*1']] as const) {
      for (const eager of [true, false]) {
        expect({ standIn, eager, r: applyMask(standIn, ambiguous, standIn.length, { eager }) })
          .toEqual({ standIn, eager, r: applyMask(own, ambiguous, own.length, { eager }) })
      }
    }
  })

  it('consumes a stand-in that is a surrogate pair as one character', () => {
    expect(applyMask('3\u{1F600}', DATE, 3)).toEqual({ value: '3/', caret: 2 })
    expect(process('3\u{1F600}4\u{1F600}1986', DATE)).toBe('3/4/1986')
  })
})

// ---------------------------------------------------------------------------
// 3. Where the rule deliberately does not reach
// ---------------------------------------------------------------------------

describe('a stand-in only speaks where the width is the user\'s to choose', () => {
  it('changes nothing about a mask with no bounded quantifier', () => {
    // A fixed run's minimum *is* its maximum, so it is never in the state a
    // divider could resolve — the stray character stays noise, and the mask's
    // own separator is dropped there too.
    for (const [mask, value] of [
      [FIXED_DATE, '4'], [FIXED_DATE, '1'], [CPF, '01'], [PHONE, '1'],
    ] as const) {
      for (const separator of ['.', '-', ' ', '*']) {
        expect({ mask, value, separator, r: applyMask(value + separator, mask, value.length + 1) })
          .toEqual({ mask, value, separator, r: applyMask(value, mask, value.length) })
      }
    }
    expect(applyMask('4.', FIXED_DATE, 2)).toEqual({ value: '4', caret: 1 })
    expect(applyMask('4/', FIXED_DATE, 2)).toEqual({ value: '4', caret: 1 })
  })

  it('leaves the documented fixed-mask readings byte-for-byte alone', () => {
    expect(applyMask('015-3956', CPF, 3).value).toBe('015.395.6')
    expect(applyMask('5(11) 999', PHONE, 1, { eager: false }).value).toBe('(51) 1999')
    expect(applyMask('(512) 3', PHONE, 2, { eager: false }).value).toBe('(51) 23')
    expect(process('  3 / 4 / 1986 ', DATE)).toBe('3/4/1986')
  })

  it('is noise on a segment the user has not started typing in', () => {
    // Nothing to close: "12/" already ends the day, and the month is empty.
    expect(applyMask('12.', DATE, 3)).toEqual({ value: '12/', caret: 3 })
    expect(applyMask('12..', DATE, 4)).toEqual({ value: '12/', caret: 3 })
    expect(applyMask('3..', DATE, 3)).toEqual({ value: '3/', caret: 2 })
  })

  it('is noise in the last segment, which has no divider after it', () => {
    const tail = '9{2}/9{1,4}'
    expect(applyMask('12/3.', tail, 5)).toEqual({ value: '12/3', caret: 4 })
    expect(applyMask('12/3.', tail, 5)).toEqual(applyMask('12/3/', tail, 5))
    expect(process('12/3.4', tail)).toBe('12/34')
    // A mask that is one ranged run and nothing else has no divider at all.
    expect(process('1.', '9{1,4}')).toBe('1')
    expect(process('1.2', '9{1,4}')).toBe('12')
  })

  it('does not apply in flat mode, where the mask is one continuous stream', () => {
    for (const value of ['4.', '3.4.1986', '4/', '3/4/1986']) {
      expect({ value, r: applyMask(value, DATE, value.length, { segmented: false }) })
        .toEqual({ value, r: applyMask(value.replace(/[./]/g, ''), DATE, value.replace(/[./]/g, '').length, { segmented: false }) })
    }
  })

  it('does not apply under a resolver, which reflows a stripped stream', () => {
    const options = { resolveMask: () => DATE }
    for (const [dotted, slashed] of [['4.', '4/'], ['3.4.1986', '3/4/1986']] as const) {
      expect({ dotted, r: applyMask(dotted, '9{1,8}', dotted.length, options) })
        .toEqual({ dotted, r: applyMask(slashed, '9{1,8}', slashed.length, options) })
    }
  })
})

// ---------------------------------------------------------------------------
// 4. The mask's own alphabet always wins
// ---------------------------------------------------------------------------

describe('a character the mask can hold is content, never a boundary', () => {
  const tokens = { D: /[0-9.]/ }
  const mask = 'D{1,2}/9{1,2}/9{4}'

  it('a custom token matching "." makes "." data in that mask', () => {
    expect(applyMask('1.', mask, 2, { tokens })).toEqual({ value: '1./', caret: 3 })
    expect(process('1.2/1986', mask, { tokens })).toBe('1./2/1986')
  })

  it('other punctuation still stands in there', () => {
    expect(applyMask('1-', mask, 2, { tokens })).toEqual({ value: '1/', caret: 2 })
    expect(applyMask('1-', mask, 2, { tokens })).toEqual(applyMask('1/', mask, 2, { tokens }))
  })

  it('letters are content for a letter run and never close it', () => {
    expect(process('ab.12', 'Z{1,3}-9{1,2}')).toBe('ab-12')
    expect(process('abc12', 'Z{1,3}-9{1,2}')).toBe('abc-12')
    // "c" is a letter the run can still hold, so it fills the third slot
    // instead of being read as a boundary.
    expect(process('ab-c12', 'Z{1,3}-9{1,2}')).toBe('ab-12')
  })
})

// ---------------------------------------------------------------------------
// 5. bind() — typing
// ---------------------------------------------------------------------------

describe('bind() — typing a date with a stand-in separator', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input?.remove()
  })

  it.each(['.', '-', ' ', ',', ':', '*', '\u{1F600}'])(
    'types "3%s4%s1986" to the same states "/" reaches',
    (separator) => {
      expect({ separator, seen: typeAll(dateKeys(separator), DATE) })
        .toEqual({ separator, seen: typeAll(dateKeys('/'), DATE) })
    },
  )

  it('shows the mask\'s separator the instant the stand-in is typed', () => {
    expect(typeAll(dateKeys('.'), DATE)).toEqual([
      '3|', '3/|', '3/4|', '3/4/|', '3/4/1|', '3/4/19|', '3/4/198|', '3/4/1986|',
    ])
  })

  it('absorbs a stand-in typed right after an eager separator', () => {
    expect(typeAll(['1', '2', '.', '4', '.', '1', '9', '8', '6'], DATE)).toEqual([
      '1|', '12/|', '12/|', '12/4|', '12/4/|', '12/4/1|', '12/4/19|', '12/4/198|', '12/4/1986|',
    ])
  })

  it('absorbs a repeated stand-in instead of emptying a segment', () => {
    expect(typeAll(['3', '.', '.', '4'], DATE)).toEqual(['3|', '3/|', '3/|', '3/4|'])
    expect(typeAll(['3', '.', '/', '4'], DATE)).toEqual(['3|', '3/|', '3/|', '3/4|'])
  })

  it('ignores letters typed between the digits and the stand-in', () => {
    expect(typeAll(['3', 'a', '.', '4'], DATE)).toEqual(['3|', '3|', '3/|', '3/4|'])
  })

  it('honours { eager: false }', () => {
    expect(typeAll(dateKeys('.'), DATE, { eager: false }))
      .toEqual(typeAll(dateKeys('/'), DATE, { eager: false }))
  })

  it('reaches the same value through the keydown/rAF fallback path', async () => {
    input = bound('', DATE)
    let v = ''
    for (const ch of '3.4.1986') {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }))
      v += ch
      input.value = v
      input.setSelectionRange(v.length, v.length)
    }
    await flushRafs()
    expect(withCaret(input)).toBe('3/4/1986|')
  })

  it('formats a pasted value with stand-in separators', async () => {
    input = bound('', DATE)
    input.value = '3.4.1986'
    input.setSelectionRange(8, 8)
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    await flushRafs()
    expect(withCaret(input)).toBe('3/4/1986|')
  })

  it('reports the committed value through onChange', () => {
    const seen: string[] = []
    input = bound('', DATE, { onChange: (value) => seen.push(value) })
    type(input, '4')
    type(input, '.')
    expect(seen).toEqual(['4', '4/'])
  })

  it('refuses a stand-in once the mask is full', () => {
    input = bound('', DATE)
    for (const ch of '12/12/1986') type(input, ch)
    expect(withCaret(input)).toBe('12/12/1986|')
    type(input, '.')
    expect(withCaret(input)).toBe('12/12/1986|')
  })
})

// ---------------------------------------------------------------------------
// 6. bind() — editing
// ---------------------------------------------------------------------------

describe('bind() — editing around a stand-in separator', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input?.remove()
  })

  it('backspaces the committed separator away without resurrecting it', () => {
    input = bound('', DATE)
    type(input, '4')
    type(input, '.')
    expect(withCaret(input)).toBe('4/|')
    deleteWith(input, 'deleteContentBackward')
    expect(withCaret(input)).toBe('4|')
    deleteWith(input, 'deleteContentBackward')
    expect(withCaret(input)).toBe('|')
  })

  it('commits a segment the user just retyped', () => {
    input = bound('12/12/1986', DATE)
    input.setSelectionRange(0, 2)
    type(input, '3')
    expect(withCaret(input)).toBe('3|/12/1986')
    type(input, '.')
    expect(withCaret(input)).toBe('3/|12/1986')
  })

  it('leaves an untouched value alone when the stand-in has nothing to close', () => {
    input = bound('3/12/1986', DATE)
    input.setSelectionRange(1, 1)
    type(input, '.')
    expect(withCaret(input)).toBe('3/|12/1986')
  })

  it('splits a two-digit day when the caret sits inside it', () => {
    input = bound('12/12/1986', DATE)
    input.setSelectionRange(1, 1)
    type(input, '.')
    const dotted = withCaret(input)
    input.remove()

    input = bound('12/12/1986', DATE)
    input.setSelectionRange(1, 1)
    type(input, '/')
    expect(dotted).toBe(withCaret(input))
    expect(dotted).toBe('1/|2/1219')
  })

  it('renders the same value as "/" when typed over a multi-field selection', () => {
    // Outside the committable state the stand-in is noise, so the caret can
    // land one position earlier than the mask's own separator would put it —
    // in the emptied day rather than past it. The value is identical.
    for (const [start, end] of [[0, 3], [0, 2], [0, 8]] as const) {
      input = bound('3/4/1986', DATE)
      input.setSelectionRange(start, end)
      type(input, '.')
      const dotted = input.value
      input.remove()

      input = bound('3/4/1986', DATE)
      input.setSelectionRange(start, end)
      type(input, '/')
      expect({ start, end, dotted }).toEqual({ start, end, dotted: input.value })
    }
  })
})

// ---------------------------------------------------------------------------
// 7. Invariants
// ---------------------------------------------------------------------------

describe('stand-ins keep the engine\'s invariants', () => {
  // Bounded-quantifier masks only — the whole surface a stand-in can reach.
  // Fixed masks are covered by the fuzz suites in select-replace-dividers and
  // divider-edge-cases, and are inert here by construction: a fixed run's
  // minimum is its maximum, so it is never in the state that reads a stand-in.
  const masks = [
    DATE, '9{1,2}:9{2}', 'Z{1,3}-9{1,4}', '(9{1,2}) 9{1,3}',
    '9{1,3}.9{1,3}.9{1,3}', '9{2}/9{1,4}', '9{1,2}—9{1,2}', '9{1,2}\\99{1,4}',
  ]
  const alphabet = Array.from('0123456789ab./-, ()#*—:;_|')

  /** Deterministic LCG, so a failure is always reproducible from the seed. */
  function generate(seed: number): { value: string; mask: string; caret: number; eager: boolean } {
    let state = seed
    const next = (): number => (state = (state * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
    const length = 1 + Math.floor(next() * 12)
    let value = ''
    for (let i = 0; i < length; i++) value += alphabet[Math.floor(next() * alphabet.length)]
    return {
      value,
      mask: masks[Math.floor(next() * masks.length)],
      caret: Math.floor(next() * (value.length + 1)),
      eager: next() < 0.5,
    }
  }

  it('re-masking a render at its own caret stays a no-op', () => {
    for (let seed = 1; seed <= 20000; seed++) {
      const { value, mask, caret, eager } = generate(seed)
      const first = applyMask(value, mask, caret, { eager })
      const second = applyMask(first.value, mask, first.caret, { eager })
      expect({ seed, mask, value, caret, eager, out: second.value, at: second.caret })
        .toEqual({ seed, mask, value, caret, eager, out: first.value, at: first.caret })
    }
  })

  it('never renders past the mask\'s own maximum length, and keeps the caret inside', () => {
    for (let seed = 1; seed <= 20000; seed++) {
      const { value, mask, caret, eager } = generate(seed)
      const r = applyMask(value, mask, caret, { eager })
      expect(r.value.length).toBeLessThanOrEqual(getMaxLength(mask))
      expect(r.caret).toBeGreaterThanOrEqual(0)
      expect(r.caret).toBeLessThanOrEqual(r.value.length)
    }
  })

  it('a value of nothing but stand-ins renders as empty', () => {
    for (const value of ['.', '..', '...', '. . .', '-.-', '/', '//']) {
      expect({ value, out: process(value, DATE) }).toEqual({ value, out: '' })
    }
  })
})
