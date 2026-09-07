/** @jsxImportSource preact */
import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { JSX, Ref } from 'preact'
import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

export type InputDecimalProps = Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'ref'
> & {
  options?: Omit<BindDecimalOptions, 'onChange'>
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, numericValue: number) => void
  /** See {@link InputMask}'s `inputRef` for why this isn't named `ref`. */
  inputRef?: Ref<HTMLInputElement>
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (typeof ref === 'function') ref(node)
  else if (ref) (ref as { current: T | null }).current = node
}

/** Preact port of the React `InputDecimal` — see {@link InputMask} for the lifecycle notes. */
export function InputDecimal({
  options,
  value,
  defaultValue = '',
  onValueChange,
  inputRef: forwardedRef,
  ...inputProps
}: InputDecimalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const bindingRef = useRef<{ input: HTMLInputElement; dispose: () => void } | null>(null)
  const configurationRef = useRef(options)
  const latestRef = useRef({ onValueChange, readOnly: inputProps.readOnly, disabled: inputProps.disabled })
  latestRef.current = { onValueChange, readOnly: inputProps.readOnly, disabled: inputProps.disabled }
  const [initial] = useState(() => processDecimal(value ?? defaultValue, options))

  const releaseBinding = () => {
    bindingRef.current?.dispose()
    bindingRef.current = null
  }

  useLayoutEffect(() => releaseBinding, [])

  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) return

    const binding = bindingRef.current
    const optionsChanged = configurationRef.current !== options
    const valueChanged = value !== undefined && value !== input.value
    const nextValue = optionsChanged || valueChanged ? processDecimal(value ?? input.value, options) : input.value

    if (!binding || optionsChanged || nextValue !== input.value) {
      releaseBinding()
      if (nextValue !== input.value) input.value = nextValue

      bindingRef.current = {
        input,
        dispose: bindDecimal(input, {
          ...options,
          onChange: (maskedValue, numericValue) => {
            const latest = latestRef.current
            if (!latest.readOnly && !latest.disabled) latest.onValueChange?.(maskedValue, numericValue)
          },
        }),
      }
    }
    configurationRef.current = options
  })

  return (
    <input
      inputMode="decimal"
      {...inputProps}
      ref={(node) => {
        inputRef.current = node
        assignRef(forwardedRef, node)
      }}
      type="text"
      defaultValue={initial}
    />
  )
}
