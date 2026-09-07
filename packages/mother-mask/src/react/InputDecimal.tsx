'use client'

import { useEffectEvent, useImperativeHandle, useLayoutEffect, useReducer, useRef, useState } from 'react'
import type { ComponentPropsWithRef } from 'react'
import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'
import { disposePreservingProps, useInputLifecycle } from './input-lifecycle'

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
    input: HTMLInputElement
    dispose: () => void
  } | null>(null)
  const configurationRef = useRef(options)
  const [, reconcile] = useReducer((revision: number) => revision + 1, 0)
  const lifecycle = useInputLifecycle(inputRef, reconcile)
  const [initial] = useState(() => ({ value: processDecimal(value ?? defaultValue, options), defaultValue }))

  useImperativeHandle(ref, () => inputRef.current!, [])

  // Read the latest committed props without recreating the binding for a new
  // callback identity. This event is only called by the effect-owned binder.
  const handleChange = useEffectEvent((maskedValue: string, numericValue: number) => {
    if (!inputProps.readOnly && !inputProps.disabled) onValueChange?.(maskedValue, numericValue)
    if (value !== undefined) reconcile()
  })

  const releaseBinding = useEffectEvent(() => {
    const binding = bindingRef.current
    if (binding) disposePreservingProps(binding.input, inputProps, binding.dispose)
    bindingRef.current = null
  })

  // Register cleanup before acquiring a binding, including StrictMode replay
  // and React Activity hide/show. Disposed bindings must release their refs.
  useLayoutEffect(() => () => {
    releaseBinding()
  }, [])

  // Reconcile after every commit, including when a parent rejects an edit.
  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input || lifecycle.composing.current) return

    const binding = bindingRef.current
    const optionsChanged = configurationRef.current !== options
    const valueChanged = value !== undefined && value !== input.value
    const nextValue = optionsChanged || valueChanged
      ? processDecimal(value ?? input.value, options)
      : input.value

    // An echoed edit already has the mask's value and caret. Leave it alone
    // so typing in the fraction or in the middle of the integer stays natural.
    if (!binding || optionsChanged || nextValue !== input.value || lifecycle.resetRequested.current) {
      releaseBinding()
      if (nextValue !== input.value) input.value = nextValue

      // External updates start a fresh binding and cancel pending edit frames.
      bindingRef.current = {
        input,
        dispose: bindDecimal(input, {
          ...options,
          onChange: (maskedValue, numericValue) => handleChange(maskedValue, numericValue),
        }),
      }
    }
    configurationRef.current = options
    lifecycle.resetRequested.current = false
    input.defaultValue = value !== undefined ? input.value : processDecimal(initial.defaultValue, options)
  })

  // The wrapper synchronizes value through the mask instead of letting React
  // overwrite the native input's intermediate edits.
  return <input inputMode="decimal" {...inputProps} ref={inputRef} type="text" defaultValue={initial.value} />
}
