import { modifier } from 'ember-modifier'
import { maskInputModifier } from './mask-input-handler'

export { maskInputModifier } from './mask-input-handler'
export type { MaskInputNamedArgs } from './mask-input-handler'

/**
 * `{{mask-input mask options=this.options value=this.value onValueChange=this.setValue}}`
 *
 * See {@link maskInputModifier} in `./mask-input-handler` for the lifecycle
 * notes — this file only wraps it with `ember-modifier`'s own `modifier()`.
 */
export default modifier(maskInputModifier)
