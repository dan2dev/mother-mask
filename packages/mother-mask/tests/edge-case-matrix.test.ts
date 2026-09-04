import { describe, expect, it } from 'vitest'
import {
  applyDecimalMask,
  applyMask,
  formatDecimalValue,
  getMaxLength,
  isDecimalValueSafe,
  process,
  processDecimal,
  unmaskDecimal,
} from '../src/index'
import type { ApplyMaskOptions, DecimalMaskOptions, MaskPattern } from '../src/index'

// ---------------------------------------------------------------------------
// A data-driven characterization suite for the pure, DOM-free API
// (`applyMask`/`process`/`getMaxLength` and the decimal equivalents). Every
// assertion below is a literal `[..., expected]` vector, grouped into small
// arrays that can grow by appending a row — no new plumbing needed.
//
// Scope: `bind`/`bindDecimal` (DOM wiring, event simulation, composition,
// disposal) already have deep dedicated coverage elsewhere (bind*.test.ts,
// *-fast-typing.test.ts, stress*.test.ts, caret-matrix.test.ts, ...). This
// file stays on the synchronous, jsdom-free surface so every vector here is
// a single deterministic function call — the fastest and least flaky way to
// pin down exact output for a huge matrix of inputs.
//
// A note on the "throws" tables: the values under test are strings by the
// public TypeScript signature, so exercising a caller that ignores the types
// (plain-JS consumers, `any`-typed data from a form library, ...) requires
// casting through `unknown` at the call site — that's intentional, not a
// mistake. Those assertions check `toThrow(TypeError)` (constructor only,
// never exact message text): this repo's CI runs `vitest` under Bun
// (JavaScriptCore), not Node (V8), and the two engines phrase "called a
// method that doesn't exist on this primitive" differently even though both
// raise a genuine `TypeError` — asserting the message would be portable to
// exactly one of the two runtimes that actually execute this suite.
// ---------------------------------------------------------------------------

// ===========================================================================
// 1. Partial / incomplete input — progressive typing at every length 0..max
// ===========================================================================
//
// Each fixture pairs a "source" string with the exact masked output at every
// prefix length from 0 (nothing typed) through the full source — i.e. what a
// user sees after each individual keystroke, using the library's default
// options (segmented + eager, exactly what `bind()` uses). Index `i` of the
// expected array is the result for `source.slice(0, i)`.

interface ProgressiveFixture {
  readonly name: string
  readonly mask: MaskPattern
  readonly source: string
  /** Masked value after 0, 1, 2, ... `source.length` characters, in order. */
  readonly expectedByLength: readonly string[]
  readonly options?: ApplyMaskOptions
}

const PROGRESSIVE_FIXTURES: readonly ProgressiveFixture[] = [
  {
    name: 'phone (BR mobile, leading-literal mask)',
    mask: '(99) 99999-9999',
    source: '11999887766',
    expectedByLength: [
      '', '(1', '(11) ', '(11) 9', '(11) 99', '(11) 999', '(11) 9998',
      '(11) 99988-', '(11) 99988-7', '(11) 99988-77', '(11) 99988-776', '(11) 99988-7766',
    ],
  },
  {
    name: 'CPF (digit-only segmented mask)',
    mask: '999.999.999-99',
    source: '12345678901',
    expectedByLength: [
      '', '1', '12', '123.', '123.4', '123.45', '123.456.', '123.456.7',
      '123.456.78', '123.456.789-', '123.456.789-0', '123.456.789-01',
    ],
  },
  {
    name: 'CNPJ alfanumérico (mixed A-slot mask)',
    mask: 'AA.AAA.AAA/AAAA-99',
    source: '1AB2C3D45E6F78',
    expectedByLength: [
      '', '1', '1A.', '1A.B', '1A.B2', '1A.B2C.', '1A.B2C.3', '1A.B2C.3D',
      '1A.B2C.3D4/', '1A.B2C.3D4/5', '1A.B2C.3D4/5E', '1A.B2C.3D4/5E6',
      '1A.B2C.3D4/5E6F-', '1A.B2C.3D4/5E6F-7', '1A.B2C.3D4/5E6F-78',
    ],
  },
  {
    name: 'date (leading-slot mask)',
    mask: '99/99/9999',
    source: '25122025',
    expectedByLength: ['', '2', '25/', '25/1', '25/12/', '25/12/2', '25/12/20', '25/12/202', '25/12/2025'],
  },
  {
    name: 'CEP (postal code)',
    mask: '99999-999',
    source: '01310100',
    expectedByLength: ['', '0', '01', '013', '0131', '01310-', '01310-1', '01310-10', '01310-100'],
  },
  {
    name: 'MAC address (custom hex token)',
    mask: 'HH:HH:HH:HH:HH:HH',
    source: 'a1b2c3d4e5f6',
    options: { tokens: { H: /[0-9A-Fa-f]/ } },
    expectedByLength: [
      '', 'a', 'a1:', 'a1:b', 'a1:b2:', 'a1:b2:c', 'a1:b2:c3:', 'a1:b2:c3:d',
      'a1:b2:c3:d4:', 'a1:b2:c3:d4:e', 'a1:b2:c3:d4:e5:', 'a1:b2:c3:d4:e5:f', 'a1:b2:c3:d4:e5:f6',
    ],
  },
]

const PROGRESSIVE_ROWS: Array<[label: string, mask: MaskPattern, options: ApplyMaskOptions | undefined, input: string, expected: string]> =
  PROGRESSIVE_FIXTURES.flatMap((fixture) =>
    fixture.expectedByLength.map((expected, len) => [
      `${fixture.name} @ ${len}/${fixture.expectedByLength.length - 1} chars`,
      fixture.mask,
      fixture.options,
      fixture.source.slice(0, len),
      expected,
    ] as const),
  )

describe('1. progressive input — every length from 0 to the full value', () => {
  it.each(PROGRESSIVE_ROWS)('%s', (_label, mask, options, input, expected) => {
    expect(process(input, mask, options)).toBe(expected)
  })

  it('a fully-typed value is stable — re-running process() on its own output is a no-op', () => {
    for (const fixture of PROGRESSIVE_FIXTURES) {
      const full = fixture.expectedByLength[fixture.expectedByLength.length - 1]
      expect(process(full, fixture.mask, fixture.options)).toBe(full)
    }
  })
})

// ===========================================================================
// 2. Overflow & excess input — more characters than the mask can hold
// ===========================================================================

const OVERFLOW_ROWS: Array<[label: string, mask: MaskPattern, options: ApplyMaskOptions | undefined, input: string, expected: string]> = [
  ['phone: 21 raw digits pasted into an 11-digit mask truncates, no error', '(99) 99999-9999', undefined, '119998877669999999999', '(11) 99988-7766'],
  ['CPF: 15 raw digits pasted into an 11-digit mask truncates, no error', '999.999.999-99', undefined, '123456789019999', '123.456.789-01'],
  ['single digit-slot mask keeps only the first character', '9', undefined, '123456', '1'],
  ['single letter-slot mask keeps only the first character', 'Z', undefined, 'ABCDEF', 'A'],
  ['single alphanumeric-slot mask keeps only the first character', 'A', undefined, 'abcdef', 'a'],
  ['40-slot mask given exactly its capacity', '9'.repeat(40), undefined, '1'.repeat(40), '1'.repeat(40)],
  ['40-slot mask given 2x its capacity truncates at the boundary', '9'.repeat(40), undefined, '1'.repeat(80), '1'.repeat(40)],
  ['array mask picks the longer member and still truncates past it', ['999-999', '999-999-999'], undefined, '123456789999999', '123-456-789'],
]

describe('2. overflow — excess characters truncate instead of throwing or wrapping', () => {
  it.each(OVERFLOW_ROWS)('%s', (_label, mask, options, input, expected) => {
    expect(process(input, mask, options)).toBe(expected)
  })

  it('pasting past a full field never changes what was already there (idempotent overflow)', () => {
    const full = process('11999887766', '(99) 99999-9999')
    expect(process(full + '00000', '(99) 99999-9999')).toBe(full)
  })

  it("decimal: fraction digits beyond a fixed decimalPlaces are dropped, not rounded or shifted", () => {
    // 3rd fraction digit "9" has nowhere to go once decimalPlaces caps it at 2.
    expect(processDecimal('123456.789', { decimalPlaces: 2, prefix: '$' })).toBe('$123,456.78')
  })

  it('decimal: integer digits beyond a fixed numberPlaces keep the first ones typed, not the last', () => {
    // The mirror image of the fraction case: numberPlaces is a width the
    // stream stops *accepting into*, not a trailing window — so a 3-digit
    // value capped to 2 places keeps "78", not "89".
    expect(processDecimal('789', { numberPlaces: 2 })).toBe('78')
    expect(processDecimal('56789', { numberPlaces: 3 })).toBe('567')
  })
})

// ===========================================================================
// 3. Type & falsy extremes — null, undefined, booleans, numbers as `value`
// ===========================================================================
//
// The public signature is `value: string`, so every row here represents a
// caller that isn't (or can't be) type-checked. Two masks probe the engine's
// two structurally different entry paths:
//   - a mask that OPENS with a literal ("(99) 99999-9999" starts with "(")
//   - a mask that OPENS with a slot   ("999-999" starts with a digit slot)

const LEADING_LITERAL_MASK = '(99) 99999-9999'
const LEADING_SLOT_MASK = '999-999'
const FLAT: ApplyMaskOptions = { segmented: false }

describe('3a. falsy non-string values — always graceful, regardless of mask shape', () => {
  // `if (!value) return { value: '', caret: 0 }` runs before the mask is even
  // inspected, so every falsy value short-circuits identically.
  const FALSY_ROWS: Array<[label: string, raw: unknown, mask: string]> = [
    ['null, leading-literal mask', null, LEADING_LITERAL_MASK],
    ['null, leading-slot mask', null, LEADING_SLOT_MASK],
    ['undefined, leading-literal mask', undefined, LEADING_LITERAL_MASK],
    ['undefined, leading-slot mask', undefined, LEADING_SLOT_MASK],
    ['number 0, leading-literal mask', 0, LEADING_LITERAL_MASK],
    ['number -0, leading-literal mask', -0, LEADING_LITERAL_MASK],
    ['boolean false, leading-literal mask', false, LEADING_LITERAL_MASK],
    ['NaN, leading-literal mask', NaN, LEADING_LITERAL_MASK],
    ['empty string, leading-literal mask', '', LEADING_LITERAL_MASK],
  ]

  it.each(FALSY_ROWS)('applyMask(%s) → { value: "", caret: 0 }', (_label, raw, mask) => {
    expect(applyMask(raw as string, mask)).toEqual({ value: '', caret: 0 })
  })

  it.each(FALSY_ROWS)('process(%s) → ""', (_label, raw, mask) => {
    expect(process(raw as string, mask)).toBe('')
  })
})

describe('3b. truthy non-string values — throw only when the mask opens with a literal', () => {
  // A non-string primitive has no `.length`, so the segmented engine's main
  // loop condition (`valueIdx < value.length`) is false from the start and
  // it exits having done nothing — UNLESS the mask's very first token is a
  // literal, in which case a fast-path `value.startsWith(...)` runs
  // unconditionally, before that length check ever happens. Flat mode hits
  // the same fast path (a literal is only ever reachable as the first `part`
  // once a preceding slot's `while` loop has already failed to run).
  const TRUTHY_VALUES: ReadonlyArray<[string, unknown]> = [
    ['boolean true', true],
    ['positive integer 42', 42],
    ['negative integer -5', -5],
    ['float 3.14', 3.14],
  ]

  describe.each([
    ['segmented (default)', undefined],
    ['flat', FLAT],
  ] as const)('%s mode', (_modeLabel, options) => {
    it.each(TRUTHY_VALUES)('%s + a leading-literal mask throws a TypeError', (_label, raw) => {
      expect(() => applyMask(raw as string, LEADING_LITERAL_MASK, 0, options)).toThrow(TypeError)
    })

    it.each(TRUTHY_VALUES)('%s + a leading-slot mask returns empty instead of throwing', (_label, raw) => {
      expect(applyMask(raw as string, LEADING_SLOT_MASK, 0, options)).toEqual({ value: '', caret: 0 })
    })
  })

  it('the same asymmetry holds through process()', () => {
    expect(() => process(true as unknown as string, LEADING_LITERAL_MASK)).toThrow(TypeError)
    expect(process(true as unknown as string, LEADING_SLOT_MASK)).toBe('')
  })
})

describe('3c. malformed `mask` arguments', () => {
  it('null/undefined mask throws (not a valid pattern to iterate)', () => {
    expect(() => applyMask('123', null as unknown as string)).toThrow(TypeError)
    expect(() => applyMask('123', undefined as unknown as string)).toThrow(TypeError)
    expect(() => getMaxLength(null as unknown as string)).toThrow(TypeError)
  })

  it('a number/boolean mask is treated as an empty pattern rather than throwing', () => {
    // `Array.from(123)` — a non-iterable, length-less "array-like" — yields
    // `[]`, so the mask compiles to zero tokens instead of erroring.
    expect(applyMask('123', 123 as unknown as string)).toEqual({ value: '', caret: 0 })
    expect(getMaxLength(123 as unknown as string)).toBe(0)
  })

  it('an array mask tolerates a non-string member without throwing', () => {
    expect(process('123', [123, '999'] as unknown as MaskPattern)).toBe('123')
  })
})

describe('3d. decimal functions — a different, stricter falsy/type story', () => {
  // Unlike applyMask/process, `processDecimal`/`unmaskDecimal`/
  // `isDecimalValueSafe` read `value.length` (directly or via splitAffixes)
  // before any falsy guard runs, so null/undefined throw immediately instead
  // of being absorbed. `formatDecimalValue` takes a `number`, and
  // `Number.isFinite` performs no coercion at all, so it is graceful for
  // literally anything that isn't a genuine finite number.
  const THROWS_ON: ReadonlyArray<[string, unknown]> = [
    ['null', null],
    ['undefined', undefined],
    ['boolean true', true],
    ['positive integer 42', 42],
    ['negative integer -5', -5],
    ['float 3.14', 3.14],
  ]

  it.each(THROWS_ON)('processDecimal(%s) throws a TypeError', (_label, raw) => {
    expect(() => processDecimal(raw as string)).toThrow(TypeError)
  })

  it.each(THROWS_ON)('unmaskDecimal(%s) throws a TypeError', (_label, raw) => {
    expect(() => unmaskDecimal(raw as string)).toThrow(TypeError)
  })

  it.each(THROWS_ON)('isDecimalValueSafe(%s) throws a TypeError', (_label, raw) => {
    expect(() => isDecimalValueSafe(raw as string)).toThrow(TypeError)
  })

  const GRACEFUL_EMPTY: ReadonlyArray<[string, unknown]> = [
    ['number 0', 0],
    ['number -0', -0],
    ['boolean false', false],
    ['empty string', ''],
  ]

  it.each(GRACEFUL_EMPTY)('processDecimal(%s) gracefully returns "" (falsy, short-circuits before .length matters)', (_label, raw) => {
    expect(processDecimal(raw as string)).toBe('')
  })

  const NON_FINITE_NUMBER_INPUTS: ReadonlyArray<[string, unknown]> = [
    ['null', null],
    ['undefined', undefined],
    ['string "abc"', 'abc'],
    ['boolean true', true],
    ['boolean false', false],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
  ]

  it.each(NON_FINITE_NUMBER_INPUTS)('formatDecimalValue(%s) always returns "" — Number.isFinite never coerces', (_label, raw) => {
    expect(formatDecimalValue(raw as number)).toBe('')
  })
})

describe('3e. numeric extremes in the `caret` position', () => {
  // Unlike `value`, `caret` is natively typed as `number`, so NaN/Infinity/
  // fractional carets are legal TypeScript — and still worth pinning down.
  const CARET_ROWS: Array<[label: string, caret: number, expected: { value: string; caret: number }]> = [
    ['NaN — no position compares "before" it, caret stays 0', NaN, { value: '12-34-5', caret: 0 }],
    ['Infinity — clamps to the end of the output', Infinity, { value: '12-34-5', caret: 7 }],
    ['-Infinity — clamps to the start', -Infinity, { value: '12-34-5', caret: 0 }],
    ['a fractional caret (2.5) rounds down to the enclosing character', 2.5, { value: '12-34-5', caret: 2 }],
    ['a fractional caret (2.9) still rounds down, not up', 2.9, { value: '12-34-5', caret: 2 }],
  ]

  it.each(CARET_ROWS)('%s', (_label, caret, expected) => {
    expect(applyMask('12345', '99-99-9', caret)).toEqual(expected)
  })
})

// ===========================================================================
// 4. Special characters & Unicode
// ===========================================================================

describe('4a. built-in tokens (9/Z/A) are strictly ASCII, by design', () => {
  const ASCII_ONLY_ROWS: Array<[label: string, mask: string, input: string, expected: string]> = [
    ['emoji are not digits — fully rejected', '999', '😀😀😀', ''],
    ['emoji are not alphanumeric — skipped, surrounding letters survive', 'AAA', '😀ab', 'ab'],
    ['accented letters are not ASCII letters — digits still pass through A', 'AAAAAA', 'áçñ123', '123'],
    ['accented letters are not ASCII letters — nothing matches Z', 'ZZZ', 'áçñ', ''],
    ['Unicode "mathematical bold" digit look-alikes are not ASCII digits', '999', '𝟎𝟏𝟐', ''],
    ['zero-width space is silently dropped as noise', '999', '1​2​3', '123'],
    ['zero-width non-joiner is silently dropped as noise', '999', '1‌2‌3', '123'],
    ['a non-breaking space is silently dropped as noise', '999', '1 2 3', '123'],
  ]

  it.each(ASCII_ONLY_ROWS)('%s', (_label, mask, input, expected) => {
    expect(process(input, mask)).toBe(expected)
  })

  it('a combining accent is dropped even though the base ASCII letter survives (NFD)', () => {
    // "é" written as decomposed "e" + U+0301 (combining acute) — the mark is
    // Unicode category Mn (Mark), not a letter or digit, so it's noise; the
    // plain "e" ahead of it is a real ASCII letter and is kept.
    expect(process('ébc', 'AAA')).toBe('ebc')
  })

  it('a precomposed accented letter is dropped in its entirety (NFC) — contrast with NFD above', () => {
    // "é" as the single precomposed code point U+00E9 is still outside
    // a-z/A-Z, so — unlike the NFD case — there is no bare ASCII "e" left
    // behind to keep once the accent is factored in; the whole grapheme goes.
    expect(process('ébc', 'AAA')).toBe('bc')
  })
})

describe('4b. custom Unicode-aware tokens opt in to exactly what they declare', () => {
  it('a \\p{L} token accepts a precomposed accented letter the built-in A rejects', () => {
    expect(process('ébc', 'LLL', { tokens: { L: /\p{L}/u } })).toBe('ébc')
  })

  it('a \\p{L} token still rejects a combining mark — Mn is not in category L', () => {
    expect(process('ébc', 'LLL', { tokens: { L: /\p{L}/u } })).toBe('ebc')
  })

  it('a \\p{Emoji} token accepts real emoji as whole code points, surrogate pairs intact', () => {
    expect(process('😀😅', 'EE-EE', { tokens: { E: /\p{Emoji}/u } })).toBe('😀😅-')
  })

  it('an astral-capable custom token reserves 2 UTF-16 units per slot for maxlength', () => {
    expect(getMaxLength('EE-EE', { tokens: { E: /\p{Emoji}/u } })).toBe(9) // 4 slots × 2 + 1 literal "-"
  })
})

describe('4c. values that already carry formatting/separators of their own', () => {
  const PRE_FORMATTED_ROWS: Array<[label: string, mask: string, input: string, expected: string]> = [
    ['dash-separated input reformats with the mask\'s own dot separators', '999.99.9999', '123-45-6789', '123.45.6789'],
    ['dot-separated input reformats with the mask\'s own dash separators', '999-99-9999', '123.45.6789', '123-45-6789'],
    ['slash-separated input is stripped as noise; only real digits are re-grouped', '999.999.999-99', '123/45/6789', '123.456.789-'],
    ['a value already in the mask\'s exact format round-trips unchanged (CPF)', '999.999.999-99', '123.456.789-01', '123.456.789-01'],
    ['a value already in the mask\'s exact format round-trips unchanged (phone)', '(99) 99999-9999', '(11) 99988-7766', '(11) 99988-7766'],
  ]

  it.each(PRE_FORMATTED_ROWS)('%s', (_label, mask, input, expected) => {
    expect(process(input, mask)).toBe(expected)
  })

  const PRE_FORMATTED_DECIMAL_ROWS: Array<[label: string, input: string, options: DecimalMaskOptions, expected: string]> = [
    ['an already-grouped, prefixed currency string round-trips unchanged', '$123,456.78', { decimalPlaces: 2, prefix: '$' }, '$123,456.78'],
    ['an already-formatted negative currency string round-trips unchanged', '-$1,234.56', { decimalPlaces: 2, prefix: '$', allowNegative: true }, '-$1,234.56'],
  ]

  it.each(PRE_FORMATTED_DECIMAL_ROWS)('%s', (_label, input, options, expected) => {
    expect(processDecimal(input, options)).toBe(expected)
  })
})

// ===========================================================================
// 5. Pattern edge cases
// ===========================================================================

describe('5a. pattern length spectrum — from empty to far beyond a realistic field', () => {
  const LENGTH_SPECTRUM_ROWS: Array<[label: string, mask: MaskPattern, input: string, expected: string]> = [
    ['empty pattern always yields empty output', '', '123', ''],
    ['single literal-only pattern', '-', 'x', '-'],
    ['single digit-slot pattern', '9', '5', '5'],
    ['single letter-slot pattern', 'Z', 'q', 'q'],
    ['single alphanumeric-slot pattern', 'A', '7', '7'],
    ['two-slot pattern with no separator', '99', '77', '77'],
    ['50-slot pattern filled to exact capacity', '9'.repeat(50), '1'.repeat(50), '1'.repeat(50)],
  ]

  it.each(LENGTH_SPECTRUM_ROWS)('%s', (_label, mask, input, expected) => {
    expect(process(input, mask)).toBe(expected)
  })
})

describe('5b. consecutive and escaped literal tokens', () => {
  const LITERAL_ROWS: Array<[label: string, mask: string, input: string, expected: string]> = [
    ['a run of consecutive literal characters merges into one block and reveals together', '--99--', '123', '--12--'],
    ['a mask made entirely of plain-text literals is emitted whole once any input arrives', 'abc', '123', 'abc'],
    ['a single escaped token is read as literal text, not a slot', '\\9-99', '12', '9-12'],
    ['a doubled backslash is one literal backslash', '\\\\99', '12', '\\12'],
    ['an escaped token followed by quantifier-shaped braces keeps the braces literal too', '\\9{2}99', '99abc', '9{2}99'],
  ]

  it.each(LITERAL_ROWS)('%s', (_label, mask, input, expected) => {
    expect(process(input, mask)).toBe(expected)
  })
})

describe('5c. quantifier boundary conditions', () => {
  const QUANTIFIER_ROWS: Array<[label: string, mask: string, input: string, expected: string]> = [
    ['{0} has min < 1 — invalid syntax, braces fall back to literal text', '9{0}', '1234', '1{0}'],
    ['{1001} exceeds the 1000 quantifier cap — invalid, braces fall back to literal text', '9{1001}', '1234', '1{1001}'],
    ['{1000} sits exactly at the cap — a real, working quantifier', '9{1000}', '11111', '11111'],
  ]

  it.each(QUANTIFIER_ROWS)('%s', (_label, mask, input, expected) => {
    expect(process(input, mask)).toBe(expected)
  })

  it('getMaxLength reflects the cap exactly at the boundary', () => {
    expect(getMaxLength('9{1000}')).toBe(1000)
    expect(getMaxLength('9{999}')).toBe(999)
  })
})

describe('5d. resolveMask and array-mask resolution edge cases', () => {
  it('a resolver that returns an empty pattern yields empty output', () => {
    expect(process('123', '999', { resolveMask: () => '' })).toBe('')
  })

  it('a resolver may itself return an array, resolved recursively by candidate count', () => {
    expect(process('123456', '999', { resolveMask: () => ['999', '999-999'] })).toBe('123-456')
  })

  it('re-masking a resolver\'s own output at the returned caret is a fixed point', () => {
    const resolveMask = (value: string): MaskPattern =>
      value.startsWith('34') || value.startsWith('37') ? '9999 999999 99999' : '9999 9999 9999 9999'
    const once = applyMask('378282246310005', '9999 9999 9999 9999', 15, { resolveMask })
    expect(once.value).toBe('3782 822463 10005')
    expect(applyMask(once.value, '9999 9999 9999 9999', once.caret, { resolveMask })).toEqual(once)
  })
})

// ===========================================================================
// 6. Decimal-specific option extremes
// ===========================================================================

describe('6a. decimalPlaces/numberPlaces at their numeric extremes', () => {
  const OPTION_EXTREME_ROWS: Array<[label: string, input: string, options: DecimalMaskOptions, expected: string]> = [
    ['decimalPlaces: Infinity behaves exactly like unset (uncapped fraction)', '1234.5678', { decimalPlaces: Infinity }, '1,234.5678'],
    ['decimalPlaces: -Infinity behaves exactly like unset', '1234.5678', { decimalPlaces: -Infinity }, '1,234.5678'],
    ['numberPlaces: -5 clamps to the documented floor of 1', '1234', { numberPlaces: -5 }, '1'],
    ['numberPlaces: Infinity behaves exactly like unset (unlimited)', '1234', { numberPlaces: Infinity }, '1,234'],
    ['numberPlaces: NaN behaves exactly like unset', '1234', { numberPlaces: NaN }, '1,234'],
    ['decimalPlaces: 2.9 floors to 2, not rounds to 3', '1234', { decimalPlaces: 2.9 }, '1,234.00'],
  ]

  it.each(OPTION_EXTREME_ROWS)('%s', (_label, input, options, expected) => {
    expect(processDecimal(input, options)).toBe(expected)
  })
})

describe('6b. integer-precision safety at and beyond Number.MAX_SAFE_INTEGER', () => {
  it('isDecimalValueSafe is true up to 15 integer digits', () => {
    expect(isDecimalValueSafe('123456789012345')).toBe(true)
  })

  it('isDecimalValueSafe is false at 16 integer digits, even when the actual value would fit', () => {
    // Documented as deliberately conservative: 16 digits is *sometimes* safe
    // and sometimes not, so it is always reported unsafe rather than checked
    // digit-by-digit.
    expect(isDecimalValueSafe('1234567890123456')).toBe(false)
  })

  it('unmaskDecimal silently rounds a 20-digit integer once it exceeds safe precision', () => {
    expect(isDecimalValueSafe('12345678901234567890')).toBe(false)
    expect(unmaskDecimal('12345678901234567890')).toBe(12345678901234567000)
  })
})

describe('6c. sign handling: last sign typed wins, and allowNegative gates it entirely', () => {
  const SIGN_ROWS: Array<[label: string, input: string, options: DecimalMaskOptions, expected: string]> = [
    ['without allowNegative, a leading "-" is dropped as plain noise', '-1234.5', {}, '1,234.5'],
    ['a repeated "-" is still just negative (idempotent, not a double-negative toggle)', '--12', { allowNegative: true }, '-12'],
    ['a later "+" overrides an earlier "-" — last sign in the stream wins', '-12+34', { allowNegative: true }, '1,234'],
    ['a lone "-" with no digits yet still renders as a pending negative sign', '-', { allowNegative: true }, '-'],
    ['a lone "-" with a prefix renders the sign ahead of the prefix', '-', { allowNegative: true, prefix: '$' }, '-$'],
  ]

  it.each(SIGN_ROWS)('%s', (_label, input, options, expected) => {
    expect(processDecimal(input, options)).toBe(expected)
  })

  it('unmaskDecimal never returns -0 for a digitless negative', () => {
    expect(Object.is(unmaskDecimal('-', { allowNegative: true }), 0)).toBe(true)
  })
})

describe('6d. negative-value progressive typing (0..max length, mirrors section 1)', () => {
  const source = '-1234.5'
  const options: DecimalMaskOptions = { allowNegative: true, decimalPlaces: 2 }
  const expectedByLength = ['', '-', '-1.00', '-12.00', '-123.00', '-1,234.00', '-1,234.00', '-1,234.50']

  const rows: Array<[len: number, input: string, expected: string]> = expectedByLength.map((expected, len) => [
    len,
    source.slice(0, len),
    expected,
  ])

  it.each(rows)('length %i: processDecimal(%j) → %j', (_len, input, expected) => {
    expect(processDecimal(input, options)).toBe(expected)
  })
})

describe('6e. decimal caret tracking around prefix/fraction boundaries', () => {
  const CARET_ROWS: Array<[label: string, input: string, caret: number, options: DecimalMaskOptions, expected: { value: string; caret: number }]> = [
    ['typing the last integer digit lands the caret right after it, before the padded fraction',
      '1234', 4, { decimalPlaces: 2, prefix: '$' }, { value: '$1,234.00', caret: 6 }],
    ['typing the last fraction digit lands the caret at the very end',
      '1234.5', 6, { decimalPlaces: 2, prefix: '$' }, { value: '$1,234.50', caret: 8 }],
    ['a caret parked at 0 (before the prefix) snaps forward to just past it — the prefix is inert chrome',
      '1234', 0, { decimalPlaces: 2, prefix: '$' }, { value: '$1,234.00', caret: 1 }],
  ]

  it.each(CARET_ROWS)('%s', (_label, input, caret, options, expected) => {
    expect(applyDecimalMask(input, caret, options)).toEqual(expected)
  })
})
