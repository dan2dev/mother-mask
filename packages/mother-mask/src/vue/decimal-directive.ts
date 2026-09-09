import type { Directive } from 'vue'
import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

export interface DecimalDirectiveParams {
  options?: Omit<BindDecimalOptions, 'onChange'>
  value?: string
  onValueChange?: (value: string, numericValue: number) => void
}

interface DecimalDirectiveState {
  current: DecimalDirectiveParams
  dispose: (() => void) | null
  lastEmitted: string | null
}

const states = new WeakMap<HTMLInputElement, DecimalDirectiveState>()

function release(state: DecimalDirectiveState) {
  state.dispose?.()
  state.dispose = null
}

function rebind(element: HTMLInputElement, state: DecimalDirectiveState) {
  release(state)
  const { options, value } = state.current
  const source = value ?? element.value
  const next = processDecimal(source, options)
  if (element.value !== next) element.value = next
  state.dispose = bindDecimal(element, {
    ...options,
    onChange: (maskedValue, numericValue) => {
      state.lastEmitted = maskedValue
      state.current.onValueChange?.(maskedValue, numericValue)
    },
  })
}

function sync(element: HTMLInputElement, state: DecimalDirectiveState, next: DecimalDirectiveParams) {
  const prev = state.current
  const configChanged = next.options !== prev.options
  const externalValueChange = next.value !== undefined && next.value !== state.lastEmitted && next.value !== element.value
  state.current = next
  if (configChanged || externalValueChange) rebind(element, state)
}

/**
 * Vue custom directive wrapping {@link bindDecimal}: `v-mother-mask-decimal="{ options, value, onValueChange }"`.
 * Exported pre-named `vMotherMaskDecimal`, same naming rationale and
 * directive lifecycle contract as {@link vMotherMask}: `mounted` binds
 * once, `updated` rebinds reactively, `beforeUnmount` guarantees
 * `dispose()`. Always sets `inputmode="decimal"` on mount.
 */
export const vMotherMaskDecimal: Directive<HTMLInputElement, DecimalDirectiveParams> = {
  mounted(element, binding) {
    element.setAttribute('inputmode', 'decimal')
    const state: DecimalDirectiveState = { current: binding.value, dispose: null, lastEmitted: null }
    states.set(element, state)
    rebind(element, state)
  },
  updated(element, binding) {
    // `mounted` always runs first and seeds this element's entry, so it's
    // never missing here — Vue never calls `updated` on an element it
    // hasn't mounted the directive on.
    sync(element, states.get(element)!, binding.value)
  },
  beforeUnmount(element) {
    const state = states.get(element)!
    release(state)
    states.delete(element)
  },
}

declare module 'vue' {
  interface GlobalDirectives {
    vMotherMaskDecimal: Directive<HTMLInputElement, DecimalDirectiveParams>
  }
}
