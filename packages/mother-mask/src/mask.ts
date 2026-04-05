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

// ---------------------------------------------------------------------------
// Character classification (no regex — avoids the empty-string pitfall)
// ---------------------------------------------------------------------------

function isDigitChar(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

function isLetterChar(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
}

function matchesSlot(ch: string, slot: string): boolean {
  if (slot === '9') return isDigitChar(ch)
  if (slot === 'Z') return isLetterChar(ch)
  // slot === 'A' → alphanumeric
  return isDigitChar(ch) || isLetterChar(ch)
}

// ---------------------------------------------------------------------------
// Mask resolution
// ---------------------------------------------------------------------------

/** Select the right mask string for the current value length. */
function resolveMask(value: string, mask: MaskPattern): string {
  if (!Array.isArray(mask)) return mask
  let i = 0
  while (i < mask.length - 1 && value.length > mask[i].length) i++
  return mask[i]
}

/** Maximum allowed input length for the given mask. */
export function getMaxLength(mask: MaskPattern): number {
  if (Array.isArray(mask)) {
    return mask.length > 0 ? Math.max(...mask.map((m) => m.length)) : 0
  }
  return mask.length
}

// ---------------------------------------------------------------------------
// Core masking — pure function
// ---------------------------------------------------------------------------

/**
 * Apply a single mask string to a value, producing the masked output and
 * a computed caret position.
 *
 * **Caret algorithm**: as the mask consumes characters from `value`, every
 * time a *matching* input character at a position *before* `inputCaret` is
 * written to the output (including any preceding pending literals that were
 * just flushed), the output caret is updated to the current output length.
 * This correctly handles literal insertion, middle-of-string edits, and
 * characters that are skipped because they don't match the current slot.
 */
export function applyMask(value: string, mask: string, inputCaret = 0): MaskResult {
  if (!value) return { value: '', caret: 0 }

  let output = ''
  let pending = ''
  let valueIdx = 0
  let outputCaret = 0
  let caretResolved = false

  for (let maskIdx = 0; maskIdx < mask.length; maskIdx++) {
    const maskCh = mask[maskIdx]

    if (maskCh !== '9' && maskCh !== 'Z' && maskCh !== 'A') {
      pending += maskCh
      continue
    }

    // Find next value character that matches this slot
    let found = false
    while (valueIdx < value.length) {
      const ch = value[valueIdx++]

      if (matchesSlot(ch, maskCh)) {
        // Flush pending literals then write the matched char
        output += pending + ch
        pending = ''
        found = true

        // Caret tracking: if this consumed char was before the input caret,
        // the output caret is (at least) at the current output length.
        if (!caretResolved) {
          if (valueIdx <= inputCaret) {
            outputCaret = output.length
          } else {
            caretResolved = true
          }
        }
        break
      }
      // Non-matching chars are silently skipped (iterative, no recursion).
    }

    if (!found) break
  }

  // If every matched char was before the input caret (or no chars matched at
  // all past the caret), place the output caret at the end of the output.
  if (!caretResolved) outputCaret = output.length

  return { value: output, caret: outputCaret }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Low-level mask processor. Tracks caret position after masking. */
export class Mask {
  /** Caret position after `process()` runs. */
  caret: number

  private readonly _value: string
  private readonly _mask: string

  constructor(value: string, mask: string, caret = 0) {
    this._value = value
    this._mask = mask
    this.caret = caret
  }

  /** Apply the mask to the value and return the masked string. */
  process(): string {
    const result = applyMask(this._value, this._mask, this.caret)
    this.caret = result.caret
    return result.value
  }
}

/** Build a `Mask` instance, resolving array patterns by value length. */
export function buildMask(value: string, mask: MaskPattern, caret = 0): Mask {
  return new Mask(value, resolveMask(value, mask), caret)
}

/** Apply a mask pattern to a raw value string and return the masked result. */
export function process(value: string, mask: MaskPattern): string {
  return buildMask(value, mask).process()
}
