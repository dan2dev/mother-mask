import { createVNode, getFlagsForElementVnode } from 'inferno'
import type { Ref, RefObject, VNode } from 'inferno'

/**
 * A tiny factory wrapping `createVNode` for a *single leaf native element*
 * (this entry only ever renders one `<input>`, no children, no nesting) —
 * this sidesteps needing `ts-plugin-inferno`/`babel-plugin-inferno`, the
 * toolchain Inferno's own docs recommend for full JSX support. Those
 * plugins buy compile-time render optimizations that matter for large
 * component trees; a single wrapped `<input>` has none to gain from them.
 * `createVNode`'s own `ref` parameter type only covers callback refs, but
 * its runtime also accepts a `RefObject` (`{ current }`, from `createRef`)
 * directly — this widens the type to match what actually works.
 */
export function h(
  type: string,
  props: (Record<string, unknown> & { ref?: Ref<unknown> | RefObject<unknown> }) | null,
): VNode {
  const { ref, ...rest } = props ?? {}
  return createVNode(getFlagsForElementVnode(type), type, null, null, 1, rest, null, ref as Ref<unknown> | null)
}
