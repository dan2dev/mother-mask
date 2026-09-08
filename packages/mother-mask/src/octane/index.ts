// Keep this a self-reference: this entry aliases the core exports instead
// of bundling another copy of the mask engine and its caches. Unlike every
// other framework entry, this file (and the two it re-exports below) is
// published as raw source, not pre-built — see InputMask.tsx for why.
export * from 'mother-mask'
export { InputMask } from './InputMask'
export type { InputMaskProps } from './InputMask'
export { InputDecimal } from './InputDecimal'
export type { InputDecimalProps } from './InputDecimal'
