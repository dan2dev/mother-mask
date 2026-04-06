import type { MaskPattern } from './types'

/**
 * Count alphanumeric characters in a value.
 *
 * Used by `resolveMask` so that both raw input (e.g. "11999887766") and
 * already-masked values (e.g. "(11) 99988-7766") produce the same data-char
 * count, enabling correct mask selection even when all keystrokes arrive
 * before the first rAF fires (fast typing).
 */
function countDataChars(value: string): number {
  let n = 0
  for (const ch of value) {
    if (
      (ch >= '0' && ch <= '9') ||
      (ch >= 'a' && ch <= 'z') ||
      (ch >= 'A' && ch <= 'Z')
    )
      n++
  }
  return n
}

/** Count input slots (9, Z, A) in a mask string. */
function countMaskSlots(mask: string): number {
  let n = 0
  for (const ch of mask) {
    if (ch === '9' || ch === 'Z' || ch === 'A') n++
  }
  return n
}

/**
 * Select the right mask string for the current value.
 *
 * Compares the number of alphanumeric data characters in `value` to the
 * slot capacity of each candidate mask.  This correctly handles both
 * progressively-masked values (normal typing) and raw accumulated characters
 * (fast typing where multiple keystrokes arrive before any rAF fires).
 */
export function resolveMask(value: string, mask: MaskPattern): string {
  if (!Array.isArray(mask)) return mask
  const dataCount = countDataChars(value)
  let i = 0
  while (i < mask.length - 1 && dataCount > countMaskSlots(mask[i])) i++
  return mask[i]
}

/** Maximum allowed input length for the given mask. */
export function getMaxLength(mask: MaskPattern): number {
  if (Array.isArray(mask)) {
    return mask.length > 0 ? Math.max(...mask.map((m) => m.length)) : 0
  }
  return mask.length
}
