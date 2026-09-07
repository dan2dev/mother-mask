import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

export interface DecimalActionParams {
  options?: Omit<BindDecimalOptions, 'onChange'>
  value?: string
  onValueChange?: (value: string, numericValue: number) => void
}

/**
 * Svelte action wrapping {@link bindDecimal}: `use:motherMaskDecimal={{ options, value, onValueChange }}`.
 * Same action lifecycle contract as {@link motherMask}: mounts/binds once,
 * `update` rebinds reactively, `destroy` guarantees `dispose()`.
 */
export function motherMaskDecimal(node: HTMLInputElement, params: DecimalActionParams = {}) {
  let current = params
  let dispose: (() => void) | null = null
  let lastEmitted: string | null = null

  node.setAttribute('inputmode', 'decimal')

  const release = () => {
    dispose?.()
    dispose = null
  }

  const rebind = () => {
    release()
    const source = current.value ?? node.value
    const next = processDecimal(source, current.options)
    if (node.value !== next) node.value = next
    dispose = bindDecimal(node, {
      ...current.options,
      onChange: (maskedValue, numericValue) => {
        lastEmitted = maskedValue
        current.onValueChange?.(maskedValue, numericValue)
      },
    })
  }

  rebind()

  return {
    update(next: DecimalActionParams) {
      const configChanged = next.options !== current.options
      const externalValueChange = next.value !== undefined && next.value !== lastEmitted && next.value !== node.value
      current = next
      if (configChanged || externalValueChange) rebind()
    },
    destroy() {
      release()
    },
  }
}
