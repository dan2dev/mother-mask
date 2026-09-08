/** @jsxImportSource octane */
import { useLayoutEffect, useRef, useState } from 'octane'
import type { Octane } from 'octane/jsx-runtime'
import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

export type InputDecimalProps = Omit<
  Octane.DetailedHTMLProps<Octane.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'inputMode' | 'ref'
> & {
  options?: Omit<BindDecimalOptions, 'onChange'>
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, numericValue: number) => void
  /** See {@link InputMask}'s `inputRef` for why this isn't named `ref`. */
  inputRef?: Octane.Ref<HTMLInputElement>
}

function assignRef(ref: Octane.Ref<HTMLInputElement> | undefined, node: HTMLInputElement | null): void {
  if (typeof ref === 'function') ref(node)
  else if (ref && !Array.isArray(ref)) (ref as { current: HTMLInputElement | null }).current = node
}

/** Octane function component wrapping {@link bindDecimal} — see {@link InputMask} for the full lifecycle notes. */
export function InputDecimal({
  options,
  value,
  defaultValue = '',
  onValueChange,
  inputRef: forwardedRef,
  ...inputProps
}: InputDecimalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const bindingRef = useRef<{ dispose: () => void } | null>(null)
  const configurationRef = useRef({ options })
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
    const optionsChanged = configurationRef.current.options !== options
    const valueChanged = value !== undefined && value !== input.value
    const nextValue = optionsChanged || valueChanged ? processDecimal(value ?? input.value, options) : input.value

    if (!binding || optionsChanged || nextValue !== input.value) {
      releaseBinding()
      if (nextValue !== input.value) input.value = nextValue

      bindingRef.current = {
        dispose: bindDecimal(input, {
          ...options,
          onChange: (maskedValue, numericValue) => {
            const latest = latestRef.current
            if (!latest.readOnly && !latest.disabled) latest.onValueChange?.(maskedValue, numericValue)
          },
        }),
      }
    }
    configurationRef.current = { options }
  })

  return (
    <input
      {...inputProps}
      ref={(node: HTMLInputElement | null) => {
        inputRef.current = node
        assignRef(forwardedRef, node)
      }}
      type="text"
      inputMode="decimal"
      defaultValue={initial}
    />
  )
}
