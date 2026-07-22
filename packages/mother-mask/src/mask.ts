import { applyMask } from './apply-mask'
import { resolveMask } from './pattern'
import type { ApplyMaskOptions, MaskPattern } from './types'

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
  private readonly _options: ApplyMaskOptions | undefined

  constructor(value: string, mask: string, caret = 0, options?: ApplyMaskOptions) {
    this._value = value
    this._mask = mask
    this.caret = caret
    this._options = options
  }

  /** Apply the mask to the value and return the masked string. */
  process(): string {
    const result = applyMask(this._value, this._mask, this.caret, this._options)
    this.caret = result.caret
    return result.value
  }
}

/** Build a `Mask` instance, resolving array patterns by value length. */
export function buildMask(
  value: string,
  mask: MaskPattern,
  caret = 0,
  options?: ApplyMaskOptions,
): Mask {
  return new Mask(value, resolveMask(value, mask), caret, options)
}

/** Apply a mask pattern to a raw value string and return the masked result. */
export function process(value: string, mask: MaskPattern, options?: ApplyMaskOptions): string {
  return buildMask(value, mask, 0, options).process()
}
