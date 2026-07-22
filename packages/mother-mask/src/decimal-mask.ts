import type { DecimalMaskOptions, MaskResult } from './types'

// ---------------------------------------------------------------------------
// Character classification (no regex — mirrors apply-mask.ts)
// ---------------------------------------------------------------------------

function isDigitChar(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

// ---------------------------------------------------------------------------
// Option resolution
// ---------------------------------------------------------------------------

interface ResolvedDecimalOptions {
  /**
   * `undefined` means an optional, uncapped fraction (default) — the
   * decimal separator and fraction only appear once the user actually types
   * them, and there's no limit on how many digits follow. `0` means no
   * fraction at all. A positive number is a fixed, zero-padded width that's
   * always shown, even before the user types anything.
   */
  decimalPlaces: number | undefined
  /** `undefined` means unlimited (default) — the integer part grows freely. */
  numberPlaces: number | undefined
  segmented: boolean
  separator: string
  decimalSeparator: string
  prefix: string
  suffix: string
  allowNegative: boolean
}

/** @internal exported for {@link bindDecimal}'s "." / "," key normalization */
export function resolveDecimalOptions(options?: DecimalMaskOptions): ResolvedDecimalOptions {
  const rawPlaces = options?.decimalPlaces
  const decimalPlaces =
    rawPlaces != null && Number.isFinite(rawPlaces) ? Math.max(0, Math.floor(rawPlaces)) : undefined
  const rawNumberPlaces = options?.numberPlaces
  const numberPlaces =
    rawNumberPlaces != null && Number.isFinite(rawNumberPlaces)
      ? Math.max(1, Math.floor(rawNumberPlaces))
      : undefined
  return {
    decimalPlaces,
    numberPlaces,
    segmented: options?.segmented ?? true,
    separator: options?.separator ?? ',',
    decimalSeparator: options?.decimalSeparator ?? '.',
    prefix: options?.prefix ?? '',
    suffix: options?.suffix ?? '',
    allowNegative: options?.allowNegative ?? false,
  }
}

// ---------------------------------------------------------------------------
// Digit-stream helpers
// ---------------------------------------------------------------------------

/** Strip leading zeros from a digit string, always keeping at least one digit. */
function stripLeadingZeros(s: string): string {
  let i = 0
  while (i < s.length - 1 && s[i] === '0') i++
  return s.slice(i)
}

/** Insert `sep` every 3 digits from the right (e.g. "1234567" → "1,234,567"). */
function groupThousands(s: string, sep: string): string {
  if (!sep || s.length <= 3) return s
  const parts: string[] = []
  let i = s.length
  while (i > 3) {
    parts.unshift(s.slice(i - 3, i))
    i -= 3
  }
  parts.unshift(s.slice(0, i))
  return parts.join(sep)
}

/**
 * Find the position in `s` that leaves exactly `digitsBefore` digit
 * characters preceding it — the position immediately after that digit and
 * before any subsequent literal (grouping separator, ...), so the caret
 * stays glued to the last digit the user placed there.
 */
function caretForDigitsBefore(s: string, digitsBefore: number): number {
  if (digitsBefore <= 0) return 0
  let count = 0
  for (let i = 0; i < s.length; i++) {
    if (isDigitChar(s[i])) {
      count++
      if (count === digitsBefore) return i + 1
    }
  }
  return s.length
}

// ---------------------------------------------------------------------------
// Segmented parsing — integer digits before the decimal separator, fraction
// digits after. Unlike a slot-pattern mask, the integer segment has no fixed
// length. The fraction is only fixed-width when `decimalPlaces` is set to a
// positive number — zero-padded on the right so a shorter fraction reads as
// its low-order (trailing) digits being zero rather than reflowing/shifting
// (e.g. editing "423,42" down to "423,4" produces "423,40", not "42,34").
// When `decimalPlaces` is left unset, the fraction is optional and uncapped:
// it only exists once the user types the separator, and grows to however
// many digits they type.
//
// The decimal separator only has meaning as the *first* occurrence of
// `opts.decimalSeparator`; every other non-digit character (thousands
// separator, prefix/suffix text, a second stray separator, ...) is noise and
// is dropped. This keeps re-parsing an already-masked value idempotent.
// ---------------------------------------------------------------------------

interface DecimalParts {
  isNegative: boolean
  intDigits: string
  fracDigits: string
  hasSeparator: boolean
}

function computeDecimalParts(raw: string, opts: ResolvedDecimalOptions): DecimalParts {
  let intDigits = ''
  let fracDigits = ''
  let isNegative = false
  let inFraction = false
  const canHaveFraction = opts.decimalPlaces !== 0

  for (const ch of raw) {
    if (isDigitChar(ch)) {
      if (inFraction) {
        if (opts.decimalPlaces == null || fracDigits.length < opts.decimalPlaces) fracDigits += ch
      } else if (opts.numberPlaces == null || intDigits.length < opts.numberPlaces) {
        intDigits += ch
      }
      continue
    }
    if (canHaveFraction && !inFraction && ch === opts.decimalSeparator) {
      inFraction = true
      continue
    }
    if (ch === '-' && opts.allowNegative) isNegative = true
    // Anything else — thousands separator, prefix/suffix text, a repeated
    // separator, stray letters — is noise and is dropped.
  }

  return { isNegative, intDigits, fracDigits, hasSeparator: inFraction }
}

/**
 * Walk `raw[0:caret]` to find which segment the caret sits in (integer or
 * fraction) and how many digits of that segment precede it, so the same
 * position can be re-derived in the freshly formatted output.
 */
function locateCaretSegment(
  raw: string,
  caret: number,
  opts: ResolvedDecimalOptions,
): { inFraction: boolean; digitsBefore: number } {
  const canHaveFraction = opts.decimalPlaces !== 0
  let inFraction = false
  let digitsBefore = 0

  for (let i = 0; i < caret; i++) {
    const ch = raw[i]
    if (isDigitChar(ch)) {
      if (inFraction) {
        if (opts.decimalPlaces == null || digitsBefore < opts.decimalPlaces) digitsBefore++
      } else if (opts.numberPlaces == null || digitsBefore < opts.numberPlaces) {
        digitsBefore++
      }
      continue
    }
    if (canHaveFraction && !inFraction && ch === opts.decimalSeparator) {
      inFraction = true
      digitsBefore = 0
    }
  }

  return { inFraction, digitsBefore }
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

/**
 * Apply a decimal/currency mask to a value, producing the masked output and
 * a computed caret position. Digits typed before the decimal separator
 * extend the integer part; the fraction only starts once the separator is
 * typed. With a fixed `decimalPlaces` it's always displayed zero-padded to
 * that width, even before the user types it; left unset, the fraction is
 * optional — it only appears once the separator is typed, and is shown
 * exactly as typed (no padding, no cap on how many digits).
 */
export function applyDecimalMask(
  value: string,
  inputCaret = 0,
  options?: DecimalMaskOptions,
): MaskResult {
  const opts = resolveDecimalOptions(options)
  if (!value) return { value: '', caret: 0 }

  const { isNegative, intDigits, fracDigits, hasSeparator } = computeDecimalParts(value, opts)
  if (intDigits === '' && fracDigits === '' && !hasSeparator) return { value: '', caret: 0 }

  const intPart = stripLeadingZeros(intDigits || '0')
  const paddedInt = opts.numberPlaces != null ? intPart.padStart(opts.numberPlaces, '0') : intPart
  const groupedInt = opts.segmented ? groupThousands(paddedInt, opts.separator) : paddedInt
  const fracPadded =
    opts.decimalPlaces != null && opts.decimalPlaces > 0
      ? fracDigits.padEnd(opts.decimalPlaces, '0')
      : fracDigits
  const showFraction = opts.decimalPlaces === 0 ? false : opts.decimalPlaces != null || hasSeparator
  const numberStr = groupedInt + (showFraction ? opts.decimalSeparator + fracPadded : '')
  const signStr = isNegative ? '-' : ''
  const output = signStr + opts.prefix + numberStr + opts.suffix

  const clampedCaret = Math.max(0, Math.min(inputCaret, value.length))
  const { inFraction, digitsBefore } = locateCaretSegment(value, clampedCaret, opts)
  const prefixLen = signStr.length + opts.prefix.length
  // Left-padding zeros are synthetic — prepended ahead of every real typed
  // digit — so they shift where the caret's `digitsBefore`-th real digit
  // lands in `groupedInt` by the padding's width.
  const padLength = paddedInt.length - intPart.length
  const caret = inFraction
    ? prefixLen + groupedInt.length + opts.decimalSeparator.length + digitsBefore
    : prefixLen + caretForDigitsBefore(groupedInt, digitsBefore + padLength)

  return { value: output, caret }
}

/** Apply a decimal mask to a raw value and return just the masked string. */
export function processDecimal(value: string, options?: DecimalMaskOptions): string {
  return applyDecimalMask(value, value.length, options).value
}

/**
 * Parse a raw or already-masked decimal value back into a JS number.
 * Ignores prefix/suffix/thousands separator; returns `0` for an empty or
 * digit-less value.
 */
export function unmaskDecimal(value: string, options?: DecimalMaskOptions): number {
  const opts = resolveDecimalOptions(options)
  const { isNegative, intDigits, fracDigits } = computeDecimalParts(value, opts)
  const n = Number(fracDigits ? `${intDigits || '0'}.${fracDigits}` : intDigits || '0')
  return isNegative ? -n : n
}

/**
 * After a Backspace removes the decimal separator itself, the integer and
 * fraction digit runs collapse into one continuous stream (e.g. "25.00"
 * with the caret right after "." → Backspace deletes the "." → "2500").
 * Left alone, that reads as one big integer ("$2,500.00"). This restores
 * the segment boundary instead: the trailing `decimalPlaces` digits are
 * still the fraction, and the digit right before them — the one that used
 * to sit at the end of the integer part — is the one Backspace actually
 * removed, so it's dropped (not kept) — "$25.00" → "$2.00".
 *
 * Only applies when `decimalPlaces` is a fixed positive number — that's
 * what "the trailing N digits are the fraction" means. Every reformat
 * re-appends `decimalSeparator` in that case, so its absence from `value`
 * is an unambiguous signal that this exact keystroke just deleted it — no
 * "value before this keystroke" snapshot is needed. With `decimalPlaces`
 * unset (optional, uncapped fraction) there's no fixed width to reconstruct
 * from, so the merged digits are left as one continuous integer instead —
 * the same reasoning `numberPlaces` uses for an unbounded integer part.
 * Returns `null` when there's nothing to restore (the separator is still
 * present, `decimalPlaces` is `0` or unset, or too few digits remain), so
 * the caller falls through to a plain {@link applyDecimalMask} call.
 */
export function applyDecimalMaskUnmergingSeparator(
  value: string,
  options?: DecimalMaskOptions,
): MaskResult | null {
  const opts = resolveDecimalOptions(options)
  if (opts.decimalPlaces == null || opts.decimalPlaces <= 0) return null

  const { isNegative, intDigits, hasSeparator } = computeDecimalParts(value, opts)
  if (hasSeparator || intDigits.length < opts.decimalPlaces + 1) return null

  const preMergeIntLength = intDigits.length - opts.decimalPlaces
  const fracDigits = intDigits.slice(preMergeIntLength)
  const remainingInt = intDigits.slice(0, preMergeIntLength - 1)

  const signPart = isNegative ? '-' : ''
  const raw = signPart + remainingInt + opts.decimalSeparator + fracDigits
  return applyDecimalMask(raw, signPart.length + remainingInt.length, opts)
}

/**
 * Special-cases typing a single digit into an integer segment that isn't
 * yet full of *real* digits — either because it's still the auto-inserted
 * zero placeholder ("0", or a wider "00" from a `numberPlaces`-padded field
 * that hasn't been touched), or because `numberPlaces` is left-padding a
 * partially-typed segment with synthetic zeros (e.g. "02" is really just
 * the one real digit "2", padded out to width 2 for display). Those padding
 * zeros aren't editable content, so the new digit extends the real digit
 * stream instead of combining with a padding zero at the caret:
 *
 * - "$0.00" + "2" → "$2.00" (not "$20.00")
 * - a `numberPlaces: 2` time field's untouched "00:00" + "5" → "05:00"
 * - that same field's "02:00" (one real digit, one padding zero) + "4" →
 *   "24:00" — the real "2" is kept, the padding "0" is not
 *
 * A segment that's already full of real digits — e.g. "23:00", both digits
 * genuinely typed — doesn't match here and falls through to the default
 * {@link applyDecimalMask}, which already drops the overflow keystroke
 * (typing a 3rd real digit leaves "23:00" unchanged).
 *
 * `value`/`caret` must be the state *after* the browser has already
 * inserted `digit` at `caret - 1` (the same post-insertion snapshot
 * `applyDecimalMask` itself expects from `bindDecimal`). Returns `null`
 * when the pattern doesn't apply, so the caller falls through to a plain
 * {@link applyDecimalMask} call.
 */
export function applyDecimalMaskReplacingLoneZero(
  value: string,
  caret: number,
  digit: string,
  options?: DecimalMaskOptions,
): MaskResult | null {
  const opts = resolveDecimalOptions(options)
  const insertIdx = caret - 1
  if (insertIdx < 0 || value[insertIdx] !== digit) return null

  const withoutDigit = value.slice(0, insertIdx) + value.slice(caret)
  const { isNegative, intDigits, fracDigits, hasSeparator } = computeDecimalParts(withoutDigit, opts)

  const realDigits = stripLeadingZeros(intDigits || '0')
  const hasRealDigits = realDigits !== '0'
  const hasPaddingRoom =
    hasRealDigits && opts.numberPlaces != null && realDigits.length < opts.numberPlaces
  if (hasRealDigits && !hasPaddingRoom) return null

  const prefixLen = (isNegative ? 1 : 0) + opts.prefix.length
  if (insertIdx < prefixLen || insertIdx > prefixLen + intDigits.length) return null

  const signPart = isNegative ? '-' : ''
  const newIntDigits = (hasRealDigits ? realDigits : '') + digit
  const raw = signPart + newIntDigits + (hasSeparator ? opts.decimalSeparator + fracDigits : '')
  return applyDecimalMask(raw, signPart.length + newIntDigits.length, opts)
}

/**
 * Format a plain JS number into its masked display string. With a fixed
 * `decimalPlaces` the fraction is rounded/padded to that exact width, even
 * for a whole number; left unset, the fraction is only shown when the value
 * actually has one, with as many digits as `value` naturally carries (no
 * padding, no rounding).
 */
export function formatDecimalValue(value: number, options?: DecimalMaskOptions): string {
  const opts = resolveDecimalOptions(options)
  if (!Number.isFinite(value)) return ''

  const isNegative = opts.allowNegative && value < 0
  const abs = Math.abs(value)
  const fixed = opts.decimalPlaces != null ? abs.toFixed(opts.decimalPlaces) : String(abs)
  const dotIdx = fixed.indexOf('.')
  const intRaw = dotIdx === -1 ? fixed : fixed.slice(0, dotIdx)
  const fracPart = dotIdx === -1 ? '' : fixed.slice(dotIdx + 1)
  const intPart = stripLeadingZeros(intRaw || '0')
  const paddedInt = opts.numberPlaces != null ? intPart.padStart(opts.numberPlaces, '0') : intPart

  const groupedInt = opts.segmented ? groupThousands(paddedInt, opts.separator) : paddedInt
  const showFraction = opts.decimalPlaces === 0 ? false : fracPart !== ''
  const numberStr = groupedInt + (showFraction ? opts.decimalSeparator + fracPart : '')

  return (isNegative ? '-' : '') + opts.prefix + numberStr + opts.suffix
}
