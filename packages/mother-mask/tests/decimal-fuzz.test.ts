import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  applyDecimalMask,
  bindDecimal,
  formatDecimalValue,
  isDecimalValueSafe,
  processDecimal,
  unmaskDecimal,
} from '../src/index'
import type { DecimalMaskOptions } from '../src/index'

// ---------------------------------------------------------------------------
// Seeded random editing across random bindDecimal configurations. There is
// no model of the "right" answer here; instead every value the mask settles
// on must satisfy invariants that hold whatever the user did:
//
//   - it is well-formed for its configuration (sign, prefix, grouped integer
//     of the right width, fraction of the right width, suffix)
//   - it re-masks to itself, with the caret where it already is
//   - onChange reported it, with its own unmaskDecimal
//   - the caret sits inside the number
//   - a non-zero digit typed into an integer part that has room changes it
//
// A failure prints the configuration, the seed and the edit log, so it can
// be replayed deterministically.
// ---------------------------------------------------------------------------

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

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]
}

const PREFIXES = ['', '$', 'R$ ', 'No. ', 'Q1 ', '-']
const SUFFIXES = ['', ' €', ' USD', '.00', ' 1x']

function randomConfig(rng: () => number): Required<DecimalMaskOptions> {
  const [separator, decimalSeparator] = pick(rng, [
    [',', '.'],
    ['.', ','],
    [' ', '.'],
    [' ', ','],
    ['', '.'],
  ] as const)
  return {
    decimalPlaces: pick(rng, [undefined, 0, 1, 2, 3, 4]) as number,
    numberPlaces: pick(rng, [undefined, undefined, 1, 2, 5, 7]) as number,
    segmented: rng() < 0.7,
    separator,
    decimalSeparator,
    prefix: pick(rng, PREFIXES),
    suffix: pick(rng, SUFFIXES),
    allowNegative: rng() < 0.5,
    allowDecimalPush: rng() < 0.5,
  }
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Every value the mask may settle on for `o`, as a regular expression. */
function shape(o: Required<DecimalMaskOptions>): RegExp {
  const sign = o.allowNegative ? '-?' : ''
  const group = o.segmented && o.separator ? esc(o.separator) : null
  const int =
    o.numberPlaces != null
      ? group
        ? `(?:\\d{1,3}(?:${group}\\d{3})*)`
        : `\\d{${o.numberPlaces}}`
      : group
        ? `(?:0|[1-9]\\d{0,2}(?:${group}\\d{3})*)`
        : `(?:0|[1-9]\\d*)`
  const frac =
    o.decimalPlaces === 0
      ? ''
      : o.decimalPlaces != null
        ? `${esc(o.decimalSeparator)}\\d{${o.decimalPlaces}}`
        : `(?:${esc(o.decimalSeparator)}\\d*)?`
  const number = `${sign}${esc(o.prefix)}${int}${frac}${esc(o.suffix)}`
  const loneSign = o.allowNegative ? `|-${esc(o.prefix)}` : ''
  return new RegExp(`^(?:${number}${loneSign}|)$`)
}

function digitsOf(s: string): string {
  return s.replace(/\D/g, '')
}

interface Fuzzer {
  input: HTMLInputElement
  calls: Array<[string, number]>
  log: string[]
  dispose: () => void
}

function dispatchInput(input: HTMLInputElement, data: string | null, inputType: string): void {
  const event = new Event('input', { bubbles: true })
  Object.defineProperty(event, 'data', { value: data })
  Object.defineProperty(event, 'inputType', { value: inputType })
  input.dispatchEvent(event)
}

function checkValue(f: Fuzzer, o: Required<DecimalMaskOptions>, where: (msg: string) => string): void {
  const { input } = f
  const v = input.value
  const caret = input.selectionStart ?? 0
  expect(v, where('shape')).toMatch(shape(o))
  expect(processDecimal(v, o), where('processDecimal idempotence')).toBe(v)
  const again = applyDecimalMask(v, caret, o)
  expect(again.value, where('applyDecimalMask idempotence')).toBe(v)
  // numberPlaces padding is synthetic: a caret parked between padding and
  // the real digits is a legitimate position that a re-mask (which sees
  // only digits) cannot distinguish, so the fixed point only holds without it.
  if (o.numberPlaces == null) expect(again.caret, where('caret stable under re-mask')).toBe(caret)
  const n = unmaskDecimal(v, o)
  expect(Number.isFinite(n), where('finite number')).toBe(true)
  expect(f.calls[f.calls.length - 1], where('onChange')).toEqual([v, n])
  // The lone-sign state ("-" + prefix, no digits yet) carries no suffix by design.
  if (v !== '' && v !== '-' + o.prefix) {
    const start = (v.startsWith('-') && !o.prefix.startsWith('-') ? 1 : 0) + o.prefix.length
    expect(caret, where('caret after affix')).toBeGreaterThanOrEqual(start)
    expect(caret, where('caret before suffix')).toBeLessThanOrEqual(v.length - o.suffix.length)
  }
}

function makeFuzzer(o: Required<DecimalMaskOptions>, seed: number): { f: Fuzzer; where: (msg: string) => string } {
  const input = document.createElement('input')
  document.body.appendChild(input)
  const f: Fuzzer = { input, calls: [], log: [], dispose: () => {} }
  f.dispose = bindDecimal(input, { ...o, onChange: (v, n) => f.calls.push([v, n]) })
  const where = (msg: string): string =>
    `${msg}\n  config: ${JSON.stringify(o)}\n  seed: ${seed}\n  log:\n    ${f.log.join('\n    ')}`
  return { f, where }
}

function runSequence(o: Required<DecimalMaskOptions>, seed: number, steps: number): void {
  const rng = makeRng(seed)
  const { f, where } = makeFuzzer(o, seed)
  const { input } = f
  const check = (): void => checkValue(f, o, where)

  try {
    for (let i = 0; i < steps; i++) {
      const v = input.value
      const len = v.length
      const at = Math.floor(rng() * (len + 1))
      const roll = rng()

      if (roll < 0.45) {
        // Type one character at a random position.
        const ch = pick(rng, ['1', '2', '3', '7', '9', '0', '0', '-', '+', o.decimalSeparator, '.', ','])
        const before = unmaskDecimal(v, o)
        const hadRoom =
          o.numberPlaces == null ||
          digitsOf(v.slice(0, v.length - o.suffix.length)).replace(/^0+/, '').length < o.numberPlaces
        const intEnd = (() => {
          const body = v.slice(v.startsWith('-') ? 1 : 0).slice(o.prefix.length, v.length - o.suffix.length)
          const sep = o.decimalPlaces === 0 ? -1 : body.indexOf(o.decimalSeparator)
          return (v.startsWith('-') ? 1 : 0) + o.prefix.length + (sep < 0 ? body.length : sep)
        })()
        const inInteger = v !== '' && at <= intEnd
        input.value = v.slice(0, at) + ch + v.slice(at)
        input.setSelectionRange(at + 1, at + 1)
        f.log.push(`type ${JSON.stringify(ch)} at ${at} in ${JSON.stringify(v)}`)
        dispatchInput(input, ch, 'insertText')
        check()
        if (/[1-9]/.test(ch) && inInteger && hadRoom && o.prefix !== 'Q1 ' && o.prefix !== 'No. ') {
          expect(unmaskDecimal(input.value, o), where('non-zero digit with room changes the value')).not.toBe(before)
        }
        // With push on, a non-zero digit at the very end of a full fraction
        // must push (unless the integer part is capped and full).
        const atEnd = v !== '' && at === v.length - o.suffix.length
        if (/[1-9]/.test(ch) && atEnd && o.allowDecimalPush && o.decimalPlaces && hadRoom && v !== '-' + o.prefix) {
          expect(unmaskDecimal(input.value, o), where('push at the end changes the value')).not.toBe(before)
        }
      } else if (roll < 0.6) {
        if (at === 0) continue
        input.value = v.slice(0, at - 1) + v.slice(at)
        input.setSelectionRange(at - 1, at - 1)
        f.log.push(`backspace at ${at} in ${JSON.stringify(v)}`)
        dispatchInput(input, null, 'deleteContentBackward')
        check()
      } else if (roll < 0.72) {
        if (at >= len) continue
        input.value = v.slice(0, at) + v.slice(at + 1)
        input.setSelectionRange(at, at)
        f.log.push(`delete at ${at} in ${JSON.stringify(v)}`)
        dispatchInput(input, null, 'deleteContentForward')
        check()
      } else if (roll < 0.85) {
        // Replace a random selection with a digit or nothing.
        const end = Math.min(len, at + 1 + Math.floor(rng() * 4))
        const ch = rng() < 0.6 ? pick(rng, ['4', '5', '0']) : ''
        input.value = v.slice(0, at) + ch + v.slice(end)
        input.setSelectionRange(at + ch.length, at + ch.length)
        f.log.push(`replace [${at},${end}) with ${JSON.stringify(ch)} in ${JSON.stringify(v)}`)
        dispatchInput(input, ch || null, ch ? 'insertText' : 'deleteContentBackward')
        check()
      } else {
        // Paste something over everything.
        const text = pick(rng, ['1234.5', '-98,765.43', '0', '', 'abc', '1 234 567,89', '7.', '.5', '-', '$1,000.00 USD'])
        input.value = text
        input.setSelectionRange(text.length, text.length)
        f.log.push(`paste ${JSON.stringify(text)}`)
        dispatchInput(input, null, 'insertFromPaste')
        check()
      }
    }
  } finally {
    f.dispose()
    input.remove()
  }
}

/**
 * The keydown → requestAnimationFrame fallback path: every keystroke is a
 * keydown plus the browser's native edit, with no `input` event at all, and
 * the frames fire only when `flush` is called — after one keystroke or
 * after a burst of several.
 */
function runKeydownSequence(o: Required<DecimalMaskOptions>, seed: number, steps: number): void {
  const rng = makeRng(seed)
  const { f, where } = makeFuzzer(o, seed)
  const { input } = f
  const flush = (): void => {
    for (let i = 0; i < 4; i++) vi.advanceTimersToNextFrame()
  }
  const key = (k: string, valueAfter: string, caretAfter: number): void => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
    input.value = valueAfter
    input.setSelectionRange(caretAfter, caretAfter)
  }

  try {
    for (let i = 0; i < steps; i++) {
      // A burst of 1–4 same-kind keystrokes, then the frames fire.
      const burst = 1 + Math.floor(rng() * 4)
      const kind = rng()
      for (let b = 0; b < burst; b++) {
        const v = input.value
        const at = b === 0 ? Math.floor(rng() * (v.length + 1)) : (input.selectionStart ?? v.length)
        if (kind < 0.6) {
          const ch = pick(rng, ['1', '2', '3', '7', '9', '0', '-', '+', o.decimalSeparator, '.', ','])
          f.log.push(`key ${JSON.stringify(ch)} at ${at} in ${JSON.stringify(v)}`)
          key(ch, v.slice(0, at) + ch + v.slice(at), at + 1)
        } else if (kind < 0.85) {
          if (at === 0) break
          f.log.push(`Backspace at ${at} in ${JSON.stringify(v)}`)
          key('Backspace', v.slice(0, at - 1) + v.slice(at), at - 1)
        } else {
          if (at >= v.length) break
          f.log.push(`Delete at ${at} in ${JSON.stringify(v)}`)
          key('Delete', v.slice(0, at) + v.slice(at + 1), at)
        }
      }
      f.log.push('(frames fire)')
      flush()
      if (f.calls.length === 0) continue // nothing landed yet (e.g. Backspace at 0 only)
      checkValue(f, o, where)
    }
  } finally {
    f.dispose()
    input.remove()
  }
}

describe('bindDecimal() — seeded random keydown-only bursts across random configurations', () => {
  const RUNS = Number(process.env.FUZZ_RUNS) || 1500
  const STEPS = 8

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sanity: the fake frames really drive the keydown fallback', () => {
    const o = { ...randomConfig(makeRng(1)), decimalPlaces: 2, prefix: '$', suffix: '' }
    const { f } = makeFuzzer(o, 1)
    f.input.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }))
    f.input.value = '1'
    f.input.setSelectionRange(1, 1)
    expect(f.calls).toHaveLength(0)
    vi.advanceTimersToNextFrame()
    expect(f.calls).toEqual([[formatDecimalValue(1, o), 1]])
    f.dispose()
    f.input.remove()
  })

  for (let batch = 0; batch < 5; batch++) {
    it(`batch ${batch + 1}`, () => {
      for (let run = 0; run < RUNS / 5; run++) {
        const seed = 500_000 + batch * 100_003 + run * 7919
        const o = randomConfig(makeRng(seed))
        if (o.separator === o.decimalSeparator) continue
        runKeydownSequence(o, seed, STEPS)
      }
    })
  }
})

describe('formatDecimalValue / unmaskDecimal — random numbers across random configurations', () => {
  const RUNS = Number(process.env.FUZZ_RUNS) || 1500

  it('formats to a well-formed, idempotent value that parses back to the rounded number', () => {
    for (let run = 0; run < RUNS; run++) {
      const seed = 900_000 + run * 7919
      const rng = makeRng(seed)
      const o = randomConfig(rng)
      if (o.separator === o.decimalSeparator) continue
      const magnitude = pick(rng, [1, 10, 1000, 1e6, 1e9, 1e15, 1e21, 1e-3, 1e-7])
      const n = (rng() < 0.3 ? -1 : 1) * rng() * magnitude
      const where = `n: ${n}\n  config: ${JSON.stringify(o)}\n  seed: ${seed}`

      const v = formatDecimalValue(n, o)
      const abs = Math.abs(n)
      const expectedAbs =
        o.decimalPlaces == null ? abs : Number(abs.toFixed(o.decimalPlaces))
      // formatDecimalValue deliberately never truncates a number wider than
      // numberPlaces (no data loss), while the mask and unmaskDecimal cap at
      // that width — so a wider value is only checked for being finite.
      const capped = o.numberPlaces != null && Math.floor(expectedAbs).toString().length > o.numberPlaces
      if (capped) continue
      expect(v, `${where} (shape)`).toMatch(shape(o))
      expect(processDecimal(v, o), `${where} (idempotence)`).toBe(v)
      expect(formatDecimalValue(unmaskDecimal(v, o), o), `${where} (format → parse → format)`).toBe(v)

      const back = unmaskDecimal(v, o)
      if (isDecimalValueSafe(v, o) && abs < 1e15) {
        // Within the exactly-representable range, parsing gives back the
        // rounded number (up to float noise at the last place).
        const tolerance = o.decimalPlaces == null ? Math.abs(expectedAbs) * 1e-12 : 0.5 * 10 ** -o.decimalPlaces + 1e-9
        expect(Math.abs(Math.abs(back) - expectedAbs), `${where} (value)`).toBeLessThanOrEqual(tolerance)
        const negative = o.allowNegative && n < 0 && expectedAbs !== 0
        expect(back < 0, `${where} (sign)`).toBe(negative)
      }
    }
  })
})

describe('bindDecimal() — seeded random editing across random configurations', () => {
  // FUZZ_RUNS=50000 npx vitest run tests/decimal-fuzz.test.ts — for a deeper search.
  const RUNS = Number(process.env.FUZZ_RUNS) || 1500
  const STEPS = 14
  for (let batch = 0; batch < 5; batch++) {
    it(`batch ${batch + 1}`, () => {
      for (let run = 0; run < RUNS / 5; run++) {
        const seed = 1 + batch * 100_003 + run * 7919
        const o = randomConfig(makeRng(seed))
        if (o.separator === o.decimalSeparator) continue
        runSequence(o, seed, STEPS)
      }
    })
  }
})
