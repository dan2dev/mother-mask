import type { Directive } from 'vue'
import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

export interface MaskDirectiveParams {
  mask: MaskPattern
  options?: Omit<BindOptions, 'onChange'>
  value?: string
  onValueChange?: (value: string) => void
}

interface MaskDirectiveState {
  current: MaskDirectiveParams
  dispose: (() => void) | null
  lastEmitted: string | null
}

// A Vue directive definition object is shared across every element it's
// bound to (unlike a Svelte action or Solid directive, both invoked fresh
// per element with their own closure) — per-element state is keyed here by
// the element instead.
const states = new WeakMap<HTMLInputElement, MaskDirectiveState>()

function release(state: MaskDirectiveState) {
  state.dispose?.()
  state.dispose = null
}

function rebind(element: HTMLInputElement, state: MaskDirectiveState) {
  release(state)
  const { mask, options, value } = state.current
  const source = value ?? element.value
  const next = process(source, mask, options)
  if (element.value !== next) element.value = next
  state.dispose = bind(element, mask, {
    ...options,
    onChange: (maskedValue) => {
      state.lastEmitted = maskedValue
      state.current.onValueChange?.(maskedValue)
    },
  })
}

function sync(element: HTMLInputElement, state: MaskDirectiveState, next: MaskDirectiveParams) {
  const prev = state.current
  // An echo of our own onChange shows up as an update with an unchanged
  // mask/options and a value we just emitted — leave the live binding and
  // its editing state alone.
  const configChanged = next.mask !== prev.mask || next.options !== prev.options
  const externalValueChange = next.value !== undefined && next.value !== state.lastEmitted && next.value !== element.value
  state.current = next
  if (configChanged || externalValueChange) rebind(element, state)
}

/**
 * Vue custom directive wrapping {@link bind}: `v-mother-mask="{ mask, options, value, onValueChange }"`.
 *
 * Exported pre-named `vMotherMask` — Vue's own convention for a local
 * directive in `<script setup>` is a top-level binding whose name is
 * `v` + PascalCase, so `import { vMotherMask } from 'mother-mask/vue'`
 * makes `v-mother-mask` available with no import rename. Register it
 * globally instead with `app.directive('mother-mask', vMotherMask)` to make
 * `v-mother-mask` available in every component.
 *
 * `mounted` runs only once Vue mounts the element to the live DOM — Vue
 * never invokes directive hooks during server-side rendering, so this is
 * SSR-safe with no `typeof window` guard needed. `updated` runs on every
 * re-render of the owning component (not only when the bound value actually
 * changes), so it rebinds only if the mask, options, or an externally-set
 * value actually changed. `beforeUnmount` guarantees `dispose()` runs
 * exactly once.
 */
export const vMotherMask: Directive<HTMLInputElement, MaskDirectiveParams> = {
  mounted(element, binding) {
    const state: MaskDirectiveState = { current: binding.value, dispose: null, lastEmitted: null }
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
    vMotherMask: Directive<HTMLInputElement, MaskDirectiveParams>
  }
}
