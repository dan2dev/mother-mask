/**
 * Mask pattern — a single pattern string or an array ordered from shortest to longest.
 * `9` matches an ASCII digit, `Z` an ASCII letter, `A` ASCII alphanumeric.
 * Custom tokens extend/override these locally. Backslash escapes a token or
 * another backslash; other characters are literal.
 *
 * @example
 * '(99) 99999-9999'
 * ['(99) 9999-9999', '(99) 99999-9999']
 * 'AA.AAA.AAA/AAAA-99'  // CNPJ alfanumérico
 */
export type MaskPattern = string | string[]

/** Receives one Unicode code point. RegExp lastIndex is never read or modified. */
export type TokenMatcher = RegExp | ((char: string) => boolean)

export interface MaskTokenDefinition {
  match: TokenMatcher
  /** Must return exactly one code point; use an idempotent, match-preserving transform. */
  transform?: (char: string) => string
}

/** Single-code-point keys; backslash is reserved for escaping. Overrides are local. */
export type MaskTokens = Record<string, TokenMatcher | MaskTokenDefinition>

/** Called once per application with the candidate data, before slot transformations. */
export type MaskResolver = (value: string) => MaskPattern

/** Result of applying a mask to a value. */
export interface MaskResult {
  readonly value: string
  /** UTF-16 offset, as used by DOM selectionStart/selectionEnd. */
  readonly caret: number
}

/** Options shared by applyMask, buildMask, process, and bind. */
export interface ApplyMaskOptions {
  /** Additional/overridden tokens, scoped to this operation or binding. */
  tokens?: MaskTokens
  /** Resolve from code points accepted by slots in the fallback mask(s).
   * Complete fallback literals (including escaped runs) and nonmatching text are removed.
   * Resolver masks format this continuous stream, without retaining old separators.
   */
  resolveMask?: MaskResolver
  /**
   * Treat literal separators as hard boundaries between independent fields
   * instead of one continuous digit/character stream. For static patterns/arrays;
   * resolver masks always reflow their continuous candidate data. **On by default**: a
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
   * Existing separators before later populated fields survive when a field
   * becomes empty: deleting "222" from "(111) 222-3333" leaves "(111) -3333".
   * Separators removed by an edit are not invented unless anchoring or eager
   * rendering needs them; trailing separators still follow the eager option.
   *
   * Anchoring can only be as precise as the separators allow. A mask whose
   * separators are all the same character (`"99/99/9999"`) can leave a
   * genuinely ambiguous value — `"1/2025"` reads equally well as
   * `1 / 20 / 25` — and resolves it to the earliest field that fits. Masks
   * with distinct separators (CPF, CNPJ, phone numbers) have no such gap.
   *
   * A selection Backspace/Delete/Cut can take a field's separator with it
   * along with its data — selecting `"(11) "` out of `"(11) 98765-4321"`
   * removes the area code, its closing paren, *and* the space. `bind()`
   * restores that separator before masking, so the untouched `"98765-4321"`
   * stays put instead of sliding into the emptied field. Like eager's
   * Backspace/Delete handling above, this is necessarily `bind()`-only:
   * `applyMask`/`buildMask`/`process` see only `(value, caret)` and can't
   * tell a deletion from fresh input. Word/line deletes and ordered mask
   * arrays are excluded — see the "Segmented Editing" section of the README.
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
