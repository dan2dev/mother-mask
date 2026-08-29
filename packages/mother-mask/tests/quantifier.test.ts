import { describe, it, expect, afterEach } from 'vitest'
import { applyMask, bind, buildMask, getMaxLength, Mask, process } from '../src/index'
import type { ApplyMaskOptions } from '../src/index'
import { PatternCompiler } from '../src/pattern'

// ---------------------------------------------------------------------------
// Bounded quantifiers: `9{4}` (exactly four) and `9{1,2}` (one or two).
//
// The motivating shape is a date whose day and month may be written with one
// or two digits — "3/4/1986" as readily as "12/12/1986" — without the user
// having to pad anything. The separator is what disambiguates: typing it once
// the segment has reached its *minimum* commits that segment, while reaching
// its *maximum* completes it the ordinary (eager) way. Nothing here knows what
// a day or a month is; this is a width rule, not a calendar.
// ---------------------------------------------------------------------------

const DATE = '9{1,2}/9{1,2}/9{4}'
const FIXED_DATE = '99/99/9999'

// ---------------------------------------------------------------------------
// DOM helpers (same shapes as segment-anchoring.test.ts)
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
 * The value is set *before* binding so the binder's own baseline matches what
 * is on screen — that baseline is what tells a later deletion how much text
 * disappeared, which the swallowed-separator rescue needs.
 */
function bound(value: string, mask: string | string[], options?: ApplyMaskOptions): HTMLInputElement {
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

/** Apply a deletion the way a browser does (collapsed caret or selection), then fire `input`. */
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

// ---------------------------------------------------------------------------
// 1. Parser / compiler
// ---------------------------------------------------------------------------

describe('quantifier grammar', () => {
  it('{n} repeats a token exactly n times', () => {
    expect(process('1986', '9{4}')).toBe('1986')
    expect(process('19867', '9{4}')).toBe('1986')
    expect(getMaxLength('9{4}')).toBe(4)
  })

  it('{n} is indistinguishable from writing the token n times', () => {
    const pairs: [string, string][] = [
      ['9{2}/9{2}/9{4}', FIXED_DATE],
      ['Z{3}-9{4}', 'ZZZ-9999'],
      ['9{3}.9{3}.9{3}-9{2}', '999.999.999-99'],
    ]
    const values = ['1', '12', '123', '12/', '1/2', 'ab', 'abc1', 'abc-1', '25/12/2025', '25//2025', '1//2025', '12345678901']
    for (const [quantified, spelled] of pairs) {
      expect(getMaxLength(quantified)).toBe(getMaxLength(spelled))
      for (const value of values) {
        for (const eager of [true, false]) {
          expect({ quantified, value, eager, r: applyMask(value, quantified, value.length, { eager }) })
            .toEqual({ quantified, value, eager, r: applyMask(value, spelled, value.length, { eager }) })
        }
      }
    }
  })

  it('{min,max} accepts anywhere from min to max characters', () => {
    expect(process('1', '9{1,3}')).toBe('1')
    expect(process('12', '9{1,3}')).toBe('12')
    expect(process('123', '9{1,3}')).toBe('123')
    expect(process('1234', '9{1,3}')).toBe('123')
    expect(getMaxLength('9{1,3}')).toBe(3)
  })

  it('a quantifier after one token of a longer run only extends that token', () => {
    // "99{1,2}" is two-to-three digits: one fixed slot plus one-or-two more.
    expect(process('1', '99{1,2}')).toBe('1')
    expect(process('123', '99{1,2}')).toBe('123')
    expect(process('1234', '99{1,2}')).toBe('123')
    expect(getMaxLength('99{1,2}')).toBe(3)
  })

  it('leaves unsupported and malformed brace sequences as literal text', () => {
    // None of these are quantifiers, so the braces stay exactly what a mask
    // written before this syntax existed would have made of them.
    for (const mask of ['9{1,}', '9{,2}', '9{}', '9{0}', '9{0,2}', '9{2,1}', '9{a}', '9{ 1,2}', '9{1,2', '9{']) {
      expect({ mask, out: process('12', mask) }).toEqual({ mask, out: `1${mask.slice(1)}` })
      expect({ mask, max: getMaxLength(mask) }).toEqual({ mask, max: mask.length })
    }
  })

  it('does not implement *, + or ?', () => {
    expect(process('12', '9*')).toBe('1*')
    expect(process('12', '9+')).toBe('1+')
    expect(process('12', '9?')).toBe('1?')
  })

  it('treats a repeat count above the compiler cap as literal text', () => {
    expect(getMaxLength('9{1000}')).toBe(1000)
    expect(getMaxLength('9{1001}')).toBe('9{1001}'.length)
    expect(process('1', '9{1001}')).toBe('1{1001}')
  })

  it('parses each pattern once and serves the compiled plan from cache', () => {
    // The hot input path re-formats on every keystroke; the brace syntax must
    // not be re-scanned each time.
    const compiler = new PatternCompiler()
    const first = compiler.compile(DATE)
    expect(compiler.compile(DATE)).toBe(first)
    expect(first.runChars.map((run) => run.length)).toEqual([2, 2, 4])
    expect(first.runMin).toEqual([1, 1, 4])
    expect(first.totalSlots).toBe(8)
    expect(first.maxLength).toBe(10)

    // An unquantified pattern has min === max for every run, which is what
    // makes "committed early" unreachable for it.
    const fixed = compiler.compile(FIXED_DATE)
    expect(fixed.runMin).toEqual(fixed.runChars.map((run) => run.length))
  })

  it('only reads a quantifier directly after a slot token', () => {
    // Braces with no token in front of them are ordinary literals.
    expect(process('12', '{1,2}')).toBe('{1,2}')
    expect(getMaxLength('{1,2}')).toBe(5)
    // A second brace group is not applied to the already-quantified slot.
    expect(process('12', '9{1,2}{1,2}')).toBe('12{1,2}')
    // Nor to a literal separator.
    expect(process('12', '9-{1,2}9')).toBe('1-{1,2}2')
  })
})

// ---------------------------------------------------------------------------
// 2. Escaping
// ---------------------------------------------------------------------------

describe('quantifiers and escaped tokens', () => {
  it('an escaped token stays a literal and never picks up a quantifier', () => {
    expect(process('12', '\\9{1,2}')).toBe('9{1,2}')
    expect(getMaxLength('\\9{1,2}')).toBe(6)
    expect(process('ab12', '\\A{1,2}Z{1,2}9{1,2}')).toBe('A{1,2}ab12')
    expect(getMaxLength('\\A{1,2}Z{1,2}9{1,2}')).toBe(10)
  })

  it('escaped literals keep working alongside quantified slots', () => {
    expect(process('12', '\\9-9{1,2}')).toBe('9-12')
    expect(process('12', '\\Z-9{1,2}')).toBe('Z-12')
    expect(process('12', '\\\\9{1,2}')).toBe('\\12')
    expect(getMaxLength('\\\\9{1,2}')).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// 3. getMaxLength and mask arrays
// ---------------------------------------------------------------------------

describe('quantified capacity', () => {
  it('getMaxLength counts compiled maximums, not the pattern source length', () => {
    expect(getMaxLength(DATE)).toBe(10)
    expect(DATE.length).toBe(18)
    expect(getMaxLength(DATE)).toBe(getMaxLength(FIXED_DATE))
    expect(getMaxLength('Z{2,4}-9{1,3}')).toBe(8)
    expect(getMaxLength('A{1,8}')).toBe(8)
  })

  it('reserves two UTF-16 units per custom-token slot, times the repeat count', () => {
    const tokens = { L: /\p{L}/u }
    expect(getMaxLength('L{1,2}-L{1,2}', { tokens })).toBe(9)
    expect(getMaxLength('L{3}', { tokens })).toBe(6)
  })

  it('bind sizes maxlength from the compiled maximum', () => {
    const input = bound('', DATE)
    expect(input.getAttribute('maxlength')).toBe('10')
    input.remove()
  })

  it('mask arrays select by compiled slot capacity, not pattern text', () => {
    const masks = ['9{1,2}-9{1,2}', '9{1,2}-9{1,2}-9{4}']
    expect(process('12', masks)).toBe('12-')
    expect(process('1234', masks)).toBe('12-34')
    expect(process('12345678', masks)).toBe('12-34-5678')
    expect(getMaxLength(masks)).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// 4. Pure helpers
// ---------------------------------------------------------------------------

describe('quantified dates through the pure helpers', () => {
  const cases = ['3/4/1986', '3/12/1986', '12/4/1986', '12/12/1986']

  for (const value of cases) {
    it(`process("${value}") is unchanged`, () => {
      expect(process(value, DATE)).toBe(value)
    })
  }

  it('applyMask keeps the caret at the end of a complete value', () => {
    for (const value of cases) {
      expect(applyMask(value, DATE, value.length)).toEqual({ value, caret: value.length })
    }
  })

  it('buildMask / new Mask agree with applyMask', () => {
    const m = buildMask('3/4/1986', DATE, 8)
    expect(m.process()).toBe('3/4/1986')
    expect(m.caret).toBe(applyMask('3/4/1986', DATE, 8).caret)

    const low = new Mask('12/4/1986', DATE, 9)
    expect(low.process()).toBe('12/4/1986')
    expect(low.caret).toBe(9)
  })

  it('skips noise without letting it move a committed boundary', () => {
    expect(process('  3 / 4 / 1986 ', DATE)).toBe('3/4/1986')
    // Letters are data for the fallback alphabet, so they eat into the
    // capacity a separator would otherwise need — but a boundary the user
    // typed still outranks that count, so the fields stay put.
    expect(process('3a/4b/1986c', DATE)).toBe('3/4/1986')
    // Noise with no separator to anchor to is simply skipped, and the run
    // keeps filling to its maximum.
    expect(applyMask('3x4', DATE, 3)).toEqual({ value: '34/', caret: 3 })
    expect(process('', DATE)).toBe('')
    expect(process('abc', DATE)).toBe('')
  })
})

// ---------------------------------------------------------------------------
// 5. Built-in and custom tokens
// ---------------------------------------------------------------------------

describe('quantifiers use the ordinary token definitions', () => {
  it('built-in 9', () => {
    expect(process('12-345', '9{1,2}-9{1,3}')).toBe('12-345')
    expect(process('1-2', '9{1,2}-9{1,3}')).toBe('1-2')
  })

  it('built-in Z rejects digits exactly as it does unquantified', () => {
    expect(process('ab-12', 'Z{2,4}-9{1,3}')).toBe('ab-12')
    expect(process('abcd-12', 'Z{2,4}-9{1,3}')).toBe('abcd-12')
    expect(process('a1b', 'Z{1,3}')).toBe('ab')
  })

  it('built-in A takes letters and digits', () => {
    expect(process('a1b2c3', 'A{1,8}')).toBe('a1b2c3')
    expect(process('a1-99', 'A{1,4}-9{2}')).toBe('a1-99')
  })

  it('a custom token and its transform run once per accepted character', () => {
    const calls: string[] = []
    const options: ApplyMaskOptions = {
      tokens: {
        U: {
          match: /[a-z]/i,
          transform: (char) => {
            calls.push(char)
            return char.toUpperCase()
          },
        },
      },
    }
    expect(process('ab-123', 'U{1,2}-9{1,3}', options)).toBe('AB-123')
    expect(calls).toEqual(['a', 'b'])
  })

  it('a custom token overriding a built-in applies to its quantified run', () => {
    const options: ApplyMaskOptions = { tokens: { '9': /[0-8]/ } }
    expect(process('129', '9{1,3}', options)).toBe('12')
  })

  it('matches by code point, so supplementary characters fill one slot each', () => {
    const options: ApplyMaskOptions = { tokens: { L: /\p{L}/u } }
    expect(process('𐐀λ-ñ', 'L{1,2}-L{1,2}', options)).toBe('𐐀λ-ñ')
    // Caret offsets stay UTF-16: "𐐀" is a surrogate pair.
    expect(applyMask('𐐀λ', 'L{1,2}-L{1,2}', 3, options)).toEqual({ value: '𐐀λ-', caret: 4 })
  })
})

// ---------------------------------------------------------------------------
// 6. The separator rule: commit at min, reveal at max
// ---------------------------------------------------------------------------

describe('a typed separator commits a ranged segment once its minimum is met', () => {
  it('keeps the separator the user typed after a single digit', () => {
    expect(applyMask('3/', DATE, 2)).toEqual({ value: '3/', caret: 2 })
    expect(applyMask('3/4/', DATE, 4)).toEqual({ value: '3/4/', caret: 4 })
  })

  it('does not invent the separator merely because the minimum was reached', () => {
    expect(applyMask('3', DATE, 1)).toEqual({ value: '3', caret: 1 })
    expect(applyMask('3/4', DATE, 3)).toEqual({ value: '3/4', caret: 3 })
  })

  it('reveals the separator on its own once the maximum is reached (eager)', () => {
    expect(applyMask('1', DATE, 1)).toEqual({ value: '1', caret: 1 })
    expect(applyMask('12', DATE, 2)).toEqual({ value: '12/', caret: 3 })
  })

  it('holds the separator back at the maximum with { eager: false }', () => {
    expect(applyMask('12', DATE, 2, { eager: false })).toEqual({ value: '12', caret: 2 })
  })

  it('keeps an explicitly typed separator with { eager: false } too', () => {
    // It is the user's own input, not a reveal, so eager has no say in it.
    expect(applyMask('3/', DATE, 2, { eager: false })).toEqual({ value: '3/', caret: 2 })
    expect(applyMask('3/4/', DATE, 4, { eager: false })).toEqual({ value: '3/4/', caret: 4 })
  })

  it('works the same for letter and alphanumeric runs', () => {
    expect(applyMask('ab-', 'Z{2,4}-9{1,3}', 3, { eager: false })).toEqual({ value: 'ab-', caret: 3 })
    expect(applyMask('abcd', 'Z{2,4}-9{1,3}', 4)).toEqual({ value: 'abcd-', caret: 5 })
    expect(applyMask('a1-', 'A{1,8}-9{2}', 3, { eager: false })).toEqual({ value: 'a1-', caret: 3 })
  })

  it('a fixed run is never "committed early" — its minimum is its maximum', () => {
    expect(applyMask('3/', FIXED_DATE, 2)).toEqual({ value: '3', caret: 1 })
    expect(applyMask('3/', FIXED_DATE, 2, { eager: false })).toEqual({ value: '3', caret: 1 })
    expect(applyMask('25/', FIXED_DATE, 3, { eager: false })).toEqual({ value: '25', caret: 2 })
  })
})

// ---------------------------------------------------------------------------
// 7. Caret positions
// ---------------------------------------------------------------------------

describe('caret positions while filling a quantified date', () => {
  it('one-digit day and month, keystroke by keystroke', () => {
    const steps = ['3', '3/', '3/4', '3/4/', '3/4/1', '3/4/19', '3/4/198', '3/4/1986']
    expect(steps.map((v) => masked(v, DATE))).toEqual([
      '3|', '3/|', '3/4|', '3/4/|', '3/4/1|', '3/4/19|', '3/4/198|', '3/4/1986|',
    ])
  })

  it('two-digit day and month, keystroke by keystroke', () => {
    const steps = ['1', '12', '12/1', '12/12', '12/12/1', '12/12/19', '12/12/198', '12/12/1986']
    expect(steps.map((v) => masked(v, DATE))).toEqual([
      '1|', '12/|', '12/1|', '12/12/|', '12/12/1|', '12/12/19|', '12/12/198|', '12/12/1986|',
    ])
  })

  it('mixed widths', () => {
    expect(masked('3/12/1986', DATE)).toBe('3/12/1986|')
    expect(masked('12/4/1986', DATE)).toBe('12/4/1986|')
  })

  it('editing a segment leaves the caret in it, not in a neighbour', () => {
    // "12/12/1986": select the day and type "3".
    expect(masked('3/12/1986', DATE, 1)).toBe('3|/12/1986')
    // ... select the month and type "4".
    expect(masked('12/4/1986', DATE, 4)).toBe('12/4|/1986')
  })

  it('stops before a separator that anchors text the user has not reached', () => {
    expect(masked('3//1986', DATE, 2)).toBe('3/|/1986')
    expect(masked('12//1986', DATE, 3)).toBe('12/|/1986')
  })

  it('caret stays inside [0, value.length] for partial and littered values', () => {
    for (const value of ['', '3', '3/', '3//', '///', '3x/', 'a3/4/1986z', '3/4/1986/1/2']) {
      for (const caret of [0, 1, value.length, value.length + 5]) {
        const r = applyMask(value, DATE, caret)
        expect(r.caret).toBeGreaterThanOrEqual(0)
        expect(r.caret).toBeLessThanOrEqual(r.value.length)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// 8. Round-trip stability
// ---------------------------------------------------------------------------

describe('quantified masks are a fixed point of themselves', () => {
  const values = [
    '3/4/1986', '3/12/1986', '12/4/1986', '12/12/1986',
    '3//1986', '12//1986', '3/', '3/4/', '12/', '3/4', '12/12/',
  ]

  for (const value of values) {
    it(`${DATE} — "${value}"`, () => {
      const once = applyMask(value, DATE, value.length)
      expect(once.value).toBe(value)
      const twice = applyMask(once.value, DATE, once.caret)
      expect(twice.value).toBe(value)
    })
  }

  it('reaches a fixed point in one pass for values it has to rewrite', () => {
    for (const value of ['3//', '//', '/', '///', '3x4', '3a/4b/1986c', '3/4/1986/7']) {
      for (const eager of [true, false]) {
        const once = applyMask(value, DATE, value.length, { eager })
        const twice = applyMask(once.value, DATE, once.caret, { eager })
        expect({ value, eager, out: twice.value }).toEqual({ value, eager, out: once.value })
      }
    }
  })

  it('is a fixed point for randomly generated values', () => {
    const masks = [
      DATE, '9{1,3}.9{1,2}-Z{1,2}', 'A{1,4}:9{2}', '9{1,2}::9{1,2}', 'Z{2,4}-9{1,3}',
      '(9{1,2}) 9{3,5}-9{4}', '9{1,4}', '9{2}:9{2}', 'Z{1,2}9{1,2}Z{1,2}', 'A{1,3}-A{1,3}',
    ]
    const alphabet = '0123456789AByz./-: (){},'
    let seed = 20260829
    const rnd = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }

    for (let i = 0; i < 20000; i++) {
      const mask = masks[Math.floor(rnd() * masks.length)]
      let value = ''
      const len = Math.floor(rnd() * 18)
      for (let j = 0; j < len; j++) value += alphabet[Math.floor(rnd() * alphabet.length)]
      const caret = Math.floor(rnd() * (value.length + 1))
      const eager = rnd() < 0.5
      const segmented = rnd() < 0.85

      const first = applyMask(value, mask, caret, { eager, segmented })
      const second = applyMask(first.value, mask, first.caret, { eager, segmented })
      expect({ mask, value, caret, eager, segmented, out: second.value }).toEqual({
        mask, value, caret, eager, segmented, out: first.value,
      })
      expect(first.caret).toBeLessThanOrEqual(first.value.length)
      expect(first.value.length).toBeLessThanOrEqual(getMaxLength(mask))
    }
  })
})

// ---------------------------------------------------------------------------
// 9. bind()
// ---------------------------------------------------------------------------

describe('bind() — typing a quantified date', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input.remove()
  })

  it('types "3/4/1986" one keystroke at a time, caret included', () => {
    input = bound('', DATE)
    const seen: string[] = []
    for (const ch of '3/4/1986') {
      type(input, ch)
      seen.push(withCaret(input))
    }
    expect(seen).toEqual([
      '3|', '3/|', '3/4|', '3/4/|', '3/4/1|', '3/4/19|', '3/4/198|', '3/4/1986|',
    ])
  })

  it('types "3/12/1986" — the month reaches its maximum and reveals the separator', () => {
    input = bound('', DATE)
    const seen: string[] = []
    for (const ch of '3/12/1986') {
      type(input, ch)
      seen.push(withCaret(input))
    }
    expect(seen).toEqual([
      '3|', '3/|', '3/1|', '3/12/|', '3/12/|', '3/12/1|', '3/12/19|', '3/12/198|', '3/12/1986|',
    ])
  })

  it('types "12/4/1986" — the eager separator absorbs the one the user then types', () => {
    input = bound('', DATE)
    const seen: string[] = []
    for (const ch of '12/4/1986') {
      type(input, ch)
      seen.push(withCaret(input))
    }
    expect(seen).toEqual([
      '1|', '12/|', '12/|', '12/4|', '12/4/|', '12/4/1|', '12/4/19|', '12/4/198|', '12/4/1986|',
    ])
  })

  it('fills every segment from eight bare digits, no separators typed', () => {
    input = bound('', DATE)
    for (const ch of '12121986') type(input, ch)
    expect(withCaret(input)).toBe('12/12/1986|')
  })

  it('reaches the same value through the keydown/rAF fallback path', async () => {
    input = bound('', DATE)
    let v = ''
    for (const ch of '3/4/1986') {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }))
      v += ch
      input.value = v
      input.setSelectionRange(v.length, v.length)
    }
    await flushRafs()
    expect(withCaret(input)).toBe('3/4/1986|')
  })

  it('honours { eager: false } while still keeping the typed separators', () => {
    input = bound('', DATE, { eager: false })
    const seen: string[] = []
    for (const ch of '3/4/1986') {
      type(input, ch)
      seen.push(withCaret(input))
    }
    expect(seen).toEqual([
      '3|', '3/|', '3/4|', '3/4/|', '3/4/1|', '3/4/19|', '3/4/198|', '3/4/1986|',
    ])
  })

  it('waits for the next digit at the maximum with { eager: false }', () => {
    input = bound('', DATE, { eager: false })
    for (const ch of '12') type(input, ch)
    expect(withCaret(input)).toBe('12|')
    type(input, '1')
    expect(withCaret(input)).toBe('12/1|')
  })
})

describe('bind() — editing a quantified date', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input.remove()
  })

  it('replaces a two-digit day with one digit without moving month or year', () => {
    input = bound('12/12/1986', DATE)
    input.setSelectionRange(0, 2)
    type(input, '3')
    expect(withCaret(input)).toBe('3|/12/1986')
  })

  it('replaces a two-digit month with one digit without pulling year digits back', () => {
    input = bound('12/12/1986', DATE)
    input.setSelectionRange(3, 5)
    type(input, '4')
    expect(withCaret(input)).toBe('12/4|/1986')
  })

  it('grows a one-digit segment back to two without disturbing the year', () => {
    input = bound('3/4/1986', DATE)
    input.setSelectionRange(1, 1)
    type(input, '1')
    expect(withCaret(input)).toBe('31|/4/1986')
  })

  it('deletes a whole ranged segment and leaves the rest anchored', () => {
    input = bound('12/12/1986', DATE)
    input.setSelectionRange(3, 5)
    deleteWith(input, 'deleteContentForward')
    expect(withCaret(input)).toBe('12/|/1986')
  })

  it('refills an emptied ranged segment', () => {
    input = bound('12/12/1986', DATE)
    input.setSelectionRange(3, 5)
    deleteWith(input, 'deleteContentForward')
    type(input, '7')
    expect(withCaret(input)).toBe('12/7|/1986')
  })

  it('keeps the boundary when a selection takes a ranged segment and its separator', () => {
    input = bound('12/12/1986', DATE)
    input.setSelectionRange(3, 6) // "12/"
    deleteWith(input, 'deleteContentBackward')
    expect(withCaret(input)).toBe('12/|/1986')
  })

  it('keeps the boundary when a selection takes the first segment and its separator', () => {
    input = bound('12/12/1986', DATE)
    input.setSelectionRange(0, 3) // "12/"
    deleteWith(input, 'deleteContentBackward')
    expect(withCaret(input)).toBe('|/12/1986')
  })

  it('backspaces inside a one-character segment', () => {
    input = bound('3/4/1986', DATE)
    input.setSelectionRange(1, 1)
    deleteWith(input, 'deleteContentBackward')
    expect(withCaret(input)).toBe('|/4/1986')
  })

  it('backspaces inside a two-character segment', () => {
    input = bound('12/4/1986', DATE)
    input.setSelectionRange(2, 2)
    deleteWith(input, 'deleteContentBackward')
    expect(withCaret(input)).toBe('1|/4/1986')
  })

  it('does not bring back an eagerly revealed separator that was deleted', () => {
    input = bound('', DATE)
    for (const ch of '12') type(input, ch)
    expect(withCaret(input)).toBe('12/|')
    deleteWith(input, 'deleteContentBackward')
    expect(withCaret(input)).toBe('12|')
    type(input, '3')
    expect(withCaret(input)).toBe('12/3|')
  })

  it('lets an explicitly typed separator be deleted, reopening the segment', () => {
    input = bound('', DATE)
    for (const ch of '3/') type(input, ch)
    expect(withCaret(input)).toBe('3/|')
    deleteWith(input, 'deleteContentBackward')
    expect(withCaret(input)).toBe('3|')
    // The day still has a slot free, so the next digit joins it — and only
    // then, at the maximum, does the separator come back.
    type(input, '4')
    expect(withCaret(input)).toBe('34/|')
  })

  it('drains "3/4/1986" one Backspace at a time', () => {
    input = bound('3/4/1986', DATE)
    input.setSelectionRange(8, 8)
    const seen: string[] = []
    for (let i = 0; i < 8; i++) {
      deleteWith(input, 'deleteContentBackward')
      seen.push(withCaret(input))
    }
    expect(seen).toEqual(['3/4/198|', '3/4/19|', '3/4/1|', '3/4/|', '3/4|', '3/|', '3|', '|'])
  })

  it('forward-deletes from the start of a ranged segment, caret staying put', () => {
    input = bound('12/12/1986', DATE)
    input.setSelectionRange(3, 3)
    deleteWith(input, 'deleteContentForward')
    expect(withCaret(input)).toBe('12/|2/1986')
    deleteWith(input, 'deleteContentForward')
    expect(withCaret(input)).toBe('12/|/1986')
  })

  it('pastes a complete quantified date', async () => {
    input = bound('', DATE)
    input.value = '3/4/1986'
    input.setSelectionRange(8, 8)
    input.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
    await flushRafs(1)
    expect(withCaret(input)).toBe('3/4/1986|')
  })
})

// ---------------------------------------------------------------------------
// 10. Capacity — a ranged mask is full by slots, not by character count
//
// `maxlength` bounds the *formatted* length (10 here). On a fixed mask that
// doubles as a capacity guard, because a full value is always exactly that
// long. A ranged mask breaks the coincidence: "3/12/1986" is full at nine
// characters, so the browser still lets a tenth through. The engine has to
// hold the boundaries the user set and drop what no longer fits off the tail,
// exactly as an extra digit falls off a full fixed mask.
// ---------------------------------------------------------------------------

/** Data characters in `value`, counted the way the compiler counts slots. */
function dataCount(value: string, mask: string, options?: ApplyMaskOptions): number {
  const compiler = new PatternCompiler(options?.tokens)
  const plan = compiler.compile(mask)
  return Array.from(compiler.data(value, 0, [plan]).value).length
}

/** Total slot capacity of `mask`. */
function slotCapacity(mask: string, options?: ApplyMaskOptions): number {
  return new PatternCompiler(options?.tokens).compile(mask).totalSlots
}

describe('an over-capacity value drops the overflow instead of repacking', () => {
  const FULL = ['3/4/1986', '3/12/1986', '12/4/1986', '12/12/1986']

  it('a committed segment gives up the slots it did not use', () => {
    // Neither bound the library publishes can say "this value is finished":
    // three of the four full shapes sit below the formatted bound *and* below
    // the slot count, because closing a ranged segment early retires its
    // spare slots. That is what the engine has to remember.
    expect(getMaxLength(DATE)).toBe(10)
    expect(slotCapacity(DATE)).toBe(8)
    expect(FULL.map((value) => value.length)).toEqual([8, 9, 9, 10])
    expect(FULL.map((value) => dataCount(value, DATE))).toEqual([6, 7, 7, 8])
  })

  it('applyMask drops a ninth digit typed at the end of any full shape', () => {
    for (const value of FULL) {
      const raw = `${value}7`
      expect({ value, r: applyMask(raw, DATE, raw.length) })
        .toEqual({ value, r: { value, caret: value.length } })
    }
  })

  it('drops however many extra characters arrive, not just one', () => {
    expect(applyMask('3/4/198677', DATE, 10)).toEqual({ value: '3/4/1986', caret: 8 })
    expect(applyMask('3/12/198612', DATE, 11)).toEqual({ value: '3/12/1986', caret: 9 })
    expect(applyMask('12/12/1986777', DATE, 13)).toEqual({ value: '12/12/1986', caret: 10 })
    // Trailing separators past a full mask are dropped the same way.
    expect(applyMask('3/4/1986/7', DATE, 10)).toEqual({ value: '3/4/1986', caret: 8 })
  })

  it('never emits more than the compiled maximum, or more data than slots', () => {
    for (const raw of ['3/4/19867', '3/12/198612', '12/4/198600', '123456789012', '3/4/1986/7/7']) {
      const out = applyMask(raw, DATE, raw.length).value
      expect({ raw, len: out.length <= getMaxLength(DATE) }).toEqual({ raw, len: true })
      expect({ raw, data: dataCount(out, DATE) <= slotCapacity(DATE) }).toEqual({ raw, data: true })
    }
  })

  it('holds the boundary for letter, alphanumeric and custom-token runs too', () => {
    expect(applyMask('ab-123x', 'Z{2,4}-9{1,3}', 7)).toEqual({ value: 'ab-123', caret: 6 })
    expect(applyMask('a-1234', 'Z{1,4}-9{1,3}', 6)).toEqual({ value: 'a-123', caret: 5 })
    expect(applyMask('a1-999', 'A{1,2}-9{2}', 6)).toEqual({ value: 'a1-99', caret: 5 })
    expect(process('ab-1234', 'U{1,2}-9{1,3}', {
      tokens: { U: { match: /[a-z]/i, transform: (char) => char.toUpperCase() } },
    })).toBe('AB-123')
  })

  it('an over-capacity value still reaches a fixed point in one pass', () => {
    const cases: [string, string][] = [
      [DATE, '3/4/19861'], [DATE, '3/12/19861'], [DATE, '12/4/19861'], [DATE, '12/12/19861'],
      [DATE, '3/4/1986777'], [DATE, '123456789'], ['Z{2,4}-9{1,3}', 'ab-123x'],
    ]
    for (const [mask, raw] of cases) {
      for (const eager of [true, false]) {
        const once = applyMask(raw, mask, raw.length, { eager })
        const twice = applyMask(once.value, mask, once.caret, { eager })
        expect({ mask, raw, eager, out: twice.value }).toEqual({ mask, raw, eager, out: once.value })
      }
    }
  })

  it('an empty ranged run is not a committed boundary, so capacity still guards it', () => {
    // Nothing was typed into the month, so there is no user-chosen width to
    // protect and the ordinary anchoring rules decide where the digits land.
    expect(applyMask('3//19861', DATE, 8)).toEqual({ value: '3/19/861', caret: 8 })
  })

  it('leaves fixed masks byte-for-byte as they were', () => {
    // Reachable only by paste — `maxlength` stops a fixed mask well before
    // this. Recorded here so the committed-boundary rule can never start
    // applying to a mask that has no ranged run.
    expect(applyMask('25/12/20255', '99/99/9999', 11)).toEqual({ value: '25/12/2025', caret: 10 })
    expect(applyMask('255/12/2025', '99/99/9999', 3)).toEqual({ value: '25/51/2202', caret: 4 })
    expect(applyMask('015-3956', '999.999.999-99', 3).value).toBe('015.395.6')
    expect(applyMask('25/123/2025', '99/99/9999', 6).value).toBe('25/12/3202')
  })
})

describe('bind() — a full ranged mask refuses more input', () => {
  let input: HTMLInputElement

  afterEach(() => {
    input.remove()
  })

  for (const full of ['3/4/1986', '3/12/1986', '12/4/1986', '12/12/1986']) {
    it(`typing at the end of "${full}" changes nothing`, () => {
      input = bound(full, DATE)
      input.setSelectionRange(full.length, full.length)
      type(input, '7')
      expect(withCaret(input)).toBe(`${full}|`)
    })
  }

  it('stays put however many times the key is pressed', () => {
    input = bound('3/4/1986', DATE)
    input.setSelectionRange(8, 8)
    const seen: string[] = []
    for (let i = 0; i < 5; i++) {
      type(input, '7')
      seen.push(withCaret(input))
    }
    expect(seen).toEqual(Array(5).fill('3/4/1986|'))
  })

  it('refuses the extra digit through the keydown/rAF fallback too', async () => {
    input = bound('3/12/1986', DATE)
    input.setSelectionRange(9, 9)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '7', bubbles: true, cancelable: true }))
    input.value = '3/12/19867'
    input.setSelectionRange(10, 10)
    await flushRafs()
    expect(withCaret(input)).toBe('3/12/1986|')
  })

  it('drops the overflow when an over-capacity value is pasted', async () => {
    input = bound('', DATE)
    input.value = '3/4/1986777'
    input.setSelectionRange(11, 11)
    input.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
    await flushRafs(1)
    expect(withCaret(input)).toBe('3/4/1986|')
  })

  it('grows the day instead, when the insert lands inside a segment with room', () => {
    // The day still has a free slot, so inserting there widens it and the
    // mask stays exactly at capacity — nothing is dropped.
    input = bound('3/12/1986', DATE)
    input.setSelectionRange(1, 1)
    type(input, '7')
    expect(withCaret(input)).toBe('37|/12/1986')
  })

  it('pushes overflow forward when the insert lands in a segment already at maximum', () => {
    // Same rule a fixed mask follows for "25/123/2025" — the extra character
    // flows into the next field and the last one falls off the end.
    input = bound('3/12/1986', DATE)
    input.setSelectionRange(3, 3)
    type(input, '7')
    expect(withCaret(input)).toBe('3/17|/2198')
  })

  it('still accepts a selection replacement, which frees a slot first', () => {
    input = bound('12/12/1986', DATE)
    input.setSelectionRange(0, 2)
    type(input, '3')
    expect(withCaret(input)).toBe('3|/12/1986')
    // ... and the freed slot can be refilled.
    type(input, '1')
    expect(withCaret(input)).toBe('31|/12/1986')
  })

  it('keeps maxlength as the formatted bound, with the engine holding the slot bound', () => {
    input = bound('', DATE)
    expect(input.getAttribute('maxlength')).toBe('10')
    for (const ch of '1212198677777') type(input, ch)
    expect(withCaret(input)).toBe('12/12/1986|')
    expect(input.value.length).toBeLessThanOrEqual(10)
    expect(dataCount(input.value, DATE)).toBe(slotCapacity(DATE))
  })
})
