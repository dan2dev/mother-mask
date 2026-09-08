/** @jsxImportSource @builder.io/qwik */
import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik'
import type { PropFunction, QwikIntrinsicElements } from '@builder.io/qwik'
import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

export type InputMaskProps = Omit<QwikIntrinsicElements['input'], 'value' | 'onInput$' | 'type' | 'ref'> & {
  mask: MaskPattern
  options?: Omit<BindOptions, 'onChange'>
  value?: string
  'onValueChange$'?: PropFunction<(value: string) => void>
}

/**
 * Qwik wrapper around {@link bind}.
 *
 * `useVisibleTask$` is the binding lifecycle: it only ever runs on the
 * client, once this element becomes visible — Qwik's SSR renderer never
 * executes it, so this is safe to render on the server with no
 * `typeof window` guard. `cleanup()` — called both before every re-run and
 * when the component unmounts — guarantees `dispose()` runs exactly once
 * per binding. `track()` makes the task reactive: it reruns whenever
 * `mask`, `options`, or `value` change, rebinding only if the mask,
 * options, or an externally-set value actually changed (an echo of this
 * component's own `onValueChange$` is ignored).
 */
export const InputMask = component$<InputMaskProps>(({ mask, options, value, onValueChange$, ...inputProps }) => {
  const inputRef = useSignal<HTMLInputElement>()
  const lastEmitted = useSignal<string | null>(null)
  const lastMask = useSignal<MaskPattern>()
  const lastOptions = useSignal<Omit<BindOptions, 'onChange'>>()
  const initial = process(value ?? '', mask, options)

  useVisibleTask$(({ track, cleanup }) => {
    const trackedMask = track(() => mask)
    const trackedOptions = track(() => options)
    const trackedValue = track(() => value)
    const input = inputRef.value
    if (!input) return

    const maskChanged = trackedMask !== lastMask.value
    const optionsChanged = trackedOptions !== lastOptions.value
    // An echo of our own onValueChange$ shows up as a rerun with an
    // unchanged mask/options and a value we just emitted — leave the live
    // binding and its editing state alone.
    if (!maskChanged && !optionsChanged && trackedValue === lastEmitted.value) return

    const next = process(trackedValue ?? input.value, trackedMask, trackedOptions)
    if (input.value !== next) input.value = next

    const dispose = bind(input, trackedMask, {
      ...trackedOptions,
      onChange: (maskedValue) => {
        lastEmitted.value = maskedValue
        onValueChange$?.(maskedValue)
      },
    })
    lastMask.value = trackedMask
    lastOptions.value = trackedOptions
    cleanup(() => dispose())
  })

  // The wrapper controls the DOM through the mask; only the initial value
  // is rendered here — Qwik must not fight the mask's intermediate edits.
  return <input {...inputProps} ref={inputRef} type="text" value={initial} />
})
