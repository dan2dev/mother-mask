import { useEffectEvent, useImperativeHandle, useLayoutEffect, useReducer, useRef, useState } from 'react'
import type { ComponentPropsWithRef } from 'react'
import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

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
    mask: MaskPattern
    options: InputMaskProps['options']
    dispose: () => void
  } | null>(null)
  const [, reconcile] = useReducer((revision: number) => revision + 1, 0)
  const [initialValue] = useState(() => process(value ?? defaultValue, mask, options))

  useImperativeHandle(ref, () => inputRef.current!, [])

  // Read the latest committed props without recreating the binding for a new
  // callback identity. This event is only called by the effect-owned binder.
  const handleChange = useEffectEvent((maskedValue: string) => {
    onValueChange?.(maskedValue)
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
    const maskChanged = binding !== null && (binding.mask !== mask || binding.options !== options)
    const valueChanged = value !== undefined && value !== input.value
    const nextValue = maskChanged || valueChanged
      ? process(value ?? input.value, mask, options)
      : input.value

    // Leave echoed edits untouched: reformatting can restore a separator the
    // user just deleted, and assigning .value can move the caret to the end.
    if (!binding || maskChanged || nextValue !== input.value) {
      binding?.dispose()
      if (nextValue !== input.value) input.value = nextValue

      // Rebind after external updates so the mask's editing history starts
      // from the new value, rather than the value before the parent update.
      bindingRef.current = {
        mask,
        options,
        dispose: bind(input, mask, {
          ...options,
          onChange: (maskedValue) => handleChange(maskedValue),
        }),
      }
    }
  })

  // The wrapper controls the DOM through the mask; React must not overwrite
  // the mask's intermediate edits through a native input value prop.
  return <input {...inputProps} ref={inputRef} type="text" defaultValue={initialValue} />
}
