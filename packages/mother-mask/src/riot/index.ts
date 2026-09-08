// Keep this a self-reference: the built Riot entry aliases the core
// exports instead of bundling another copy of the mask engine and its caches.
export * from 'mother-mask'
export { maskInput } from './mask-input'
export type { MaskInputProps } from './mask-input'
export { maskDecimal } from './mask-decimal'
export type { MaskDecimalProps } from './mask-decimal'
