import m from 'mithril'
import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

export interface InputDecimalAttrs extends Record<string, unknown> {
  options?: Omit<BindDecimalOptions, 'onChange'>
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, numericValue: number) => void
}

/**
 * Mithril closure component wrapping {@link bindDecimal} — see
 * {@link InputMask} for the full lifecycle and DOM-value-control notes.
 * Always sets `inputmode="decimal"`.
 */
export function InputDecimal(initialVnode: m.Vnode<InputDecimalAttrs>): m.Component<InputDecimalAttrs> {
  let dispose: (() => void) | null = null
  let lastEmitted: string | null = null
  let lastOptions: Omit<BindDecimalOptions, 'onChange'> | undefined
  let initialized = false

  const release = () => {
    dispose?.()
    dispose = null
  }

  const sync = (vnode: m.VnodeDOM<InputDecimalAttrs>) => {
    const input = vnode.dom as HTMLInputElement
    const { options, value, defaultValue } = vnode.attrs

    const optionsChanged = options !== lastOptions
    if (!optionsChanged && value === lastEmitted) return

    release()
    const source = value ?? (initialized ? input.value : defaultValue ?? input.value)
    const next = processDecimal(source, options)
    if (input.value !== next) input.value = next
    initialized = true

    dispose = bindDecimal(input, {
      ...options,
      onChange: (maskedValue, numericValue) => {
        lastEmitted = maskedValue
        vnode.attrs.onValueChange?.(maskedValue, numericValue)
      },
    })
    lastOptions = options
    // See InputMask's sync() for why this isn't just set from onChange.
    lastEmitted = value ?? lastEmitted
  }

  return {
    oncreate: sync,
    onupdate: sync,
    onremove: release,
    view(vnode) {
      const { options, value, defaultValue, onValueChange, ...rest } = vnode.attrs
      return m('input', { ...rest, type: 'text', inputmode: 'decimal' })
    },
  }
}
