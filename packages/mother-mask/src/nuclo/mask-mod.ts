import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

export interface MaskModOptions extends BindOptions {
  /** Dynamic value, re-read on every `update()`: `value: () => phone`. */
  value?: () => string
}

/**
 * The attributes object `motherMask()` hands to an `input()` builder. A type
 * alias, not an interface: only object literal types get the implicit index
 * signature Nuclo's `ExpandedElementAttributes` requires.
 */
export type MaskMod = {
  type: 'text'
  value?: () => string
  onMount: (input: HTMLInputElement) => () => void
}

/**
 * Nuclo mod wrapping {@link bind}: `input({ id: 'phone' }, motherMask('(99) 99999-9999', { onChange }))`.
 *
 * Returns a plain attributes object — already something every tag builder
 * accepts — so there is no Nuclo runtime import at all. Binding happens in
 * `onMount`, which Nuclo runs once after the element is inserted (never on
 * the server, and after `hydrate()` on the client), and the disposer `bind()`
 * returns is the hook's cleanup, which Nuclo runs when it removes the
 * element. A `value` getter becomes a dynamic attribute: an external change
 * (`phone = '…'; update()`) is formatted with {@link process} before Nuclo
 * writes it, while an echo of this mod's own `onChange` hands back the live
 * DOM value so the write is a no-op and the caret and any IME draft survive.
 */
export function motherMask(mask: MaskPattern, { value, ...options }: MaskModOptions = {}): MaskMod {
  let el: HTMLInputElement | null = null
  let lastEmitted: string | null = null
  const mod: MaskMod = {
    type: 'text',
    onMount: (input) => {
      el = input
      return bind(input, mask, {
        ...options,
        onChange: (maskedValue) => {
          lastEmitted = maskedValue
          options.onChange?.(maskedValue)
        },
      })
    },
  }
  if (value) {
    mod.value = () => {
      const next = value()
      return el && next === lastEmitted ? el.value : process(next, mask, options)
    }
  }
  return mod
}
