import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

const OBSERVED_ATTRIBUTES = ['value', 'name', 'placeholder', 'disabled', 'readonly', 'required'] as const

/**
 * `<mm-mask-decimal>` — a plain `customElements`-based wrapper around
 * {@link bindDecimal}, no framework required. Same lifecycle contract as
 * {@link MotherMaskInputElement}: light DOM, bind in `connectedCallback`,
 * dispose in `disconnectedCallback`, reactive rebind via
 * `attributeChangedCallback`/property setters. Emits `value-change`
 * (`detail: string`) and `numeric-value-change` (`detail: number`).
 */
export class MotherMaskDecimalElement extends HTMLElement {
  static get observedAttributes(): readonly string[] {
    return OBSERVED_ATTRIBUTES
  }

  private readonly inputEl: HTMLInputElement
  private dispose: (() => void) | null = null
  private lastEmitted: string | null = null
  private lastOptions?: Omit<BindDecimalOptions, 'onChange'>
  private optionsValue?: Omit<BindDecimalOptions, 'onChange'>
  private currentValue = ''

  constructor() {
    super()
    this.inputEl = document.createElement('input')
    this.inputEl.type = 'text'
    this.inputEl.setAttribute('inputmode', 'decimal')
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

  get options(): Omit<BindDecimalOptions, 'onChange'> | undefined {
    return this.optionsValue
  }

  set options(value: Omit<BindDecimalOptions, 'onChange'> | undefined) {
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
    const optionsChanged = this.optionsValue !== this.lastOptions
    if (!optionsChanged && this.currentValue === this.lastEmitted) return

    this.release()
    const next = processDecimal(this.currentValue, this.optionsValue)
    if (input.value !== next) input.value = next

    this.dispose = bindDecimal(input, {
      ...this.optionsValue,
      onChange: (maskedValue, numericValue) => {
        this.lastEmitted = maskedValue
        this.currentValue = maskedValue
        this.dispatchEvent(new CustomEvent('value-change', { detail: maskedValue, bubbles: true, composed: true }))
        this.dispatchEvent(
          new CustomEvent('numeric-value-change', { detail: numericValue, bubbles: true, composed: true }),
        )
      },
    })
    this.lastOptions = this.optionsValue
    // See the matching comment in `MotherMaskInputElement.sync` — guards
    // against a redundant `sync()` call (e.g. from `connectedCallback`
    // right after an attribute-triggered one) rebinding for nothing.
    this.lastEmitted = this.currentValue
  }

  private release(): void {
    this.dispose?.()
    this.dispose = null
  }

  private transferId(): void {
    if (!this.id) return
    this.inputEl.id = this.id
    this.removeAttribute('id')
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mm-mask-decimal')) {
  customElements.define('mm-mask-decimal', MotherMaskDecimalElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'mm-mask-decimal': MotherMaskDecimalElement
  }
}
