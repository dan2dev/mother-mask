import type { Alpine } from 'alpinejs'
import { bind, bindDecimal, process, processDecimal } from 'mother-mask'
import type { BindDecimalOptions, BindOptions, MaskPattern } from 'mother-mask'

export interface MaskDirectiveConfig {
  mask: MaskPattern
  options?: Omit<BindOptions, 'onChange'>
  value?: string
}

export interface MaskDecimalDirectiveConfig {
  options?: Omit<BindDecimalOptions, 'onChange'>
  value?: string
}

/**
 * Alpine.js plugin registering the `x-mask` directive:
 * `Alpine.plugin(motherMaskPlugin)`.
 *
 * ```html
 * <input x-data="{ phone: '' }" x-mask="{ mask: '999-999', value: phone }"
 *        x-on:mask-change="phone = $event.detail" />
 * <input x-data="{ amount: '' }" x-mask.decimal="{ value: amount }"
 *        x-on:mask-change="amount = $event.detail"
 *        x-on:mask-numeric-change="console.log($event.detail)" />
 * ```
 *
 * The directive's callback runs when Alpine walks the live DOM tree — never
 * during any server-rendering step, since Alpine has none; it only ever
 * operates on real elements already in the document, so there is no
 * `typeof window` guard to write. `effect()` re-runs the directive's body
 * whenever a reactive value read while evaluating `expression` changes
 * (e.g. `value: phone`), rebinding only if the mask, options, or an
 * externally-set value actually changed — an echo of the directive's own
 * `mask-change` event is ignored. `cleanup()` guarantees `dispose()` runs
 * exactly once, both before every rebind and when the element is removed.
 *
 * Two-way binding goes through DOM events (`mask-change`, and for
 * `.decimal`, also `mask-numeric-change`) rather than writing back into
 * Alpine state directly — combine with `x-on:mask-change`, not `x-model`,
 * to avoid both fighting over the input's live value on every keystroke.
 */
export function motherMaskPlugin(Alpine: Alpine): void {
  Alpine.directive('mask', (el, { expression, modifiers }, { effect, cleanup, evaluateLater }) => {
    const input = el as HTMLInputElement
    const isDecimal = modifiers.includes('decimal')
    const getConfig = evaluateLater<MaskDirectiveConfig | MaskDecimalDirectiveConfig>(expression || '{}')

    let dispose: (() => void) | null = null
    let lastEmitted: string | null = null
    let lastMask: MaskPattern | undefined
    let lastOptions: unknown

    const release = () => {
      dispose?.()
      dispose = null
    }

    effect(() => {
      getConfig((config) => {
        const value = config?.value

        if (isDecimal) {
          const options = (config as MaskDecimalDirectiveConfig | undefined)?.options
          const optionsChanged = options !== lastOptions
          if (!optionsChanged && value === lastEmitted) return

          release()
          const next = processDecimal(value ?? input.value, options)
          if (input.value !== next) input.value = next

          dispose = bindDecimal(input, {
            ...options,
            onChange: (maskedValue, numericValue) => {
              lastEmitted = maskedValue
              input.dispatchEvent(new CustomEvent('mask-change', { detail: maskedValue, bubbles: true }))
              input.dispatchEvent(
                new CustomEvent('mask-numeric-change', { detail: numericValue, bubbles: true }),
              )
            },
          })
          lastOptions = options
          return
        }

        const maskConfig = config as MaskDirectiveConfig | undefined
        const mask = maskConfig?.mask
        if (maskConfig == null || mask == null) return
        const options = maskConfig.options
        const maskChanged = mask !== lastMask
        const optionsChanged = options !== lastOptions
        // An echo of our own `mask-change` event shows up as a re-run with
        // an unchanged mask/options and a value we just emitted — leave the
        // live binding and its editing state alone.
        if (!maskChanged && !optionsChanged && value === lastEmitted) return

        release()
        const next = process(value ?? input.value, mask, options)
        if (input.value !== next) input.value = next

        dispose = bind(input, mask, {
          ...options,
          onChange: (maskedValue) => {
            lastEmitted = maskedValue
            input.dispatchEvent(new CustomEvent('mask-change', { detail: maskedValue, bubbles: true }))
          },
        })
        lastMask = mask
        lastOptions = options
      })
    })

    cleanup(release)
  })
}

// Also the default export: `Alpine.plugin(motherMaskPlugin)` matches
// Alpine's own documented plugin convention (`export default function
// (Alpine) { ... }`), while the named export keeps this entry consistent
// with this package's other framework entries.
export default motherMaskPlugin
