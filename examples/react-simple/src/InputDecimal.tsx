import { useEffectEvent, useImperativeHandle, useLayoutEffect, useReducer, useRef, useState } from 'react'
import type { ComponentPropsWithRef } from 'react'
import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

export type InputDecimalProps = Omit<
  ComponentPropsWithRef<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'type'
> & {
  options?: Omit<BindDecimalOptions, 'onChange'>
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, numericValue: number) => void
}

export function InputDecimal({
  options,
  value,
  defaultValue = '',
  onValueChange,
  ref,
  ...inputProps
}: InputDecimalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const bindingRef = useRef<{
    options: InputDecimalProps['options']
    dispose: () => void
  } | null>(null)
  const [, reconcile] = useReducer((revision: number) => revision + 1, 0)
  const [initialValue] = useState(() => processDecimal(value ?? defaultValue, options))

  useImperativeHandle(ref, () => inputRef.current!, [])

  // Read the latest committed props without recreating the binding for a new
  // callback identity. This event is only called by the effect-owned binder.
  const handleChange = useEffectEvent((maskedValue: string, numericValue: number) => {
    onValueChange?.(maskedValue, numericValue)
    if (value !== undefined) reconcile()
  })

  // Register cleanup before acquiring a binding, including StrictMode replay
  // and React Activity hide/show. Disposed bindings must release their refs.
  useLayoutEffect(() => () => {
    bindingRef.current?.dispose()
    bindingRef.current = null
  }, [])

  // Reconcile after every commit, including when a parent rejects an edit.
  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) return

    const binding = bindingRef.current
    const optionsChanged = binding !== null && binding.options !== options
    const valueChanged = value !== undefined && value !== input.value
    const nextValue = optionsChanged || valueChanged
      ? processDecimal(value ?? input.value, options)
      : input.value

    // An echoed edit already has the mask's value and caret. Leave it alone
    // so typing in the fraction or in the middle of the integer stays natural.
    if (!binding || optionsChanged || nextValue !== input.value) {
      binding?.dispose()
      if (nextValue !== input.value) input.value = nextValue

      // External updates start a fresh binding and cancel pending edit frames.
      bindingRef.current = {
        options,
        dispose: bindDecimal(input, {
          ...options,
          onChange: (maskedValue, numericValue) => handleChange(maskedValue, numericValue),
        }),
      }
    }
  })

  // The wrapper synchronizes value through the mask instead of letting React
  // overwrite the native input's intermediate edits.
  return <input inputMode="decimal" {...inputProps} ref={inputRef} type="text" defaultValue={initialValue} />
}
