import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

export interface DecimalModOptions extends BindDecimalOptions {
  /** Dynamic value, re-read on every `update()`: `value: () => amount`. */
  value?: () => string
}

/**
 * The attributes object `motherMaskDecimal()` hands to an `input()` builder. A type
 * alias, not an interface: only object literal types get the implicit index
 * signature Nuclo's `ExpandedElementAttributes` requires.
 */
export type DecimalMod = {
  type: 'text'
  inputMode: 'decimal'
  value?: () => string
  onMount: (input: HTMLInputElement) => () => void
}

/** Nuclo mod wrapping {@link bindDecimal} — see {@link motherMask} for the lifecycle notes. */
export function motherMaskDecimal({ value, ...options }: DecimalModOptions = {}): DecimalMod {
  let el: HTMLInputElement | null = null
  let lastEmitted: string | null = null
  const mod: DecimalMod = {
    type: 'text',
    inputMode: 'decimal',
    onMount: (input) => {
      el = input
      return bindDecimal(input, {
        ...options,
        onChange: (maskedValue, numericValue) => {
          lastEmitted = maskedValue
          options.onChange?.(maskedValue, numericValue)
        },
      })
    },
  }
  if (value) {
    mod.value = () => {
      const next = value()
      return el && next === lastEmitted ? el.value : processDecimal(next, options)
    }
  }
  return mod
}
