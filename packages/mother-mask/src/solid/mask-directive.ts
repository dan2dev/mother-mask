import { createEffect, onCleanup } from 'solid-js'
import type { Accessor } from 'solid-js'
import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

export interface MaskDirectiveParams {
  mask: MaskPattern
  options?: Omit<BindOptions, 'onChange'>
  value?: string
  onValueChange?: (value: string) => void
}

/**
 * SolidJS custom directive wrapping {@link bind}: `use:motherMask={{ mask, options, value, onValueChange }}`.
 *
 * Directives run when Solid mounts the element to the live DOM; Solid's
 * server-rendering path never instantiates real elements or invokes `use:`
 * callbacks, so this is SSR-safe with no `typeof window` guard needed.
 * `createEffect` gives fine-grained reactivity: it only tracks the signals
 * actually read while building the params object (e.g. `value: phone()`),
 * and reruns exactly when those change — rebinding only if the mask,
 * options, or an externally-set value actually changed. `onCleanup`
 * guarantees `dispose()` runs exactly once, both before every rebind and
 * when the element unmounts.
 */
export function motherMask(element: HTMLInputElement, accessor: Accessor<MaskDirectiveParams>): void {
  let dispose: (() => void) | null = null
  let lastMask: MaskPattern | undefined
  let lastOptions: Omit<BindOptions, 'onChange'> | undefined
  let lastEmitted: string | null = null

  const release = () => {
    dispose?.()
    dispose = null
  }

  createEffect(() => {
    const { mask, options, value, onValueChange } = accessor()

    // An echo of our own onChange shows up as a rerun with an unchanged
    // mask/options and a value we just emitted — leave the live binding and
    // its editing state alone.
    if (mask === lastMask && options === lastOptions && value === lastEmitted) return

    release()
    const source = value ?? element.value
    const next = process(source, mask, options)
    if (element.value !== next) element.value = next

    dispose = bind(element, mask, {
      ...options,
      onChange: (maskedValue) => {
        lastEmitted = maskedValue
        onValueChange?.(maskedValue)
      },
    })
    lastMask = mask
    lastOptions = options
    lastEmitted = value ?? null
  })

  onCleanup(release)
}

declare module 'solid-js' {
  namespace JSX {
    interface Directives {
      motherMask: MaskDirectiveParams
    }
  }
}
