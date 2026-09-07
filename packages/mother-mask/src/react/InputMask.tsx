'use client'

import { useEffectEvent, useImperativeHandle, useLayoutEffect, useReducer, useRef, useState } from 'react'
import type { ComponentPropsWithRef } from 'react'
import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'
import { disposePreservingProps, useInputLifecycle } from './input-lifecycle'

export type InputMaskProps = Omit<
  ComponentPropsWithRef<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'type'
> & {
  mask: MaskPattern
  options?: Omit<BindOptions, 'onChange'>
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

export function InputMask({
  mask,
  options,
  value,
  defaultValue = '',
  onValueChange,
  ref,
  ...inputProps
}: InputMaskProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const bindingRef = useRef<{
    input: HTMLInputElement
    dispose: () => void
  } | null>(null)
  const configurationRef = useRef({ mask, options })
  const [, reconcile] = useReducer((revision: number) => revision + 1, 0)
  const lifecycle = useInputLifecycle(inputRef, reconcile)
  const [initial] = useState(() => ({ value: process(value ?? defaultValue, mask, options), defaultValue }))

  useImperativeHandle(ref, () => inputRef.current!, [])

  // Read the latest committed props without recreating the binding for a new
  // callback identity. This event is only called by the effect-owned binder.
  const handleChange = useEffectEvent((maskedValue: string) => {
    if (!inputProps.readOnly && !inputProps.disabled) onValueChange?.(maskedValue)
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
    const maskChanged = configurationRef.current.mask !== mask || configurationRef.current.options !== options
    const valueChanged = value !== undefined && value !== input.value
    const nextValue = maskChanged || valueChanged
      ? process(value ?? input.value, mask, options)
      : input.value

    // Leave echoed edits untouched: reformatting can restore a separator the
    // user just deleted, and assigning .value can move the caret to the end.
    if (!binding || maskChanged || nextValue !== input.value || lifecycle.resetRequested.current) {
      releaseBinding()
      if (nextValue !== input.value) input.value = nextValue

      // Rebind after external updates so the mask's editing history starts
      // from the new value, rather than the value before the parent update.
      bindingRef.current = {
        input,
        dispose: bind(input, mask, {
          ...options,
          onChange: (maskedValue) => handleChange(maskedValue),
        }),
      }
    }
    configurationRef.current = { mask, options }
    lifecycle.resetRequested.current = false
    // Native reset reads defaultValue synchronously, before its reset event
    // has finished. Controlled fields reset to their current displayed value.
    input.defaultValue = value !== undefined ? input.value : process(initial.defaultValue, mask, options)
  })

  // The wrapper controls the DOM through the mask; React must not overwrite
  // the mask's intermediate edits through a native input value prop.
  return <input {...inputProps} ref={inputRef} type="text" defaultValue={initial.value} />
}
