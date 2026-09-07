import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

const OBSERVED_ATTRIBUTES = [
  'mask',
  'value',
  'name',
  'placeholder',
  'input-mode',
  'autocomplete',
  'disabled',
  'readonly',
  'required',
] as const

/**
 * `<mm-mask-input>` — a plain `customElements`-based wrapper around {@link bind},
 * no framework required.
 *
 * Renders a single native `<input>` into light DOM (no shadow root) so a
 * page's own `<label for>` and global CSS reach it directly. Binds in
 * `connectedCallback` and disposes in `disconnectedCallback` — both fire
 * only when a real document actually connects/disconnects the element, so
 * there is no `typeof window` guard to write; `attributeChangedCallback`
 * and the property setters below reactively rebind whenever `mask`/
 * `options` change or `value` is set externally, ignoring an echo of this
 * element's own `value-change` event.
 *
 * ```html
 * <mm-mask-input mask="999-999"></mm-mask-input>
 * <script type="module">
 *   const el = document.querySelector('mm-mask-input')
 *   el.addEventListener('value-change', (e) => console.log(e.detail))
 * </script>
 * ```
 */
export class MotherMaskInputElement extends HTMLElement {
  static get observedAttributes(): readonly string[] {
    return OBSERVED_ATTRIBUTES
  }

  private readonly inputEl: HTMLInputElement
  private dispose: (() => void) | null = null
  private lastEmitted: string | null = null
  private lastMask?: MaskPattern
  private lastOptions?: Omit<BindOptions, 'onChange'>

  private maskValue?: MaskPattern
  private optionsValue?: Omit<BindOptions, 'onChange'>
  private currentValue = ''

  constructor() {
    super()
    this.inputEl = document.createElement('input')
    this.inputEl.type = 'text'
  }

  connectedCallback(): void {
    if (!this.inputEl.isConnected) this.append(this.inputEl)
    this.transferId()
    this.sync()
  }

  disconnectedCallback(): void {
    this.release()
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    switch (name) {
      case 'mask':
        this.maskValue = newValue ?? undefined
        this.sync()
        break
      case 'value':
        this.currentValue = newValue ?? ''
        this.sync()
        break
      case 'name':
        this.toggleInputAttr('name', newValue)
        break
      case 'placeholder':
        this.toggleInputAttr('placeholder', newValue)
        break
      case 'input-mode':
        this.toggleInputAttr('inputmode', newValue)
        break
      case 'autocomplete':
        this.toggleInputAttr('autocomplete', newValue)
        break
      case 'disabled':
      case 'readonly':
      case 'required':
        this.toggleInputAttr(name, newValue !== null ? '' : null)
        break
    }
  }

  private toggleInputAttr(name: string, value: string | null): void {
    if (value === null) this.inputEl.removeAttribute(name)
    else this.inputEl.setAttribute(name, value)
  }

  get mask(): MaskPattern | undefined {
    return this.maskValue
  }

  set mask(value: MaskPattern | undefined) {
    this.maskValue = value
    this.sync()
  }

  get options(): Omit<BindOptions, 'onChange'> | undefined {
    return this.optionsValue
  }

  set options(value: Omit<BindOptions, 'onChange'> | undefined) {
    this.optionsValue = value
    this.sync()
  }

  get value(): string {
    return this.currentValue
  }

  set value(value: string) {
    this.currentValue = value
    this.sync()
  }

  private sync(): void {
    const input = this.inputEl
    const mask = this.maskValue
    if (mask == null) return

    const maskChanged = mask !== this.lastMask
    const optionsChanged = this.optionsValue !== this.lastOptions
    // An echo of our own `value-change` event shows up as a re-sync with an
    // unchanged mask/options and a value we just emitted — leave the live
    // binding and its editing state alone.
    if (!maskChanged && !optionsChanged && this.currentValue === this.lastEmitted) return

    this.release()
    const next = process(this.currentValue, mask, this.optionsValue)
    if (input.value !== next) input.value = next

    this.dispose = bind(input, mask, {
      ...this.optionsValue,
      onChange: (maskedValue) => {
        this.lastEmitted = maskedValue
        this.currentValue = maskedValue
        this.dispatchEvent(new CustomEvent('value-change', { detail: maskedValue, bubbles: true, composed: true }))
      },
    })
    this.lastMask = mask
    this.lastOptions = this.optionsValue
    // Not just "the value from the last user edit": also the value this
    // sync() call itself just settled on. Native custom elements fire
    // `attributeChangedCallback` once per attribute *and* `connectedCallback`
    // separately — several of which can call `sync()` back-to-back for the
    // same unchanged config before any real change happens — so without
    // this, a later redundant call would see `currentValue` (already '')
    // fail to match a still-`null` `lastEmitted` and rebind for nothing.
    this.lastEmitted = this.currentValue
  }

  private release(): void {
    this.dispose?.()
    this.dispose = null
  }

  // A page's own `<mm-mask-input id="phone">` puts `id="phone"` on this
  // element, not on the `<input>` it renders into light DOM — a
  // `<label for="phone">` would then resolve to the (unfocusable) host.
  // Move the id to the input once, right after connecting.
  private transferId(): void {
    if (!this.id) return
    this.inputEl.id = this.id
    this.removeAttribute('id')
  }
}

// Guarded: this module can be imported in a non-browser context (SSR, a
// component library's barrel file evaluated during a Node build);
// registration only makes sense — and only works — where a
// `CustomElementRegistry` exists.
if (typeof customElements !== 'undefined' && !customElements.get('mm-mask-input')) {
  customElements.define('mm-mask-input', MotherMaskInputElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'mm-mask-input': MotherMaskInputElement
  }
}
