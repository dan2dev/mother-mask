/** @jsxImportSource preact */
import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { JSX, Ref } from 'preact'
import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

export type InputMaskProps = Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'ref'
> & {
  mask: MaskPattern
  options?: Omit<BindOptions, 'onChange'>
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /**
   * Access to the underlying `<input>`. Named `inputRef` rather than `ref`:
   * Preact treats `ref` on a function component as the built-in element/
   * instance ref (it isn't forwarded as a prop the way React 19 does), so
   * reusing it would need `preact/compat`'s `forwardRef` — extra weight this
   * entry deliberately avoids.
   */
  inputRef?: Ref<HTMLInputElement>
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (typeof ref === 'function') ref(node)
  else if (ref) (ref as { current: T | null }).current = node
}

/**
 * Preact port of the React `InputMask`, trimmed to Preact's smaller hook set
 * (no `useEffectEvent`, no Activity API, no StrictMode double-invoke, no
 * `preact/compat`) to keep the footprint down — the composition/reset edge
 * cases the React version handles for React-DOM's synthetic event layer
 * don't apply here. Binds in `useLayoutEffect` and disposes on every rebind
 * and on unmount.
 */
export function InputMask({
  mask,
  options,
  value,
  defaultValue = '',
  onValueChange,
  inputRef: forwardedRef,
  ...inputProps
}: InputMaskProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const bindingRef = useRef<{ input: HTMLInputElement; dispose: () => void } | null>(null)
  const configurationRef = useRef({ mask, options })
  const latestRef = useRef({ onValueChange, readOnly: inputProps.readOnly, disabled: inputProps.disabled })
  latestRef.current = { onValueChange, readOnly: inputProps.readOnly, disabled: inputProps.disabled }
  const [initial] = useState(() => process(value ?? defaultValue, mask, options))

  const releaseBinding = () => {
    bindingRef.current?.dispose()
    bindingRef.current = null
  }

  // Register cleanup before acquiring a binding.
  useLayoutEffect(() => releaseBinding, [])

  // Reconcile after every commit, including when a parent rejects an edit.
  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) return

    const binding = bindingRef.current
    const maskChanged = configurationRef.current.mask !== mask || configurationRef.current.options !== options
    const valueChanged = value !== undefined && value !== input.value
    const nextValue = maskChanged || valueChanged ? process(value ?? input.value, mask, options) : input.value

    // Leave echoed edits untouched: reformatting can restore a separator the
    // user just deleted, and assigning .value can move the caret to the end.
    if (!binding || maskChanged || nextValue !== input.value) {
      releaseBinding()
      if (nextValue !== input.value) input.value = nextValue

      bindingRef.current = {
        input,
        dispose: bind(input, mask, {
          ...options,
          onChange: (maskedValue) => {
            const latest = latestRef.current
            if (!latest.readOnly && !latest.disabled) latest.onValueChange?.(maskedValue)
          },
        }),
      }
    }
    configurationRef.current = { mask, options }
  })

  // The wrapper controls the DOM through the mask; Preact must not overwrite
  // the mask's intermediate edits through a native input value prop.
  return (
    <input
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
