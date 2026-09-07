// Keep this a self-reference: the built Alpine entry aliases the core
// exports instead of bundling another copy of the mask engine and its caches.
export * from 'mother-mask'
export { motherMaskPlugin, default } from './plugin'
export type { MaskDecimalDirectiveConfig, MaskDirectiveConfig } from './plugin'
