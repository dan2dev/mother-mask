/**
 * Mask pattern — a single pattern string or an array ordered from shortest to longest.
 * `9` matches a digit, `Z` matches a letter, `A` matches alphanumeric (digit or letter),
 * anything else is a literal character.
 *
 * @example
 * '(99) 99999-9999'
 * ['(99) 9999-9999', '(99) 99999-9999']
 * 'AA.AAA.AAA/AAAA-99'  // CNPJ alfanumérico
 */
export type MaskPattern = string | string[]

/** Result of applying a mask to a value. */
export interface MaskResult {
  readonly value: string
  readonly caret: number
}

/** Options for {@link applyMask} and {@link buildMask}. */
export interface ApplyMaskOptions {
  /**
   * Treat literal separators as hard boundaries between independent fields
   * instead of one continuous digit/character stream. **On by default**: a
   * mask made of independent fields — dates, times, phone area codes — never
   * bleeds digits from one field into a neighboring one when you edit a
   * single field (e.g. the month in "99/99/9999" won't steal a digit from
   * the year).
   *
   * Pass `segmented: false` to opt into the classic flat/reflow behavior
   * instead, where deleting or replacing characters anywhere shifts
   * everything after it to close the gap — useful when a mask really is one
   * continuous number with cosmetic separators (e.g. formatting a running
   * total) rather than independent fields.
   */
  segmented?: boolean
}

/** Options for {@link bind}. */
export interface BindOptions extends ApplyMaskOptions {
  /** Fires with the masked value after paste or keyboard-driven changes. */
  onChange?: (value: string) => void
}

/** Options for {@link applyDecimalMask}, {@link processDecimal}, {@link unmaskDecimal}, {@link formatDecimalValue}, and {@link bindDecimal}. */
export interface DecimalMaskOptions {
  /**
   * Number of fixed fractional digits, zero-padded and always shown once
   * set. Negative/fractional values are floored to `0`. Left unset, the
   * fraction is optional and uncapped: the decimal separator and any digits
   * after it only appear once the user actually types them, and there's no
   * limit on how many digits they can type. @default undefined (optional, unlimited)
   */
  decimalPlaces?: number
  /**
   * Fixed width for the integer part, left-padded with zeros to that width.
   * Digits typed beyond this width are dropped instead of shifting the
   * window — the mirror image of {@link decimalPlaces} for the fraction.
   * Useful for fixed-width segments like a time field (`"00:00"`, hours
   * capped and padded to 2 digits). @default undefined (no limit)
   */
  numberPlaces?: number
  /** Group the integer part into thousands using `separator`. @default true */
  segmented?: boolean
  /** Thousands grouping separator, used when `segmented` is `true`. @default ',' */
  separator?: string
  /** Separator between the integer and fractional parts. @default '.' */
  decimalSeparator?: string
  /** Fixed text prepended to the formatted number (after the sign, if negative). @default '' */
  prefix?: string
  /** Fixed text appended to the formatted number. @default '' */
  suffix?: string
  /** Allow a leading `-` to produce a negative value. @default false */
  allowNegative?: boolean
}

/** Options for {@link bindDecimal}. */
export interface BindDecimalOptions extends DecimalMaskOptions {
  /** Fires with the masked string and its parsed numeric value after paste or keyboard-driven changes. */
  onChange?: (value: string, numericValue: number) => void
}
