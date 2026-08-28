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
   * Separators surviving in the value are read as positional anchors, so an
   * edit that wipes out whole fields still leaves the rest where it was: with
   * `"999.999.999-99"`, selecting `"012.153.441"` out of `"012.153.441-39"`
   * and typing `"015"` gives `"015.-39"` — the `-` keeps `"39"` in the last
   * field — rather than repacking every digit from the left into `"015.39"`.
   * Separators around fields that end up empty are dropped, unless keeping
   * one is what tells the *next* keystroke where the text after it belongs.
   *
   * Anchoring can only be as precise as the separators allow. A mask whose
   * separators are all the same character (`"99/99/9999"`) can leave a
   * genuinely ambiguous value — `"1/2025"` reads equally well as
   * `1 / 20 / 25` — and resolves it to the earliest field that fits. Masks
   * with distinct separators (CPF, CNPJ, phone numbers) have no such gap.
   *
   * Pass `segmented: false` to opt into the classic flat/reflow behavior
   * instead, where deleting or replacing characters anywhere shifts
   * everything after it to close the gap — useful when a mask really is one
   * continuous number with cosmetic separators (e.g. formatting a running
   * total) rather than independent fields.
   */
  segmented?: boolean
  /**
   * Reveal upcoming literal separators before the user has typed the
   * character that would normally trigger them. **On by default**: once a
   * segment's slots are completely filled, the mask immediately appends
   * whatever fixed literal(s) come next — so typing `"25"` into
   * `"99/99/9999"` shows `"25/"` right away instead of waiting for the first
   * digit of the next segment.
   *
   * Only ever appends the literal that directly follows the segment just
   * completed — it never skips ahead past a segment the user hasn't filled
   * in yet — and only at the tail of the current value, so editing an
   * earlier segment of an already-complete value is unaffected.
   *
   * `bind()` also never lets eager resurrect a literal the user just
   * removed with Backspace/Delete — deleting the eagerly-added "." off
   * "012." leaves "012", not "012." again, even though `applyMask` alone
   * (given only the resulting value and caret, with no memory of *how* it
   * got there) can't distinguish that from three fresh digits. `applyMask`/
   * `buildMask`/`process` are pure functions of `(value, caret)`, so this
   * distinction is necessarily a `bind()`-only behavior, not something a
   * one-off `applyMask` call can offer.
   *
   * Pass `eager: false` to opt out and wait for the next real character
   * instead.
   */
  eager?: boolean
}

/** Options for {@link bind}. */
export interface BindOptions extends ApplyMaskOptions {
  /** Fires with the masked value after input, paste, or keyboard-driven changes. */
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
  /**
   * Fixed text prepended to the formatted number (after the sign, if
   * negative). Inert: it is chrome, not content. A character typed with the
   * caret parked before or inside it is treated as typed at the start of the
   * number — clicking the far left of `"$0.00"` and typing `"2"` gives
   * `"$2.00"`, exactly as it would one position to the right — and its own
   * text is never read back as part of the number, so a prefix carrying a
   * digit or the decimal separator (`"Q1 "`, `"No. "`) stays out of the
   * value. @default ''
   */
  prefix?: string
  /**
   * Fixed text appended to the formatted number. Inert in the same way
   * {@link DecimalMaskOptions.prefix} is: typing with the caret inside or
   * past it lands the character at the end of the number, and its text never
   * contributes digits. @default ''
   */
  suffix?: string
  /** Allow a leading `-` to produce a negative value. @default false */
  allowNegative?: boolean
}

/** Options for {@link bindDecimal}. */
export interface BindDecimalOptions extends DecimalMaskOptions {
  /** Fires with the masked string and its parsed numeric value after input, paste, or keyboard-driven changes. */
  onChange?: (value: string, numericValue: number) => void
}
