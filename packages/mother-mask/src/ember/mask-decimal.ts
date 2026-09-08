import { modifier } from 'ember-modifier'
import { maskDecimalModifier } from './mask-decimal-handler'

export { maskDecimalModifier } from './mask-decimal-handler'
export type { MaskDecimalNamedArgs } from './mask-decimal-handler'

/**
 * `{{mask-decimal options=this.options value=this.value onValueChange=this.setValue}}`
 *
 * See {@link maskDecimalModifier} in `./mask-decimal-handler` for the
 * lifecycle notes — this file only wraps it with `ember-modifier`'s own
 * `modifier()`.
 */
export default modifier(maskDecimalModifier)
