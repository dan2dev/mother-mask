import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

export interface MaskDecimalNamedArgs {
  options?: Omit<BindDecimalOptions, 'onChange'>
  value?: string
  onValueChange?: (value: string, numericValue: number) => void
}

/**
 * The modifier body wrapping {@link bindDecimal} — kept free of any
 * `ember-modifier` import for the same reason as, and see, `maskInputModifier`
 * in `./mask-input-handler.ts` for the full lifecycle notes.
 */
export function maskDecimalModifier(
  element: HTMLInputElement,
  _positional: [],
  named: MaskDecimalNamedArgs,
): () => void {
  const { options, value, onValueChange } = named

  const next = processDecimal(value ?? element.value, options)
  if (element.value !== next) element.value = next
  if (element.inputMode !== 'decimal') element.inputMode = 'decimal'

  return bindDecimal(element, {
    ...options,
    onChange: (maskedValue, numericValue) => onValueChange?.(maskedValue, numericValue),
  })
}
