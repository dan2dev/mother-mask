import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

export interface MaskActionParams {
  mask: MaskPattern
  options?: Omit<BindOptions, 'onChange'>
  value?: string
  onValueChange?: (value: string) => void
}

/**
 * Svelte action wrapping {@link bind}: `use:motherMask={{ mask, options, value, onValueChange }}`.
 *
 * Actions run only once an element is mounted to the live DOM and are torn
 * down automatically when the element leaves it — Svelte never invokes
 * `use:` directives during server-side rendering, so this is SSR-safe with
 * no `typeof window` guard needed. `update(params)` is Svelte's own
 * reactivity hook: whenever a `$state`/`$derived` value read inside the
 * `use:motherMask={...}` expression changes, Svelte re-runs this callback,
 * which rebinds only if the mask, options, or an externally-set value
 * actually changed. `destroy()` guarantees `dispose()` runs exactly once.
 */
export function motherMask(node: HTMLInputElement, params: MaskActionParams) {
  let current = params
  let dispose: (() => void) | null = null
  let lastEmitted: string | null = null

  const release = () => {
    dispose?.()
    dispose = null
  }

  const rebind = () => {
    release()
    const source = current.value ?? node.value
    const next = process(source, current.mask, current.options)
    if (node.value !== next) node.value = next
    dispose = bind(node, current.mask, {
      ...current.options,
      onChange: (maskedValue) => {
        lastEmitted = maskedValue
        current.onValueChange?.(maskedValue)
      },
    })
  }

  rebind()

  return {
    update(next: MaskActionParams) {
      const configChanged = next.mask !== current.mask || next.options !== current.options
      // An echo of our own onChange shows up as an unchanged `value` we just
      // emitted — leave the live binding and its editing state alone.
      const externalValueChange = next.value !== undefined && next.value !== lastEmitted && next.value !== node.value
      current = next
      if (configChanged || externalValueChange) rebind()
    },
    destroy() {
      release()
    },
  }
}
