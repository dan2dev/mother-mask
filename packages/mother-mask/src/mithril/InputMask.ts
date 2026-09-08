import m from 'mithril'
import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

export interface InputMaskAttrs extends Record<string, unknown> {
  mask: MaskPattern
  options?: Omit<BindOptions, 'onChange'>
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

/**
 * Mithril closure component wrapping {@link bind}: `m(InputMask, { mask, ... })`.
 *
 * Binds in `oncreate` and disposes in `onremove` — Mithril's server-side
 * rendering (`mithril/render-html`, e.g. via `mithril-node-render`) never
 * calls either lifecycle hook, so this is safe to render on the server with
 * no `typeof window` guard. `onupdate` reactively rebinds whenever
 * `mask`/`options` change or `value` is set externally; an echo of this
 * component's own `onValueChange` is ignored. Every element with an
 * `oncreate`/`onupdate`/`onremove` hook is exempt from Mithril's DOM-node
 * recycling, so the same `<input>` is reused across redraws for as long as
 * this vnode stays mounted.
 *
 * `value` is deliberately never passed as an `m('input', ...)` attribute:
 * Mithril's vdom diff would otherwise reassign `.value` from `vnode.attrs`
 * on every redraw, fighting the mask's own intermediate edits. The wrapper
 * controls the DOM value directly instead, exactly like every other
 * framework entry in this package.
 */
export function InputMask(initialVnode: m.Vnode<InputMaskAttrs>): m.Component<InputMaskAttrs> {
  let dispose: (() => void) | null = null
  let lastEmitted: string | null = null
  let lastMask: MaskPattern | undefined
  let lastOptions: Omit<BindOptions, 'onChange'> | undefined
  let initialized = false

  const release = () => {
    dispose?.()
    dispose = null
  }

  const sync = (vnode: m.VnodeDOM<InputMaskAttrs>) => {
    const input = vnode.dom as HTMLInputElement
    const { mask, options, value, defaultValue } = vnode.attrs

    const maskChanged = mask !== lastMask
    const optionsChanged = options !== lastOptions
    // An echo of our own onValueChange shows up as a re-sync with an
    // unchanged mask/options and a value we just emitted — leave the live
    // binding and its editing state alone.
    if (!maskChanged && !optionsChanged && value === lastEmitted) return

    release()
    // A freshly created <input> starts empty (view() never sets `value` —
    // see this function's own doc comment above) — fall back to
    // defaultValue only before the first bind, exactly once.
    const source = value ?? (initialized ? input.value : defaultValue ?? input.value)
    const next = process(source, mask, options)
    if (input.value !== next) input.value = next
    initialized = true

    dispose = bind(input, mask, {
      ...options,
      onChange: (maskedValue) => {
        lastEmitted = maskedValue
        vnode.attrs.onValueChange?.(maskedValue)
      },
    })
    lastMask = mask
    lastOptions = options
    // Not just "the value from the last user edit": also the value this
    // sync() call itself just settled on. Mithril can call oncreate/onupdate
    // back-to-back for the same unchanged attrs across redraws — without
    // this, the next such redraw would see `value` (still the externally
    // passed string) fail to match a still-`null`/stale `lastEmitted` and
    // rebind for nothing.
    lastEmitted = value ?? lastEmitted
  }

  return {
    oncreate: sync,
    onupdate: sync,
    onremove: release,
    view(vnode) {
      const { mask, options, value, defaultValue, onValueChange, ...rest } = vnode.attrs
      return m('input', { ...rest, type: 'text' })
    },
  }
}
