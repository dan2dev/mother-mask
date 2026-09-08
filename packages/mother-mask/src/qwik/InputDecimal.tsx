/** @jsxImportSource @builder.io/qwik */
import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik'
import type { PropFunction, QwikIntrinsicElements } from '@builder.io/qwik'
import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

export type InputDecimalProps = Omit<QwikIntrinsicElements['input'], 'value' | 'onInput$' | 'type' | 'ref'> & {
  options?: Omit<BindDecimalOptions, 'onChange'>
  value?: string
  'onValueChange$'?: PropFunction<(value: string, numericValue: number) => void>
}

/** Qwik wrapper around {@link bindDecimal} — see {@link InputMask} for the lifecycle notes. */
export const InputDecimal = component$<InputDecimalProps>(({ options, value, onValueChange$, ...inputProps }) => {
  const inputRef = useSignal<HTMLInputElement>()
  const lastEmitted = useSignal<string | null>(null)
  const lastOptions = useSignal<Omit<BindDecimalOptions, 'onChange'>>()
  const initial = processDecimal(value ?? '', options)

  useVisibleTask$(({ track, cleanup }) => {
    const trackedOptions = track(() => options)
    const trackedValue = track(() => value)
    const input = inputRef.value
    if (!input) return

    const optionsChanged = trackedOptions !== lastOptions.value
    if (!optionsChanged && trackedValue === lastEmitted.value) return

    const next = processDecimal(trackedValue ?? input.value, trackedOptions)
    if (input.value !== next) input.value = next

    const dispose = bindDecimal(input, {
      ...trackedOptions,
      onChange: (maskedValue, numericValue) => {
        lastEmitted.value = maskedValue
        onValueChange$?.(maskedValue, numericValue)
      },
    })
    lastOptions.value = trackedOptions
    cleanup(() => dispose())
  })

  return <input inputMode="decimal" {...inputProps} ref={inputRef} type="text" value={initial} />
})
