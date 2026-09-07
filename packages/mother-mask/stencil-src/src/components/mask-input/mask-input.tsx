import { Component, Element, Event, EventEmitter, Prop, Watch, h } from '@stencil/core'
import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

/**
 * `<stencil-mask-input>` — a Stencil custom element wrapping `bind` from
 * `mother-mask`.
 *
 * The native `<input>` ref is grabbed via `render()`'s `ref` callback (the
 * only point Stencil hands back a real DOM node). Binding then happens in
 * `connectedCallback` when that ref is already available — true on every
 * *re*-connection (the element was moved or re-appended) — and otherwise in
 * `componentDidLoad`, which fires exactly once after the very first render,
 * once the ref exists for the first time. Either way, the browser is the
 * only place these run; Stencil's SSR/hydration path never calls them.
 * `disconnectedCallback` always disposes, and `@Watch` reactively rebinds
 * whenever `mask`/`options`/`value` change.
 *
 * ```html
 * <stencil-mask-input mask="999-999"></stencil-mask-input>
 * ```
 */
@Component({
  tag: 'stencil-mask-input',
  shadow: false,
})
export class StencilMaskInput {
  @Element() host!: HTMLElement

  @Prop() mask!: MaskPattern
  @Prop() options?: Omit<BindOptions, 'onChange'>
  @Prop({ mutable: true }) value = ''
  @Prop() name?: string
  @Prop() placeholder?: string
  @Prop({ attribute: 'input-mode' }) inputModeAttr?: string
  @Prop() disabled = false
  @Prop() readonly = false
  @Prop() required = false

  @Event({ eventName: 'value-change' }) valueChange!: EventEmitter<string>

  private inputEl?: HTMLInputElement
  private dispose: (() => void) | null = null
  private lastEmitted: string | null = null
  private lastMask?: MaskPattern
  private lastOptions?: Omit<BindOptions, 'onChange'>

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

  @Watch('mask')
  @Watch('options')
  @Watch('value')
  handlePropChange(): void {
    this.sync()
  }

  private sync(): void {
    const input = this.inputEl
    const mask = this.mask
    if (!input || mask == null) return

    const maskChanged = mask !== this.lastMask
    const optionsChanged = this.options !== this.lastOptions
    // An echo of our own `value-change` event shows up as a re-sync with an
    // unchanged mask/options and a value we just emitted — leave the live
    // binding and its editing state alone.
    if (!maskChanged && !optionsChanged && this.value === this.lastEmitted) return

    this.release()
    const next = process(this.value, mask, this.options)
    if (input.value !== next) input.value = next

    this.dispose = bind(input, mask, {
      ...this.options,
      onChange: (maskedValue) => {
        this.lastEmitted = maskedValue
        this.value = maskedValue
        this.valueChange.emit(maskedValue)
      },
    })
    this.lastMask = mask
    this.lastOptions = this.options
  }

  private release(): void {
    this.dispose?.()
    this.dispose = null
  }

  // With `shadow: false`, `render()`'s output lands as light-DOM children of
  // the host — so `<stencil-mask-input id="phone">` puts `id="phone"` on
  // the host, not the rendered `<input>`, and a page's `<label for="phone">`
  // would resolve to the (unfocusable) host. Move the id to the input once,
  // right after first render.
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
        name={this.name}
        placeholder={this.placeholder}
        inputmode={this.inputModeAttr}
        disabled={this.disabled}
        readOnly={this.readonly}
        required={this.required}
      />
    )
  }
}
