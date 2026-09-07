// Keep this a self-reference: the built Vue entry aliases the core exports
// instead of bundling another copy of the mask engine and its caches.
export * from 'mother-mask'
export { InputMask } from './InputMask'
export type { InputMaskEmits } from './InputMask'
export { InputDecimal } from './InputDecimal'
export type { InputDecimalEmits } from './InputDecimal'
