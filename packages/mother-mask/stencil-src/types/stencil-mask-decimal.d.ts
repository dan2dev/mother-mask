import type { BindDecimalOptions } from 'mother-mask'

/** The `<stencil-mask-decimal>` custom element's public shape. */
export interface StencilMaskDecimalElement extends HTMLElement {
  options?: Omit<BindDecimalOptions, 'onChange'>
  value: string
  name?: string
  placeholder?: string
  disabled: boolean
  readonly: boolean
  required: boolean
}

export declare const StencilMaskDecimal: {
  prototype: StencilMaskDecimalElement
  new (): StencilMaskDecimalElement
}

/** Registers `<stencil-mask-decimal>`; importing this module already does this as a side effect. */
export declare const defineCustomElement: () => void
