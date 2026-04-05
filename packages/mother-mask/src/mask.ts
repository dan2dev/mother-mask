import { applyMask } from './apply-mask'
import { resolveMask } from './pattern'
import type { MaskPattern } from './types'

export { getMaxLength } from './pattern'

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
