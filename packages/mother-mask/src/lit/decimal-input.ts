import { LitElement, html } from 'lit'
import { property } from 'lit/decorators.js'
import { createRef, ref } from 'lit/directives/ref.js'
import type { PropertyValues } from 'lit'
import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

/**
 * `<lit-mask-decimal>` — a Lit custom element wrapping {@link bindDecimal}.
 * Same lifecycle contract as {@link LitMaskInput}: light DOM, bind in
 * `firstUpdated`, dispose in `disconnectedCallback`, reactive rebind in
 * `updated`. Emits `value-change` (`detail: string`) and
 * `numeric-value-change` (`detail: number`).
 *
 * ```html
 * <lit-mask-decimal></lit-mask-decimal>
 * <script type="module">
 *   const el = document.querySelector('lit-mask-decimal')
 *   el.addEventListener('numeric-value-change', (e) => console.log(e.detail))
 * </script>
 * ```
 */
export class LitMaskDecimal extends LitElement {
  @property({ attribute: false }) options?: Omit<BindDecimalOptions, 'onChange'>
  @property({ type: String }) value = ''
  @property({ type: String }) name?: string
  @property({ type: String }) placeholder?: string
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) readonly = false
  @property({ type: Boolean, reflect: true }) required = false

  private readonly inputRef = createRef<HTMLInputElement>()
  private dispose: (() => void) | null = null
  private lastEmitted: string | null = null
  private lastOptions?: Omit<BindDecimalOptions, 'onChange'>

  protected createRenderRoot(): this {
    return this
  }

  protected render() {
    return html`<input
      ${ref(this.inputRef)}
      type="text"
      inputmode="decimal"
      name=${this.name ?? ''}
      placeholder=${this.placeholder ?? ''}
      ?disabled=${this.disabled}
      ?readonly=${this.readonly}
      ?required=${this.required}
    />`
  }

  protected firstUpdated(): void {
    this.transferId()
    this.sync()
  }

  protected updated(changed: PropertyValues<this>): void {
    if (changed.has('options') || changed.has('value')) this.sync()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.release()
  }

  private sync(): void {
    const input = this.inputRef.value
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
        this.dispatchEvent(new CustomEvent('value-change', { detail: maskedValue, bubbles: true, composed: true }))
        this.dispatchEvent(
          new CustomEvent('numeric-value-change', { detail: numericValue, bubbles: true, composed: true }),
        )
      },
    })
    this.lastOptions = this.options
  }

  private release(): void {
    this.dispose?.()
    this.dispose = null
  }

  // See the matching comment on `LitMaskInput.transferId` for why this
  // matters with light DOM.
  private transferId(): void {
    const input = this.inputRef.value
    if (!input || !this.id) return
    input.id = this.id
    this.removeAttribute('id')
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('lit-mask-decimal')) {
  customElements.define('lit-mask-decimal', LitMaskDecimal)
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-mask-decimal': LitMaskDecimal
  }
}
