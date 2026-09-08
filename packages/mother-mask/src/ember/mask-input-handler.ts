import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

export interface MaskInputNamedArgs {
  options?: Omit<BindOptions, 'onChange'>
  value?: string
  onValueChange?: (value: string) => void
}

/**
 * The modifier body, kept in its own module with no `ember-modifier` import
 * so it can be exercised directly in this package's own test suite with a
 * plain `HTMLInputElement`. `ember-modifier` itself imports Ember framework
 * internals (`@ember/application`, `@ember/modifier`, `@ember/destroyable`)
 * that only resolve inside a real Ember app's build (Embroider/ember-cli
 * provide those specifiers; they aren't separately installable npm
 * packages) — verifying the actual `modifier()`-wrapped export in
 * `mask-input.ts` needs a full Ember rendering test
 * (`setupRenderingTest` + a dummy app), disproportionate for this package's
 * own suite. This split keeps the masking logic itself — the part with
 * real behavioral risk — fully unit-testable; `mask-input.ts`'s wrapping is
 * verified at the type level instead (`tsc --noEmit` against
 * `ember-modifier`'s and `ember-source`'s published types).
 *
 * `ember-modifier` only ever invokes this once the element the modifier is
 * attached to is actually in the document, and only on the client: Ember's
 * server-side rendering (FastBoot) renders to a string and never attaches
 * real elements or runs modifiers, so there is no `typeof window` guard to
 * write here. It *autotracks* while running — any argument it reads
 * (`positional[0]`, `named.options`, `named.value`) becomes a tracked
 * dependency, and `ember-modifier` reruns this function, calling the
 * previously returned destructor first, whenever any of them changes. That
 * teardown-then-rerun already happens unconditionally on every value
 * change, including an echo of this modifier's own `onValueChange` — unlike
 * every other framework entry in this package there is no way to skip that
 * cycle from inside the function, since Ember has already torn down the
 * previous binding by the time this one runs. It stays visually seamless
 * regardless: {@link process} is idempotent (re-processing an
 * already-formatted value returns it unchanged, so `element.value` is never
 * reassigned on an echo, and the caret never moves), and removing/adding
 * the underlying event listeners doesn't touch focus or selection.
 */
export function maskInputModifier(
  element: HTMLInputElement,
  [mask]: [MaskPattern],
  named: MaskInputNamedArgs,
): () => void {
  const { options, value, onValueChange } = named

  const next = process(value ?? element.value, mask, options)
  if (element.value !== next) element.value = next

  return bind(element, mask, {
    ...options,
    onChange: (maskedValue) => onValueChange?.(maskedValue),
  })
}
