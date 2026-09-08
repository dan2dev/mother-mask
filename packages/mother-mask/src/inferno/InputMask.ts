import { Component, createRef } from 'inferno'
import type { Inferno, RefObject, VNode } from 'inferno'
import { h } from './h'
import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

export type InputMaskProps = Omit<
  Inferno.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type'
> & {
  mask: MaskPattern
  options?: Omit<BindOptions, 'onChange'>
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

/**
 * Inferno class component wrapping {@link bind}.
 *
 * Binds in `componentDidMount` and disposes in `componentWillUnmount` —
 * Inferno's server-rendering path (`inferno-server`) never calls either,
 * so this is safe to render on the server with no `typeof window` guard.
 * `componentDidUpdate` reactively rebinds whenever `mask`/`options` change
 * or `value` is set externally; an echo of this component's own
 * `onValueChange` is ignored.
 */
export class InputMask extends Component<InputMaskProps> {
  private readonly inputRef: RefObject<HTMLInputElement> = createRef()
  private dispose: (() => void) | null = null
  private lastEmitted: string | null = null
  private lastMask?: MaskPattern
  private lastOptions?: Omit<BindOptions, 'onChange'>

  componentDidMount(): void {
    this.sync()
  }

  componentDidUpdate(): void {
    this.sync()
  }

  componentWillUnmount(): void {
    this.release()
  }

  private sync(): void {
    const input = this.inputRef.current
    const { mask, options, value } = this.props
    if (!input) return

    const maskChanged = mask !== this.lastMask
    const optionsChanged = options !== this.lastOptions
    // An echo of our own onValueChange shows up as a re-sync with an
    // unchanged mask/options and a value we just emitted — leave the live
    // binding and its editing state alone.
    if (!maskChanged && !optionsChanged && value === this.lastEmitted) return

    this.release()
    const next = process(value ?? input.value, mask, options)
    if (input.value !== next) input.value = next

    this.dispose = bind(input, mask, {
      ...options,
      onChange: (maskedValue) => {
        this.lastEmitted = maskedValue
        this.props.onValueChange?.(maskedValue)
      },
    })
    this.lastMask = mask
    this.lastOptions = options
  }

  private release(): void {
    this.dispose?.()
    this.dispose = null
  }

  render(): VNode {
    const { mask, options, value, defaultValue, onValueChange, ...rest } = this.props
    const initial = process(value ?? defaultValue ?? '', mask, options)
    // Plain `h()` call, not JSX: Inferno's own JSX support needs
    // `ts-plugin-inferno`/`babel-plugin-inferno` for correct compile-time
    // vnode flags — not worth the extra toolchain for one leaf element.
    // The wrapper controls the DOM through the mask; only the initial value
    // is rendered here — Inferno must not fight the mask's intermediate edits.
    return h('input', { ...rest, ref: this.inputRef, type: 'text', defaultValue: initial })
  }
}
