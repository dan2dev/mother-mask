import ko from 'knockout'
import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

export interface MaskBindingConfig {
  mask: MaskPattern
  options?: Omit<BindOptions, 'onChange'>
  value?: ko.MaybeSubscribable<string | undefined>
  onValueChange?: (value: string) => void
}

interface BindingState {
  dispose: (() => void) | null
  lastEmitted: string | null
  lastMask: MaskPattern | undefined
  lastOptions: Omit<BindOptions, 'onChange'> | undefined
}

// Per-element state, keyed off the element itself: `ko.bindingHandlers.mask`
// is one shared object reused across every bound element, so `init`/`update`
// can't keep binding state in their own closures the way a fresh-per-instance
// factory (React's hook, Vue's setup(), ...) can elsewhere in this package.
const state = new WeakMap<Element, BindingState>()

function getState(element: Element): BindingState {
  let existing = state.get(element)
  if (!existing) {
    existing = { dispose: null, lastEmitted: null, lastMask: undefined, lastOptions: undefined }
    state.set(element, existing)
  }
  return existing
}

function sync(element: HTMLInputElement, config: MaskBindingConfig): void {
  const record = getState(element)
  const { mask, options } = config
  const value = ko.unwrap(config.value)

  const maskChanged = mask !== record.lastMask
  const optionsChanged = options !== record.lastOptions
  // An echo of our own onValueChange shows up as a re-run with an unchanged
  // mask/options and a value we just emitted — leave the live binding and
  // its editing state alone.
  if (!maskChanged && !optionsChanged && value === record.lastEmitted) return

  record.dispose?.()
  const next = process(value ?? element.value, mask, options)
  if (element.value !== next) element.value = next

  record.dispose = bind(element, mask, {
    ...options,
    onChange: (maskedValue) => {
      record.lastEmitted = maskedValue
      config.onValueChange?.(maskedValue)
    },
  })
  record.lastMask = mask
  record.lastOptions = options
  // Not just "the value from the last user edit": also the value this
  // sync() call itself just settled on. Knockout can call update() again
  // for the same unchanged config (e.g. an unrelated observable read inside
  // the same computed re-evaluating) — without this, that next call would
  // see `value` fail to match a still-stale `lastEmitted` and rebind for
  // nothing.
  record.lastEmitted = value ?? record.lastEmitted
}

/**
 * `ko.bindingHandlers.mask`, registering the `mask: { mask, options, value,
 * onValueChange }` binding: `<input data-bind="mask: { mask: '999-999',
 * value: phone, onValueChange: v => phone(v) }">`. `value` may be a plain
 * string, an observable, or any accessor `ko.unwrap` understands.
 *
 * `init` binds once the element is live; `update` re-runs whenever an
 * observable read while evaluating the binding's value changes (Knockout's
 * own dependency tracking) — this rebinds only if the mask, options, or an
 * externally-set value actually changed. `ko.utils.domNodeDisposal
 * .addDisposeCallback` guarantees `dispose()` runs exactly once, both
 * before every rebind and when Knockout removes the element (`ko.removeNode`,
 * `ko.cleanNode`, or an `if`/`foreach`/template removing it) — Knockout
 * never touches real DOM nodes during any server-side step, since it has
 * none; `applyBindings` only ever runs against a live document, so there is
 * no `typeof window` guard to write.
 */
export const maskBindingHandler: ko.BindingHandler<MaskBindingConfig> = {
  init(element, valueAccessor) {
    const config = ko.unwrap(valueAccessor())
    sync(element as HTMLInputElement, config)
    ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
      state.get(element)?.dispose?.()
      state.delete(element)
    })
  },
  update(element, valueAccessor) {
    const config = ko.unwrap(valueAccessor())
    sync(element as HTMLInputElement, config)
  },
}

ko.bindingHandlers.mask = maskBindingHandler
