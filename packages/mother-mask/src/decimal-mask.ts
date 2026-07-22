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
  decimalPlaces: number
  segmented: boolean
  separator: string
  decimalSeparator: string
  prefix: string
  suffix: string
  allowNegative: boolean
}

/** @internal exported for {@link bindDecimal}'s "." / "," key normalization */
export function resolveDecimalOptions(options?: DecimalMaskOptions): ResolvedDecimalOptions {
  const rawPlaces = options?.decimalPlaces ?? 2
  const decimalPlaces = Number.isFinite(rawPlaces) ? Math.max(0, Math.floor(rawPlaces)) : 2
  return {
    decimalPlaces,
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
// length; only the fraction is fixed-width (`decimalPlaces`), zero-padded on
// the right so a shorter fraction reads as its low-order (trailing) digits
// being zero rather than reflowing/shifting — e.g. editing "423,42" down to
// "423,4" produces "423,40", not "42,34".
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
  const canHaveFraction = opts.decimalPlaces > 0

  for (const ch of raw) {
    if (isDigitChar(ch)) {
      if (inFraction) {
        if (fracDigits.length < opts.decimalPlaces) fracDigits += ch
      } else {
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
  const canHaveFraction = opts.decimalPlaces > 0
  let inFraction = false
  let digitsBefore = 0

  for (let i = 0; i < caret; i++) {
    const ch = raw[i]
    if (isDigitChar(ch)) {
      if (!inFraction || digitsBefore < opts.decimalPlaces) digitsBefore++
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
 * typed, and is always displayed zero-padded to `decimalPlaces` width.
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
  const groupedInt = opts.segmented ? groupThousands(intPart, opts.separator) : intPart
  const fracPadded = opts.decimalPlaces > 0 ? fracDigits.padEnd(opts.decimalPlaces, '0') : ''
  const numberStr = groupedInt + (opts.decimalPlaces > 0 ? opts.decimalSeparator + fracPadded : '')
  const signStr = isNegative ? '-' : ''
  const output = signStr + opts.prefix + numberStr + opts.suffix

  const clampedCaret = Math.max(0, Math.min(inputCaret, value.length))
  const { inFraction, digitsBefore } = locateCaretSegment(value, clampedCaret, opts)
  const prefixLen = signStr.length + opts.prefix.length
  const caret = inFraction
    ? prefixLen + groupedInt.length + opts.decimalSeparator.length + digitsBefore
    : prefixLen + caretForDigitsBefore(groupedInt, digitsBefore)

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
 * Every reformat re-appends `decimalSeparator` whenever `decimalPlaces > 0`,
 * so its absence from `value` is an unambiguous signal that this exact
 * keystroke just deleted it — no "value before this keystroke" snapshot is
 * needed. Returns `null` when there's nothing to restore (the separator is
 * still present, `decimalPlaces` is `0`, or too few digits remain), so the
 * caller falls through to a plain {@link applyDecimalMask} call.
 */
export function applyDecimalMaskUnmergingSeparator(
  value: string,
  options?: DecimalMaskOptions,
): MaskResult | null {
  const opts = resolveDecimalOptions(options)
  if (opts.decimalPlaces <= 0) return null

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
 * Special-cases typing a single digit into a field whose integer part is
 * exactly the auto-inserted "0" placeholder: the new digit replaces that
 * zero instead of combining with it — e.g. "$0.00" with the caret anywhere
 * against that lone "0" and typing "2" gives "$2.00", not "$20.00"/"$02.00".
 * Any already-typed fraction is preserved.
 *
 * `value`/`caret` must be the state *after* the browser has already
 * inserted `digit` at `caret - 1` (the same post-insertion snapshot
 * `applyDecimalMask` itself expects from `bindDecimal`). Returns `null`
 * when the pattern doesn't apply — either the integer part has real digits
 * already, or the caret wasn't against that lone zero — so the caller falls
 * through to a plain {@link applyDecimalMask} call.
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
  if (intDigits !== '0') return null

  const prefixLen = (isNegative ? 1 : 0) + opts.prefix.length
  if (insertIdx < prefixLen || insertIdx > prefixLen + 1) return null

  const signPart = isNegative ? '-' : ''
  const raw = signPart + digit + (hasSeparator ? opts.decimalSeparator + fracDigits : '')
  return applyDecimalMask(raw, signPart.length + 1, opts)
}

/** Format a plain JS number into its masked display string. */
export function formatDecimalValue(value: number, options?: DecimalMaskOptions): string {
  const opts = resolveDecimalOptions(options)
  if (!Number.isFinite(value)) return ''

  const isNegative = opts.allowNegative && value < 0
  const fixed = Math.abs(value).toFixed(opts.decimalPlaces)
  const dotIdx = fixed.indexOf('.')
  const intRaw = dotIdx === -1 ? fixed : fixed.slice(0, dotIdx)
  const fracPart = dotIdx === -1 ? '' : fixed.slice(dotIdx + 1)
  const intPart = stripLeadingZeros(intRaw || '0')

  const groupedInt = opts.segmented ? groupThousands(intPart, opts.separator) : intPart
  const numberStr = groupedInt + (opts.decimalPlaces > 0 ? opts.decimalSeparator + fracPart : '')

  return (isNegative ? '-' : '') + opts.prefix + numberStr + opts.suffix
}
