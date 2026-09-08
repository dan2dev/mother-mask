import { Component, createRef } from 'inferno'
import type { Inferno, RefObject, VNode } from 'inferno'
import { h } from './h'
import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

export type InputDecimalProps = Omit<
  Inferno.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'inputMode'
> & {
  options?: Omit<BindDecimalOptions, 'onChange'>
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, numericValue: number) => void
}

/** Inferno class component wrapping {@link bindDecimal} — see {@link InputMask} for the lifecycle notes. */
export class InputDecimal extends Component<InputDecimalProps> {
  private readonly inputRef: RefObject<HTMLInputElement> = createRef()
  private dispose: (() => void) | null = null
  private lastEmitted: string | null = null
  private lastOptions?: Omit<BindDecimalOptions, 'onChange'>

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
    const { options, value } = this.props
    if (!input) return

    const optionsChanged = options !== this.lastOptions
    if (!optionsChanged && value === this.lastEmitted) return

    this.release()
    const next = processDecimal(value ?? input.value, options)
    if (input.value !== next) input.value = next

    this.dispose = bindDecimal(input, {
      ...options,
      onChange: (maskedValue, numericValue) => {
        this.lastEmitted = maskedValue
        this.props.onValueChange?.(maskedValue, numericValue)
      },
    })
    this.lastOptions = options
  }

  private release(): void {
    this.dispose?.()
    this.dispose = null
  }

  render(): VNode {
    const { options, value, defaultValue, onValueChange, ...rest } = this.props
    const initial = processDecimal(value ?? defaultValue ?? '', options)
    return h('input', { inputMode: 'decimal', ...rest, ref: this.inputRef, type: 'text', defaultValue: initial })
  }
}
