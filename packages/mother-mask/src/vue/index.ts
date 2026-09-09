// Keep this a self-reference: the built Vue entry aliases the core exports
// instead of bundling another copy of the mask engine and its caches.
export * from 'mother-mask'
export { vMotherMask } from './mask-directive'
export type { MaskDirectiveParams } from './mask-directive'
export { vMotherMaskDecimal } from './decimal-directive'
export type { DecimalDirectiveParams } from './decimal-directive'
