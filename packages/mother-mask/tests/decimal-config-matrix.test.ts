import { describe, it, expect } from 'vitest'
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
// Every combination of bindDecimal options, driven through one scripted
// editing session. Expectations are not hand-written per combination: each
// step is checked against `formatDecimalValue` (the pure formatter) and a set
// of invariants that must hold whatever the configuration —
//
//   - the masked value re-masks to itself (processDecimal / applyDecimalMask)
//   - with a fixed `decimalPlaces`, formatDecimalValue(unmaskDecimal(v)) === v
//   - onChange always reports (value, unmaskDecimal(value))
//   - the caret lands inside the number, never inside an affix
//   - a digit typed at the end of a full fraction then Backspace is a no-op
//     (push then pull with the flag on; dropped then re-padded with it off)
//
// Combinations where the thousands and decimal separators coincide are
// skipped: that configuration is contradictory, not an edge case.
// ---------------------------------------------------------------------------

const DECIMAL_PLACES = [undefined, 0, 1, 2, 3] as const
const NUMBER_PLACES = [undefined, 2, 5] as const
const SEPARATORS: Array<[string, string]> = [
  [',', '.'],
  ['.', ','],
  [' ', '.'],
  [' ', ','],
]
const AFFIXES: Array<[string, string]> = [
  ['', ''],
  ['$', ''],
  ['R$ ', ''],
  ['', ' €'],
  ['$', ' USD'],
  ['R$ ', ' €'],
]
const BOOLS = [false, true] as const

interface Combo extends DecimalMaskOptions {
  decimalPlaces: number | undefined
  numberPlaces: number | undefined
  separator: string
  decimalSeparator: string
  prefix: string
  suffix: string
  segmented: boolean
  allowNegative: boolean
  allowDecimalPush: boolean
}

function combos(decimalPlaces: number | undefined, allowDecimalPush: boolean): Combo[] {
  const out: Combo[] = []
  for (const numberPlaces of NUMBER_PLACES)
    for (const [separator, decimalSeparator] of SEPARATORS)
      for (const [prefix, suffix] of AFFIXES)
        for (const segmented of BOOLS)
          for (const allowNegative of BOOLS)
            out.push({
              decimalPlaces,
              numberPlaces,
              separator,
              decimalSeparator,
              prefix,
              suffix,
              segmented,
              allowNegative,
              allowDecimalPush,
            })
  return out
}

// ---------------------------------------------------------------------------
// A scripted session against one bound input
// ---------------------------------------------------------------------------

function dispatchInput(input: HTMLInputElement, data: string | null, inputType: string): void {
  const event = new Event('input', { bubbles: true })
  Object.defineProperty(event, 'data', { value: data })
  Object.defineProperty(event, 'inputType', { value: inputType })
  input.dispatchEvent(event)
}

class Session {
  readonly input: HTMLInputElement
  readonly label: string
  readonly calls: Array<[string, number]> = []
  private readonly dispose: () => void

  constructor(readonly opts: Combo) {
    this.label = JSON.stringify(opts)
    this.input = document.createElement('input')
    document.body.appendChild(this.input)
    this.dispose = bindDecimal(this.input, { ...opts, onChange: (v, n) => this.calls.push([v, n]) })
  }

  end(): void {
    this.dispose()
    this.input.remove()
  }

  get value(): string {
    return this.input.value
  }

  get caret(): number {
    return this.input.selectionStart ?? 0
  }

  setCaret(at: number): void {
    this.input.setSelectionRange(at, at)
  }

  type(ch: string, at = this.caret): void {
    const v = this.input.value
    this.input.value = v.slice(0, at) + ch + v.slice(at)
    this.setCaret(at + 1)
    dispatchInput(this.input, ch, 'insertText')
  }

  backspace(at = this.caret): void {
    if (at === 0) return
    const v = this.input.value
    this.input.value = v.slice(0, at - 1) + v.slice(at)
    this.setCaret(at - 1)
    dispatchInput(this.input, null, 'deleteContentBackward')
  }

  /** Replace the whole value, the way select-all + typing or pasting does. */
  replaceAll(text: string, inputType: 'insertText' | 'insertFromPaste'): void {
    this.input.value = text
    this.setCaret(text.length)
    dispatchInput(this.input, inputType === 'insertText' ? text : null, inputType)
  }

  /** End of the number: just before the suffix. */
  get numberEnd(): number {
    return this.value.length - this.opts.suffix.length
  }

  /** Start of the number: just after the sign and prefix. */
  get numberStart(): number {
    return (this.value.startsWith('-') ? 1 : 0) + this.opts.prefix.length
  }

  fmt(n: number): string {
    return formatDecimalValue(n, this.opts)
  }

  /** The invariants every settled value must satisfy. */
  check(expected: string, step: string): void {
    const where = `${step} — ${this.label}`
    const v = this.value
    expect(v, where).toBe(expected)
    expect(processDecimal(v, this.opts), `${where} (processDecimal idempotence)`).toBe(v)
    expect(applyDecimalMask(v, v.length, this.opts).value, `${where} (applyDecimalMask idempotence)`).toBe(v)
    const n = unmaskDecimal(v, this.opts)
    expect(this.calls[this.calls.length - 1], `${where} (onChange)`).toEqual([v, n])
    if (v !== '' && this.opts.decimalPlaces != null && isDecimalValueSafe(v, this.opts)) {
      expect(this.fmt(n), `${where} (round trip)`).toBe(v)
    }
    if (v !== '') {
      expect(this.caret, `${where} (caret inside the number)`).toBeGreaterThanOrEqual(this.numberStart)
      expect(this.caret, `${where} (caret inside the number)`).toBeLessThanOrEqual(this.numberEnd)
    }
  }
}

/** The integer part the session holds after typing `digits` from empty: capped by `numberPlaces`. */
function cap(digits: string, numberPlaces: number | undefined): string {
  return numberPlaces == null ? digits : digits.slice(0, numberPlaces)
}

function runSession(opts: Combo): void {
  const s = new Session(opts)
  const N = opts.decimalPlaces
  const np = opts.numberPlaces
  try {
    // 1. Type 1234567 from empty. The caret follows the digits, which with a
    //    fixed fraction sit before the separator, so they all extend the
    //    integer part (capped by numberPlaces).
    for (const ch of '1234567') s.type(ch)
    let int = cap('1234567', np)
    s.check(s.fmt(Number(int)), 'type 1234567')

    // 2. A digit at the far left lands at the start of the number. Under a
    //    numberPlaces cap it pushes the last integer digit out, so taking it
    //    back leaves the integer one digit shorter (and zero-padded).
    s.type('9', 0)
    const int9 = cap('9' + int, np)
    s.check(s.fmt(Number(int9)), 'type 9 at far left')
    s.backspace(s.numberStart + 1)
    int = int9.slice(1)
    s.check(s.fmt(Number(int)), 'backspace that 9')

    // 3. The fraction.
    s.setCaret(s.numberEnd)
    if (N == null) {
      s.type(opts.decimalSeparator)
      s.type('8')
      s.type('9')
      s.check(s.fmt(Number(`${int}.89`)), 'open the fraction and type 89')
      s.backspace()
      s.check(s.fmt(Number(`${int}.8`)), 'backspace to .8')
      s.backspace()
      // A trailing separator is a legitimate mid-edit state: not round-trippable.
      expect(s.value, `trailing separator — ${s.label}`).toBe(
        formatDecimalValue(Number(int), { ...opts, suffix: '' }) + opts.decimalSeparator + opts.suffix,
      )
      s.backspace()
      s.check(s.fmt(Number(int)), 'backspace the separator')
    } else if (N === 0) {
      s.type(opts.decimalSeparator)
      s.check(s.fmt(Number(int)), 'separator is noise with decimalPlaces 0')
      s.type('8')
      s.check(s.fmt(Number(cap(int + '8', np))), 'type 8 at the end')
      s.backspace()
      s.check(s.fmt(Number(int)), 'backspace it')
    } else {
      // Caret at the very end: the fraction before it is full of zeros.
      // Push on: the number shifts left (unless numberPlaces is full).
      // Push off: the digit is dropped. Backspace undoes either.
      s.type('8')
      const stream = int + '0'.repeat(N) + '8'
      const pushedInt = stream.slice(0, -N).replace(/^0+(?=\d)/, '')
      const pushHappens = opts.allowDecimalPush && (np == null || pushedInt.length <= np)
      const afterPush = pushHappens ? s.fmt(Number(`${pushedInt}.${stream.slice(-N)}`)) : s.fmt(Number(int))
      s.check(afterPush, 'type 8 at the end of a full fraction')
      s.backspace()
      s.check(s.fmt(Number(int)), 'backspace reverses it')

      // Caret right after the separator: the zeros after it are padding and
      // get overwritten whatever the flag says.
      s.setCaret(s.numberEnd - N)
      s.type('8')
      s.check(s.fmt(Number(`${int}.8`)), 'overwrite padding after the separator')
      s.backspace()
      // Push on: the fraction is short, so the integer's last digit is
      // pulled in. Push off: the gap is re-padded.
      if (opts.allowDecimalPush) {
        const digits = int + '0'.repeat(N - 1)
        const pulledInt = digits.slice(0, -N).replace(/^0+(?=\d)/, '') || '0'
        s.check(s.fmt(Number(`${pulledInt}.${digits.slice(-N)}`)), 'backspace pulls')
      } else {
        s.check(s.fmt(Number(int)), 'backspace re-pads')
      }
    }

    // 4. Sign.
    const before = s.value
    s.setCaret(s.numberEnd)
    s.type('-')
    const negative = opts.allowNegative ? '-' + before : before
    s.check(negative, 'type -')
    expect(unmaskDecimal(s.value, opts) < 0, `negative number — ${s.label}`).toBe(opts.allowNegative)
    s.type('+')
    s.check(before, 'type +')

    // 5. Select-all and retype, then paste a raw value.
    s.replaceAll('5', 'insertText')
    s.check(s.fmt(5), 'select-all + 5')
    s.replaceAll('0', 'insertText')
    s.check(s.fmt(0), 'select-all + 0')
    s.type('7', 0)
    s.check(s.fmt(7), 'type 7 over the placeholder zero')

    // With decimalPlaces 0 the separator is noise, so the digits merge.
    s.replaceAll(`9876${opts.decimalSeparator}5`, 'insertFromPaste')
    s.check(s.fmt(Number(N === 0 ? cap('98765', np) : `${cap('9876', np)}.5`)), 'paste 9876.5')
    s.replaceAll('-42', 'insertFromPaste')
    s.check(s.fmt(opts.allowNegative ? -42 : 42), 'paste -42')

    // 6. Empty out.
    s.replaceAll('', 'insertText')
    s.check('', 'cleared')
  } finally {
    s.end()
  }
}

// ---------------------------------------------------------------------------

describe('bindDecimal() — every option combination', () => {
  for (const decimalPlaces of DECIMAL_PLACES) {
    for (const allowDecimalPush of BOOLS) {
      const list = combos(decimalPlaces, allowDecimalPush)
      it(`decimalPlaces: ${decimalPlaces} × allowDecimalPush: ${allowDecimalPush} (${list.length} combinations)`, () => {
        for (const opts of list) runSession(opts)
      })
    }
  }

  it('regression the matrix found: numberPlaces ≥ 4 with grouping kept dropping every digit after the first', () => {
    const s = new Session({
      decimalPlaces: 2,
      numberPlaces: 5,
      separator: ',',
      decimalSeparator: '.',
      prefix: '$',
      suffix: '',
      segmented: true,
      allowNegative: false,
      allowDecimalPush: false,
    })
    try {
      s.type('1')
      s.check('$00,001.00', 'first digit')
      s.type('2')
      // The padded "00,001" is six characters wide; the digit typed after
      // it is still an integer-part digit, not an overflow.
      s.check('$00,012.00', 'second digit')
      for (const ch of '345') s.type(ch)
      s.check('$12,345.00', 'five digits')
    } finally {
      s.end()
    }
  })

  it('covers the whole matrix', () => {
    const total = DECIMAL_PLACES.length * BOOLS.length * combos(2, true).length
    expect(total).toBe(5 * 2 * 3 * 4 * 6 * 2 * 2)
  })
})
