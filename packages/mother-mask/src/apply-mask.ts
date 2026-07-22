import type { ApplyMaskOptions, MaskResult } from './types'

// ---------------------------------------------------------------------------
// Character classification (no regex — avoids the empty-string pitfall)
// ---------------------------------------------------------------------------

function isDigitChar(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

function isLetterChar(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
}

function isSlotChar(ch: string): boolean {
  return ch === '9' || ch === 'Z' || ch === 'A'
}

function matchesSlot(ch: string, slot: string): boolean {
  if (slot === '9') return isDigitChar(ch)
  if (slot === 'Z') return isLetterChar(ch)
  // slot === 'A' → alphanumeric
  return isDigitChar(ch) || isLetterChar(ch)
}

// ---------------------------------------------------------------------------
// Flat masking (default) — treats the mask as one continuous character
// stream. Best for continuous identifiers (phone numbers, CPF/CNPJ, credit
// cards) where deleting/inserting a digit anywhere is expected to reflow
// every digit after it — this is the classic mother-mask behavior and is
// relied on by the majority of the test suite (paste, backspace, mid-string
// insert, etc).
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
function applyFlatMask(value: string, mask: string, inputCaret: number): MaskResult {
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
// Segmented masking (opt-in) — treats literal separators as hard boundaries
// between independent fields (e.g. day/month/year in "99/99/9999"). Editing
// one segment never bleeds characters into a neighboring one, so replacing
// the "12" in "25/12/2025" with a shorter or longer value keeps the year
// exactly where it is instead of shifting digits across the "/".
// ---------------------------------------------------------------------------

type MaskToken = { kind: 'literal'; text: string } | { kind: 'slots'; chars: string }

// A bound input re-applies the same (static) mask string on every keystroke,
// so tokenizing it is pure, repeated work — cache by mask string instead of
// re-walking and re-allocating tokens on every keystroke.
const tokenCache = new Map<string, MaskToken[]>()

/**
 * Split a mask into alternating literal and slot-run tokens (e.g. "99/99/9999"
 * → slots"99", literal"/", slots"99", literal"/", slots"9999"), so the masking
 * pass can reason about segment boundaries instead of a flat character stream.
 */
function tokenizeMask(mask: string): MaskToken[] {
  const cached = tokenCache.get(mask)
  if (cached) return cached

  const tokens: MaskToken[] = []
  let i = 0
  while (i < mask.length) {
    const start = i
    const wantSlots = isSlotChar(mask[i])
    while (i < mask.length && isSlotChar(mask[i]) === wantSlots) i++
    const text = mask.slice(start, i)
    tokens.push(wantSlots ? { kind: 'slots', chars: text } : { kind: 'literal', text })
  }
  tokenCache.set(mask, tokens)
  return tokens
}

/** Total slot capacity from token index `from` (inclusive) to the end of `tokens`. */
function slotCapacityFrom(tokens: MaskToken[], from: number): number {
  let capacity = 0
  for (let i = from; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.kind === 'slots') capacity += token.chars.length
  }
  return capacity
}

/** Count of remaining slot-matchable (digit/letter) characters in `value` from `fromIdx` onward. */
function remainingDataChars(value: string, fromIdx: number): number {
  let count = 0
  for (let i = fromIdx; i < value.length; i++) {
    const ch = value[i]
    if (isDigitChar(ch) || isLetterChar(ch)) count++
  }
  return count
}

/**
 * Same contract as {@link applyFlatMask}, but walks the mask one *segment* at
 * a time (a run of slots, or a literal) rather than one character at a time.
 * The rule that keeps an edit inside a segment from crossing into its
 * neighbor is an **early stop**: if the value hits the literal that ends the
 * current slot run before all of that run's slots are filled (e.g. only one
 * digit typed into a two-digit month slot), the run is left partially filled
 * instead of skipping past the separator to steal a digit from the next
 * segment.
 *
 * That stop is only taken when it's actually safe — i.e. every character
 * still to come in `value` fits in the slot capacity that remains *after*
 * this segment. If stopping here would strand more data than the rest of
 * the mask can hold (e.g. pasting into a later segment while an earlier one
 * still sits under-filled from before), the "separator" is treated as stray
 * noise instead and skipped, letting this segment take the extra slot it
 * needs so nothing at the end gets silently dropped. This is also what lets
 * an array mask grow or shrink its pattern (moving every literal after the
 * change point) reflow correctly instead of losing a digit at the boundary.
 */
function applySegmentedMask(value: string, mask: string, inputCaret: number): MaskResult {
  const tokens = tokenizeMask(mask)

  let output = ''
  let pending = ''
  let valueIdx = 0
  let outputCaret = 0
  let caretResolved = false
  let exhausted = false

  for (let t = 0; t < tokens.length && !exhausted; t++) {
    const token = tokens[t]

    if (token.kind === 'literal') {
      pending += token.text
      if (value.startsWith(token.text, valueIdx)) valueIdx += token.text.length
      continue
    }

    const nextToken = tokens[t + 1]
    const capacityAfter = slotCapacityFrom(tokens, t + 1)

    for (let s = 0; s < token.chars.length; s++) {
      const slotCh = token.chars[s]
      let found = false

      while (valueIdx < value.length) {
        const ch = value[valueIdx]

        if (matchesSlot(ch, slotCh)) {
          valueIdx++
          output += pending + ch
          pending = ''
          found = true

          if (!caretResolved) {
            if (valueIdx <= inputCaret) {
              outputCaret = output.length
            } else {
              caretResolved = true
            }
          }
          break
        }

        // This segment's ending separator showed up before the run filled.
        // Stopping here is only safe if the rest of the value still fits in
        // whatever slot capacity remains after this segment — otherwise
        // stopping would strand data, so fall through and skip this char as
        // noise instead, letting the segment take the slot it needs.
        if (
          nextToken?.kind === 'literal' &&
          value.startsWith(nextToken.text, valueIdx) &&
          remainingDataChars(value, valueIdx) <= capacityAfter
        ) {
          break
        }

        valueIdx++ // stray/noise char — skip it
      }

      if (!found) {
        if (valueIdx >= value.length) exhausted = true
        break
      }
    }
  }

  if (!caretResolved) outputCaret = output.length

  return { value: output, caret: outputCaret }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function applyMask(
  value: string,
  mask: string,
  inputCaret = 0,
  options?: ApplyMaskOptions,
): MaskResult {
  if (!value) return { value: '', caret: 0 }
  return options?.segmented === false
    ? applyFlatMask(value, mask, inputCaret)
    : applySegmentedMask(value, mask, inputCaret)
}
