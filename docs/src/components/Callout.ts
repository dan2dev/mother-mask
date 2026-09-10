/**
 * A boxed aside for a caveat or cross-reference — mother-mask-design's
 * `callout-block` (docs-quick-start, node 24:86). Give it the same content
 * you'd put in a plain paragraph; the box and its inline-`code` styling
 * come from `.callout` in global.css.
 */
export function Callout(...content: NodeModLike<'p'>[]) {
  return div({ className: 'callout' }, p(...content))
}
