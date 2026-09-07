import type { BindOptions, MaskPattern } from 'mother-mask'

/** The `<stencil-mask-input>` custom element's public shape. */
export interface StencilMaskInputElement extends HTMLElement {
  mask: MaskPattern
  options?: Omit<BindOptions, 'onChange'>
  value: string
  name?: string
  placeholder?: string
  /**
   * Reflects the `input-mode` attribute. Named `inputModeAttr`, not
   * `inputMode`: this class is a real `HTMLElement` at runtime, which
   * already declares its own (incompatible, non-optional) `inputMode`.
   */
  inputModeAttr?: string
  disabled: boolean
  readonly: boolean
  required: boolean
}

export declare const StencilMaskInput: {
  prototype: StencilMaskInputElement
  new (): StencilMaskInputElement
}

/** Registers `<stencil-mask-input>`; importing this module already does this as a side effect. */
export declare const defineCustomElement: () => void
