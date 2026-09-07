import { useLayoutEffect, useRef } from 'react'
import type { ComponentPropsWithRef, RefObject } from 'react'

/** Observe native events before the binder and React's delegated handlers. */
export function useInputLifecycle(inputRef: RefObject<HTMLInputElement | null>, reconcile: () => void) {
  const composing = useRef(false)
  const resetRequested = useRef(false)

  useLayoutEffect(() => {
    const input = inputRef.current!
    let active = true
    const onCompositionStart = () => { composing.current = true }
    const onCompositionEnd = () => {
      composing.current = false
      reconcile()
    }
    const onReset = (event: Event) => {
      if (event.target !== input.form) return
      // reset fires before its default action. Wait for it, and honor a
      // preventDefault from any React/native handler later in propagation.
      queueMicrotask(() => {
        if (!active || event.defaultPrevented) return
        composing.current = false
        resetRequested.current = true
        reconcile()
      })
    }
    input.addEventListener('compositionstart', onCompositionStart, true)
    input.addEventListener('compositionend', onCompositionEnd, true)
    // Capture also covers form="id" and a stopped bubbling reset event.
    input.ownerDocument.addEventListener('reset', onReset, true)
    return () => {
      active = false
      composing.current = false
      resetRequested.current = false
      input.removeEventListener('compositionstart', onCompositionStart, true)
      input.removeEventListener('compositionend', onCompositionEnd, true)
      input.ownerDocument.removeEventListener('reset', onReset, true)
    }
  }, [inputRef, reconcile])

  return { composing, resetRequested }
}

/** A binder may own an attribute that React has since explicitly updated. */
export function disposePreservingProps(
  input: HTMLInputElement,
  props: ComponentPropsWithRef<'input'>,
  dispose: () => void,
) {
  const names = [
    ['autocomplete', 'autoComplete'], ['autocorrect', 'autoCorrect'],
    ['autocapitalize', 'autoCapitalize'], ['spellcheck', 'spellCheck'],
    ['maxlength', 'maxLength'],
  ] as const
  const attributes = names.flatMap(([attribute, prop]) => {
    const value = input.getAttribute(attribute)
    return props[prop] != null && value !== null ? [[attribute, value] as const] : []
  })
  dispose()
  for (const [name, value] of attributes) input.setAttribute(name, value)
}
