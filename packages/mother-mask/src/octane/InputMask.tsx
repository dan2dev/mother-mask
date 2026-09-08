/** @jsxImportSource octane */
import { useLayoutEffect, useRef, useState } from 'octane'
import type { Octane } from 'octane/jsx-runtime'
import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

export type InputMaskProps = Omit<
  Octane.DetailedHTMLProps<Octane.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'ref'
> & {
  mask: MaskPattern
  options?: Omit<BindOptions, 'onChange'>
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /**
   * Access to the underlying `<input>`. Named `inputRef` rather than `ref`,
   * matching the Preact entry: this is a plain function component (no
   * `forwardRef` indirection), so accepting `ref` directly here would
   * collide with the `ref={inputRef}` this component sets on the element
   * itself to wire up the binding.
   */
  inputRef?: Octane.Ref<HTMLInputElement>
}

function assignRef(ref: Octane.Ref<HTMLInputElement> | undefined, node: HTMLInputElement | null): void {
  if (typeof ref === 'function') ref(node)
  else if (ref && !Array.isArray(ref)) (ref as { current: HTMLInputElement | null }).current = node
}

/**
 * Octane function component wrapping {@link bind} — a straight port of the
 * Preact `InputMask` to Octane's own hook set (`useRef`/`useLayoutEffect`/
 * `useState`, all React-shaped by design). Distributed as raw `.tsx` source
 * rather than pre-bundled: Octane's own publishing guidance is to ship
 * component libraries as source and let the *consuming app's* Octane
 * toolchain compile them, since components compile down to direct DOM
 * update code keyed to that build's own hook slots — a step this package
 * cannot safely perform on a consumer's behalf during its own `tsdown`
 * build. The `@jsxImportSource octane` pragma above is what opts this file
 * into Octane's compiler in a mixed toolchain (see `requireDirective` in
 * Octane's Vite/Rspack plugins).
 *
 * Binds in `useLayoutEffect`, so it never runs during SSR (Octane's server
 * renderer doesn't execute effects) — no `typeof window` guard needed.
 * Reconciles on every commit, rebinding only if the mask/options change or
 * `value` is set externally; an echo of this component's own
 * `onValueChange` is ignored. The returned cleanup guarantees `dispose()`
 * runs exactly once per binding, including on unmount.
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
  const inputRef = useRef<HTMLInputElement | null>(null)
  const bindingRef = useRef<{ dispose: () => void } | null>(null)
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

  // The wrapper controls the DOM through the mask; Octane must not overwrite
  // the mask's intermediate edits through a native input value prop.
  return (
    <input
      {...inputProps}
      ref={(node: HTMLInputElement | null) => {
        inputRef.current = node
        assignRef(forwardedRef, node)
      }}
      type="text"
      defaultValue={initial}
    />
  )
}
