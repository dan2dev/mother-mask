import ko from 'knockout'
import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

export interface MaskDecimalBindingConfig {
  options?: Omit<BindDecimalOptions, 'onChange'>
  value?: ko.MaybeSubscribable<string | undefined>
  onValueChange?: (value: string, numericValue: number) => void
}

interface BindingState {
  dispose: (() => void) | null
  lastEmitted: string | null
  lastOptions: Omit<BindDecimalOptions, 'onChange'> | undefined
}

// See mask-binding.ts for why this needs a per-element WeakMap rather than
// closure state shared across every element using this binding.
const state = new WeakMap<Element, BindingState>()

function getState(element: Element): BindingState {
  let existing = state.get(element)
  if (!existing) {
    existing = { dispose: null, lastEmitted: null, lastOptions: undefined }
    state.set(element, existing)
  }
  return existing
}

function sync(element: HTMLInputElement, config: MaskDecimalBindingConfig): void {
  const record = getState(element)
  const { options } = config
  const value = ko.unwrap(config.value)

  const optionsChanged = options !== record.lastOptions
  if (!optionsChanged && value === record.lastEmitted) return

  record.dispose?.()
  const next = processDecimal(value ?? element.value, options)
  if (element.value !== next) element.value = next
  if (element.inputMode !== 'decimal') element.inputMode = 'decimal'

  record.dispose = bindDecimal(element, {
    ...options,
    onChange: (maskedValue, numericValue) => {
      record.lastEmitted = maskedValue
      config.onValueChange?.(maskedValue, numericValue)
    },
  })
  record.lastOptions = options
  record.lastEmitted = value ?? record.lastEmitted
}

/**
 * `ko.bindingHandlers.maskDecimal` — see {@link maskBindingHandler} in
 * `./mask-binding.ts` for the full lifecycle notes. Always sets
 * `inputmode="decimal"`.
 */
export const maskDecimalBindingHandler: ko.BindingHandler<MaskDecimalBindingConfig> = {
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

ko.bindingHandlers.maskDecimal = maskDecimalBindingHandler
