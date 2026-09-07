// Keep this a self-reference: the built web-components entry aliases the
// core exports instead of bundling another copy of the mask engine and its
// caches.
export * from 'mother-mask'
export { MotherMaskInputElement } from './mask-input'
export { MotherMaskDecimalElement } from './decimal-input'
