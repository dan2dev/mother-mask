import { Component, Element, Event, EventEmitter, Prop, Watch, h } from '@stencil/core'
import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

/**
 * `<stencil-mask-decimal>` — a Stencil custom element wrapping `bindDecimal`
 * from `mother-mask`. Same lifecycle contract as {@link StencilMaskInput}:
 * ref grabbed in `render()`, bound in `connectedCallback`/`componentDidLoad`
 * (browser-only either way), disposed in `disconnectedCallback`, reactive
 * rebind via `@Watch`. Emits `value-change` (`detail: string`) and
 * `numeric-value-change` (`detail: number`).
 */
@Component({
  tag: 'stencil-mask-decimal',
  shadow: false,
})
export class StencilMaskDecimal {
  @Element() host!: HTMLElement

  @Prop() options?: Omit<BindDecimalOptions, 'onChange'>
  @Prop({ mutable: true }) value = ''
  @Prop() name?: string
  @Prop() placeholder?: string
  @Prop() disabled = false
  @Prop() readonly = false
  @Prop() required = false

  @Event({ eventName: 'value-change' }) valueChange!: EventEmitter<string>
  @Event({ eventName: 'numeric-value-change' }) numericValueChange!: EventEmitter<number>

  private inputEl?: HTMLInputElement
  private dispose: (() => void) | null = null
  private lastEmitted: string | null = null
  private lastOptions?: Omit<BindDecimalOptions, 'onChange'>

  connectedCallback(): void {
    if (this.inputEl) this.sync()
  }

  componentDidLoad(): void {
    this.transferId()
    this.sync()
  }

  disconnectedCallback(): void {
    this.release()
  }

  @Watch('options')
  @Watch('value')
  handlePropChange(): void {
    this.sync()
  }

  private sync(): void {
    const input = this.inputEl
    if (!input) return

    const optionsChanged = this.options !== this.lastOptions
    if (!optionsChanged && this.value === this.lastEmitted) return

    this.release()
    const next = processDecimal(this.value, this.options)
    if (input.value !== next) input.value = next

    this.dispose = bindDecimal(input, {
      ...this.options,
      onChange: (maskedValue, numericValue) => {
        this.lastEmitted = maskedValue
        this.value = maskedValue
        this.valueChange.emit(maskedValue)
        this.numericValueChange.emit(numericValue)
      },
    })
    this.lastOptions = this.options
  }

  private release(): void {
    this.dispose?.()
    this.dispose = null
  }

  private transferId(): void {
    const input = this.inputEl
    if (!input || !this.host.id) return
    input.id = this.host.id
    this.host.removeAttribute('id')
  }

  render() {
    return (
      <input
        ref={(el) => { this.inputEl = el }}
        type="text"
        inputmode="decimal"
        name={this.name}
        placeholder={this.placeholder}
        disabled={this.disabled}
        readOnly={this.readonly}
        required={this.required}
      />
    )
  }
}
