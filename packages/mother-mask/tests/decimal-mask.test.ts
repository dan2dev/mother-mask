import { describe, it, expect } from 'vitest'
import {
  applyDecimalMask,
  applyDecimalMaskReplacingLoneZero,
  applyDecimalMaskUnmergingSeparator,
  formatDecimalValue,
  processDecimal,
  unmaskDecimal,
} from '../src/decimal-mask'

describe('processDecimal() — integer-first entry (no separator typed yet)', () => {
  it('appends a zero-padded fraction while only integer digits have been typed', () => {
    expect(processDecimal('42')).toBe('42.00')
    expect(processDecimal('423')).toBe('423.00')
  })

  it('groups the integer part into thousands as it grows', () => {
    expect(processDecimal('1234')).toBe('1,234.00')
    expect(processDecimal('1234567')).toBe('1,234,567.00')
  })

  it('applies prefix and suffix', () => {
    expect(processDecimal('1234', { prefix: '$' })).toBe('$1,234.00')
    expect(processDecimal('1234', { suffix: ' kg' })).toBe('1,234.00 kg')
  })

  it('never groups a 1-3 digit integer part', () => {
    expect(processDecimal('100')).toBe('100.00')
    expect(processDecimal('999')).toBe('999.00')
  })

  it('groups exactly at 4 digits', () => {
    expect(processDecimal('1000')).toBe('1,000.00')
  })

  it('collapses leading zeros in the integer part', () => {
    expect(processDecimal('007')).toBe('7.00')
    expect(processDecimal('000')).toBe('0.00')
  })

  it('returns an empty string for empty input', () => {
    expect(processDecimal('')).toBe('')
    expect(applyDecimalMask('', 0)).toEqual({ value: '', caret: 0 })
  })

  it('returns an empty string when the input has no digits and no separator', () => {
    expect(processDecimal('abc-')).toBe('')
  })

  it('ignores non-digit noise characters interspersed with integer digits', () => {
    expect(processDecimal('1a2b3c')).toBe('123.00')
  })

  it('handles very large integer parts', () => {
    expect(processDecimal('123456789012345')).toBe('123,456,789,012,345.00')
  })
})

describe('processDecimal() — entering the fraction via the decimal separator', () => {
  it('opens the fraction segment once "." (default decimalSeparator) is typed', () => {
    expect(processDecimal('42.')).toBe('42.00')
    expect(processDecimal('42.5')).toBe('42.50')
    expect(processDecimal('42.56')).toBe('42.56')
  })

  it('drops fraction digits beyond decimalPlaces instead of shifting the window', () => {
    expect(processDecimal('42.567')).toBe('42.56')
  })

  it('uses a custom decimalSeparator as the trigger', () => {
    expect(processDecimal('42,5', { decimalSeparator: ',' })).toBe('42,50')
    // "." is not the configured trigger when decimalSeparator is ",", so it's
    // dropped as noise and its digits fall through into the integer part.
    expect(processDecimal('42.5', { decimalSeparator: ',' })).toBe('425,00')
  })

  it('re-masks an already-formatted value idempotently', () => {
    const once = processDecimal('1234.5', { prefix: '$' })
    expect(processDecimal(once, { prefix: '$' })).toBe(once)
  })

  it('a second, later separator character is treated as noise, not a reset', () => {
    expect(processDecimal('12.34.56')).toBe('12.34')
  })

  it('a lone separator with no digits at all formats as zero', () => {
    expect(processDecimal('.')).toBe('0.00')
  })

  it('digits typed before any integer digit go straight into the fraction', () => {
    expect(processDecimal('.5')).toBe('0.50')
  })
})

describe('processDecimal() — editing (segmented: integer and fraction never bleed)', () => {
  it('shrinking the fraction pads with trailing zeros instead of reflowing', () => {
    // User had "423.42" and deleted the trailing "2" → browser produces "423.4".
    expect(processDecimal('423.4')).toBe('423.40')
  })

  it('shrinking the integer part does not touch an already-typed fraction', () => {
    // "423.42" with the integer edited down to "42" → browser produces "42.42".
    expect(processDecimal('42.42')).toBe('42.42')
  })

  it('growing the integer part does not touch an already-typed fraction', () => {
    expect(processDecimal('4231.42')).toBe('4,231.42')
  })
})

describe('processDecimal() — options', () => {
  it('respects custom decimalPlaces', () => {
    expect(processDecimal('1234')).not.toBe(processDecimal('1234', { decimalPlaces: 0 }))
    expect(processDecimal('1234', { decimalPlaces: 0 })).toBe('1,234')
    expect(processDecimal('1234.5', { decimalPlaces: 1 })).toBe('1,234.5')
    expect(processDecimal('1234.5', { decimalPlaces: 4 })).toBe('1,234.5000')
  })

  it('a decimalPlaces of 0 ignores any typed separator (no fraction segment exists)', () => {
    expect(processDecimal('123.45', { decimalPlaces: 0 })).toBe('12,345')
  })

  it('floors and clamps a fractional/negative decimalPlaces to a non-negative integer', () => {
    expect(processDecimal('1234', { decimalPlaces: 2.9 })).toBe(processDecimal('1234'))
    expect(processDecimal('1234', { decimalPlaces: -3 })).toBe(
      processDecimal('1234', { decimalPlaces: 0 }),
    )
  })

  it('disables thousands grouping when segmented is false', () => {
    expect(processDecimal('123456789', { segmented: false })).toBe('123456789.00')
  })

  it('uses a custom thousands separator independent of the decimal separator', () => {
    expect(processDecimal('1234,56', { separator: '.', decimalSeparator: ',' })).toBe('1.234,56')
  })

  it('treats an empty thousands separator as "no grouping"', () => {
    expect(processDecimal('123456789', { separator: '' })).toBe('123456789.00')
  })

  it('handles a thousands separator equal to the decimal separator without crashing', () => {
    const m = applyDecimalMask('1234.5', 6, { separator: '.', decimalSeparator: '.' })
    expect(typeof m.value).toBe('string')
  })

  describe('negative numbers', () => {
    it('ignores a minus sign when allowNegative is false (default)', () => {
      expect(processDecimal('-1234')).toBe('1,234.00')
    })

    it('produces a signed value when allowNegative is true', () => {
      expect(processDecimal('-1234', { allowNegative: true })).toBe('-1,234.00')
    })

    it('places the sign before the prefix', () => {
      expect(processDecimal('-1234', { allowNegative: true, prefix: '$' })).toBe('-$1,234.00')
    })

    it('treats a lone "-" with no digits as empty', () => {
      expect(processDecimal('-', { allowNegative: true })).toBe('')
    })
  })
})

describe('formatDecimalValue() — number to masked string', () => {
  it('formats a plain number with default options', () => {
    expect(formatDecimalValue(1234.5)).toBe('1,234.50')
  })

  it('formats zero', () => {
    expect(formatDecimalValue(0)).toBe('0.00')
  })

  it('formats negative zero without a stray sign', () => {
    expect(formatDecimalValue(-0, { allowNegative: true })).toBe('0.00')
  })

  it('formats negative numbers when allowed', () => {
    expect(formatDecimalValue(-42.5, { allowNegative: true, prefix: '$' })).toBe('-$42.50')
  })

  it('drops the sign for negative numbers when allowNegative is false', () => {
    expect(formatDecimalValue(-42.5)).toBe('42.50')
  })

  it('rounds to the configured decimalPlaces', () => {
    expect(formatDecimalValue(1.239, { decimalPlaces: 1 })).toBe('1.2')
  })

  it('returns an empty string for non-finite input', () => {
    expect(formatDecimalValue(Number.NaN)).toBe('')
    expect(formatDecimalValue(Number.POSITIVE_INFINITY)).toBe('')
  })

  it('round-trips through unmaskDecimal', () => {
    const masked = formatDecimalValue(1234.56, { prefix: '$' })
    expect(unmaskDecimal(masked, { prefix: '$' })).toBeCloseTo(1234.56)
  })
})

describe('unmaskDecimal() — masked string to number', () => {
  it('parses a masked currency string back into a number', () => {
    expect(unmaskDecimal('$1,234.56', { prefix: '$' })).toBe(1234.56)
  })

  it('a shorter fraction is numerically equivalent to its zero-padded form', () => {
    expect(unmaskDecimal('423.4')).toBe(423.4)
    expect(unmaskDecimal('423.40')).toBe(423.4)
  })

  it('parses integer-only input (no separator typed) as a whole number', () => {
    expect(unmaskDecimal('1234')).toBe(1234)
  })

  it('returns 0 for an empty or digit-less value', () => {
    expect(unmaskDecimal('')).toBe(0)
    expect(unmaskDecimal('$--')).toBe(0)
  })

  it('parses negative values when allowNegative is true', () => {
    expect(unmaskDecimal('-$1,234.56', { allowNegative: true, prefix: '$' })).toBe(-1234.56)
  })

  it('ignores the sign when allowNegative is false', () => {
    expect(unmaskDecimal('-1234')).toBe(1234)
  })

  it('respects decimalPlaces: 0 (no fractional part)', () => {
    expect(unmaskDecimal('1,234', { decimalPlaces: 0 })).toBe(1234)
  })
})

describe('applyDecimalMask() — caret placement', () => {
  it('places the caret right before the auto-appended zero fraction, not past it', () => {
    const m = applyDecimalMask('1234', 4)
    expect(m.value).toBe('1,234.00')
    expect(m.caret).toBe('1,234'.length)
  })

  it('places the caret right before the separator when caret sits at the boundary', () => {
    const m = applyDecimalMask('1234', 4)
    // Right after all 4 integer digits, before the appended ".00".
    expect(m.value.slice(0, m.caret)).toBe('1,234')
  })

  it('keeps the caret glued to the digit just typed inside the fraction', () => {
    // "423.42", user backspaced the trailing "2" → browser produced "423.4"
    // with the caret at the end (position 5).
    const m = applyDecimalMask('423.4', 5)
    expect(m.value).toBe('423.40')
    expect(m.caret).toBe(5) // "423.4|0"
  })

  it('keeps the caret in the integer segment when editing there, ignoring the fraction', () => {
    // "423.42" with the caret after "42" (position 2) — backspace removes
    // the "2": browser produces "42.42" with caret still at 2.
    const m = applyDecimalMask('42.42', 2)
    expect(m.value).toBe('42.42')
    expect(m.caret).toBe(2) // "42|.42"
  })

  it('reproduces the caret unchanged for a no-op reformat (identity)', () => {
    const value = '1,234.56'
    const m = applyDecimalMask(value, 5) // right after the comma-adjusted "234"
    expect(m.value).toBe(value)
    expect(value.slice(0, m.caret)).toBe(value.slice(0, 5))
  })

  it('places the caret right after the separator when caret sits there', () => {
    const m = applyDecimalMask('423.42', 4) // "423.|42"
    expect(m.value).toBe('423.42')
    expect(m.caret).toBe(4)
  })

  it('clamps an out-of-range caret into the value bounds', () => {
    const m1 = applyDecimalMask('1234', -5)
    expect(m1.caret).toBeGreaterThanOrEqual(0)
    const m2 = applyDecimalMask('1234', 999)
    expect(m2.caret).toBeLessThanOrEqual(m2.value.length)
  })
})

describe('applyDecimalMaskReplacingLoneZero() — overwrite the placeholder zero', () => {
  it('replaces the zero when the new digit lands right before it', () => {
    // Field showed "$0.00" with the caret right before the "0"; typing "2"
    // makes the browser produce "$20.00" with the caret after the "2".
    const m = applyDecimalMaskReplacingLoneZero('$20.00', 2, '2', { prefix: '$' })
    expect(m).not.toBeNull()
    expect(m!.value).toBe('$2.00')
    expect(m!.value.slice(0, m!.caret)).toBe('$2')
  })

  it('replaces the zero when the new digit lands right after it', () => {
    // Field showed "$0.00" with the caret right after the "0"; typing "5"
    // makes the browser produce "$05.00" with the caret after the "5".
    const m = applyDecimalMaskReplacingLoneZero('$05.00', 3, '5', { prefix: '$' })
    expect(m).not.toBeNull()
    expect(m!.value).toBe('$5.00')
  })

  it('preserves an already-negative sign', () => {
    const m = applyDecimalMaskReplacingLoneZero('-$20.00', 3, '2', {
      prefix: '$',
      allowNegative: true,
    })
    expect(m).not.toBeNull()
    expect(m!.value).toBe('-$2.00')
  })

  it('preserves an already-typed fraction', () => {
    // Field showed "0.50" (fraction typed, integer still the placeholder
    // zero); typing "2" before the zero should keep the ".50".
    const m = applyDecimalMaskReplacingLoneZero('20.50', 1, '2')
    expect(m).not.toBeNull()
    expect(m!.value).toBe('2.50')
  })

  it('returns null once the integer part has real digits (no more special-casing)', () => {
    const m = applyDecimalMaskReplacingLoneZero('$4123.00', 2, '4', { prefix: '$' })
    expect(m).toBeNull()
  })

  it('returns null when the caret lands inside the fraction, not the integer part', () => {
    const m = applyDecimalMaskReplacingLoneZero('$0.050', 5, '5', { prefix: '$' })
    expect(m).toBeNull()
  })

  it('returns null when the character at caret-1 does not match the given digit', () => {
    const m = applyDecimalMaskReplacingLoneZero('$0.00', 1, '9', { prefix: '$' })
    expect(m).toBeNull()
  })

  it('returns null at the very start of the value (no character to check)', () => {
    const m = applyDecimalMaskReplacingLoneZero('5', 0, '5')
    expect(m).toBeNull()
  })
})

describe('applyDecimalMaskUnmergingSeparator() — Backspace over the decimal separator', () => {
  it('drops the last integer digit and restores the fraction boundary', () => {
    // "$25.00" with the caret right after "." → Backspace deletes the "."
    // → browser produces "$2500" with the caret at 3.
    const m = applyDecimalMaskUnmergingSeparator('$2500', { prefix: '$' })
    expect(m).not.toBeNull()
    expect(m!.value).toBe('$2.00')
    expect(m!.value.slice(0, m!.caret)).toBe('$2')
  })

  it('returns null when the separator is still present (nothing to restore)', () => {
    const m = applyDecimalMaskUnmergingSeparator('$25.00', { prefix: '$' })
    expect(m).toBeNull()
  })

  it('returns null when decimalPlaces is 0 (no separator ever appears)', () => {
    const m = applyDecimalMaskUnmergingSeparator('$2500', { prefix: '$', decimalPlaces: 0 })
    expect(m).toBeNull()
  })

  it('returns null when there are too few digits to have come from a real split', () => {
    const m = applyDecimalMaskUnmergingSeparator('$5', { prefix: '$' })
    expect(m).toBeNull()
  })

  it('preserves a negative sign', () => {
    const m = applyDecimalMaskUnmergingSeparator('-$2500', { prefix: '$', allowNegative: true })
    expect(m).not.toBeNull()
    expect(m!.value).toBe('-$2.00')
  })

  it('re-groups the remaining integer part after dropping a digit', () => {
    // Pre-merge was "$1,234.00"; deleting the "." merges to "1234" + "00".
    const m = applyDecimalMaskUnmergingSeparator('$123400', { prefix: '$' })
    expect(m).not.toBeNull()
    expect(m!.value).toBe('$123.00')
  })

  it('uses the configured decimalSeparator when rebuilding', () => {
    const m = applyDecimalMaskUnmergingSeparator('2500', { decimalSeparator: ',' })
    expect(m).not.toBeNull()
    expect(m!.value).toBe('2,00')
  })
})

describe('applyDecimalMask() — edge cases', () => {
  it('handles decimalPlaces 0 with grouping', () => {
    const m = applyDecimalMask('1234567', 7, { decimalPlaces: 0 })
    expect(m.value).toBe('1,234,567')
  })

  it('handles suffix-only formatting', () => {
    expect(processDecimal('100', { suffix: '%', decimalPlaces: 0 })).toBe('100%')
  })

  it('extra fraction digits typed past decimalPlaces are dropped, not shifted', () => {
    expect(processDecimal('1.23456', { decimalPlaces: 2 })).toBe('1.23')
  })
})
