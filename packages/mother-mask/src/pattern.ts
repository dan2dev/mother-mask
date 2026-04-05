import type { MaskPattern } from './types'

/** Select the right mask string for the current value length. */
export function resolveMask(value: string, mask: MaskPattern): string {
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
