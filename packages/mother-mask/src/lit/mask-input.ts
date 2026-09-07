import { LitElement, html } from 'lit'
import { property } from 'lit/decorators.js'
import { createRef, ref } from 'lit/directives/ref.js'
import type { PropertyValues } from 'lit'
import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

/**
 * `<lit-mask-input>` — a Lit custom element wrapping {@link bind}.
 *
 * Renders into light DOM (no shadow root) so a page's own `<label for>` and
 * global CSS reach the native `<input>` directly, the same as any other
 * text field. Binds in `firstUpdated` (Lit's own DOM-is-ready hook) and
 * disposes in `disconnectedCallback` — both fire only on the browser, so
 * there is no `typeof window` guard to write. `updated` reactively rebinds
 * whenever `mask`/`options` change or `value` is set externally; an echo of
 * this element's own `value-change` event is ignored.
 *
 * ```html
 * <lit-mask-input mask="999-999"></lit-mask-input>
 * <script type="module">
 *   const el = document.querySelector('lit-mask-input')
 *   el.addEventListener('value-change', (e) => console.log(e.detail))
 * </script>
 * ```
 */
export class LitMaskInput extends LitElement {
  // `type: String` only governs the attribute<->property conversion (so
  // `<lit-mask-input mask="999-999">` works); assigning `el.mask = [...]` or
  // `el.mask = (raw) => ...` directly as a JS property bypasses that
  // converter entirely, so array/function `MaskPattern`s work too.
  @property({ type: String }) mask?: MaskPattern
  @property({ attribute: false }) options?: Omit<BindOptions, 'onChange'>
  @property({ type: String }) value = ''
  @property({ type: String }) name?: string
  @property({ type: String }) placeholder?: string
  // Named `inputModeAttr`/`autocompleteAttr`, not `inputMode`/`autocomplete`:
  // with light DOM (`createRenderRoot` returning `this`), this class must
  // stay assignable to `HTMLElement`, which already declares its own
  // (incompatible, non-optional) `inputMode` property.
  @property({ type: String, attribute: 'input-mode' }) inputModeAttr?: string
  @property({ type: String, attribute: 'autocomplete' }) autocompleteAttr?: string
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) readonly = false
  @property({ type: Boolean, reflect: true }) required = false

  private readonly inputRef = createRef<HTMLInputElement>()
  private dispose: (() => void) | null = null
  private lastEmitted: string | null = null
  private lastMask?: MaskPattern
  private lastOptions?: Omit<BindOptions, 'onChange'>

  protected createRenderRoot(): this {
    return this
  }

  protected render() {
    return html`<input
      ${ref(this.inputRef)}
      type="text"
      name=${this.name ?? ''}
      placeholder=${this.placeholder ?? ''}
      inputmode=${this.inputModeAttr ?? 'text'}
      autocomplete=${this.autocompleteAttr ?? 'off'}
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
    if (changed.has('mask') || changed.has('options') || changed.has('value')) this.sync()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.release()
  }

  private sync(): void {
    const input = this.inputRef.value
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
        this.dispatchEvent(new CustomEvent('value-change', { detail: maskedValue, bubbles: true, composed: true }))
      },
    })
    this.lastMask = mask
    this.lastOptions = this.options
  }

  private release(): void {
    this.dispose?.()
    this.dispose = null
  }

  // Light DOM means `<lit-mask-input id="phone">` puts `id="phone"` on
  // *this* element, not on the `<input>` it renders — a page's
  // `<label for="phone">` would resolve to the host (not focusable, no
  // native label association) rather than the actual control. Move the id
  // to the rendered input instead, once, right after first render.
  private transferId(): void {
    const input = this.inputRef.value
    if (!input || !this.id) return
    input.id = this.id
    this.removeAttribute('id')
  }
}

// Guarded: this module can be imported in a non-browser context (SSR, a
// component library's barrel file evaluated during a Node build); registration
// only makes sense — and only works — where a `CustomElementRegistry` exists.
if (typeof customElements !== 'undefined' && !customElements.get('lit-mask-input')) {
  customElements.define('lit-mask-input', LitMaskInput)
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-mask-input': LitMaskInput
  }
}
