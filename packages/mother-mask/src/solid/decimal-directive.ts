import { createEffect, onCleanup } from 'solid-js'
import type { Accessor } from 'solid-js'
import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

export interface DecimalDirectiveParams {
  options?: Omit<BindDecimalOptions, 'onChange'>
  value?: string
  onValueChange?: (value: string, numericValue: number) => void
}

/**
 * SolidJS custom directive wrapping {@link bindDecimal}:
 * `use:motherMaskDecimal={{ options, value, onValueChange }}`. Same
 * `createEffect`/`onCleanup` lifecycle contract as {@link motherMask}.
 */
export function motherMaskDecimal(element: HTMLInputElement, accessor: Accessor<DecimalDirectiveParams>): void {
  let dispose: (() => void) | null = null
  let lastOptions: Omit<BindDecimalOptions, 'onChange'> | undefined
  let lastEmitted: string | null = null

  element.setAttribute('inputmode', 'decimal')

  const release = () => {
    dispose?.()
    dispose = null
  }

  createEffect(() => {
    const { options, value, onValueChange } = accessor()

    if (options === lastOptions && value === lastEmitted) return

    release()
    const source = value ?? element.value
    const next = processDecimal(source, options)
    if (element.value !== next) element.value = next

    dispose = bindDecimal(element, {
      ...options,
      onChange: (maskedValue, numericValue) => {
        lastEmitted = maskedValue
        onValueChange?.(maskedValue, numericValue)
      },
    })
    lastOptions = options
    lastEmitted = value ?? null
  })

  onCleanup(release)
}

declare module 'solid-js' {
  namespace JSX {
    interface Directives {
      motherMaskDecimal: DecimalDirectiveParams
    }
  }
}
