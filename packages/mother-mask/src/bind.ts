import { buildMask, getMaxLength } from './mask'
import { isIos } from './platform'
import type { BindOptions, MaskPattern } from './types'

const MASKED_ATTR = 'data-masked'

function toBindOptions(
  third: BindOptions | ((value: string) => void) | null | undefined,
): BindOptions {
  if (third == null) return {}
  if (typeof third === 'function') return { onChange: third }
  return third
}

/**
 * Bind a mask pattern to an input element.
 *
 * Idempotent — calling `bind()` on an already-bound element has no effect.
 * The element receives a `data-masked` attribute marking it as bound.
 *
 * Returns a function that removes listeners and clears `data-masked` so the
 * element can be bound again later.
 *
 * @param input - Any `HTMLInputElement` or `Element` that behaves like one.
 * @param mask - A single pattern string or an ordered array (shortest → longest).
 * @param options - Optional `{ onChange }`, or pass a callback (legacy) as the third argument.
 */
export function bind(
  input: HTMLInputElement | Element,
  mask: MaskPattern,
  options?: BindOptions | null,
): () => void
export function bind(
  input: HTMLInputElement | Element,
  mask: MaskPattern,
  onChange: ((value: string) => void) | null,
): () => void
export function bind(
  input: HTMLInputElement | Element,
  mask: MaskPattern,
  third?: BindOptions | ((value: string) => void) | null,
): () => void {
  if (input.getAttribute(MASKED_ATTR) !== null) return () => {}

  const { onChange } = toBindOptions(third)

  /** Attribute names set by this bind call; removed on dispose so a later `bind()` can re-apply. */
  const attrsSetHere: string[] = []
  const setIfMissing = (name: string, value: string): void => {
    if (!input.hasAttribute(name)) {
      input.setAttribute(name, value)
      attrsSetHere.push(name)
    }
  }

  input.setAttribute(MASKED_ATTR, Array.isArray(mask) ? mask.join('|') : mask)
  setIfMissing('autocomplete', 'off')
  setIfMissing('autocorrect', 'off')
  setIfMissing('autocapitalize', 'off')
  setIfMissing('spellcheck', 'false')
  setIfMissing('maxlength', String(getMaxLength(mask)))

  let lockInput = false

  const keyEventName = isIos() ? 'keyup' : 'keydown'

  const onPaste = (e: Event): void => {
    const target = e.target as HTMLInputElement
    requestAnimationFrame(() => {
      const m = buildMask(target.value, mask)
      target.value = m.process()
      onChange?.(target.value)
    })
  }

  const onKey = (e: Event): void => {
    const ke = e as KeyboardEvent
    const target = ke.target as HTMLInputElement
    const oldValue = target.value

    // Older Android WebViews may fire key events without a `key` value.
    if (!(ke as { key?: string }).key) {
      lockInput = true
      requestAnimationFrame(() => {
        const pos = target.selectionStart ?? 999
        const m = buildMask(target.value, mask, pos)
        target.value = m.process()
        target.setSelectionRange(m.caret, m.caret)
        requestAnimationFrame(() => {
          lockInput = false
        })
      })
      return
    }

    if (ke.key === 'Meta') return

    const isBackspace = ke.key === 'Backspace'
    const isDelete = ke.key === 'Delete'
    const isCharInsert = ke.key.length === 1 && !ke.ctrlKey && !ke.altKey && !ke.metaKey
    const isUnidentified = ke.key === 'Unidentified'

    // Block inserting when mask is full (desktop only — iOS handles this natively)
    if (isCharInsert && target.selectionStart === target.selectionEnd) {
      if (oldValue.length >= getMaxLength(mask) && !isIos()) {
        ke.preventDefault()
        return
      }
    }

    if (lockInput) {
      ke.preventDefault()
      return
    }

    lockInput = true
    requestAnimationFrame(() => {
      const pos = target.selectionStart ?? 999
      const m = buildMask(target.value, mask, pos)
      target.value = m.process()

      if (isUnidentified) {
        const newPos = target.value.length > oldValue.length ? m.caret : pos
        target.setSelectionRange(newPos, newPos)
      } else if (isDelete) {
        const newPos = oldValue.length === target.value.length ? pos + 1 : pos
        target.setSelectionRange(newPos, newPos)
      } else if (isBackspace) {
        target.setSelectionRange(pos, pos)
      } else if (isCharInsert) {
        target.setSelectionRange(m.caret, m.caret)
      }

      onChange?.(target.value)
      requestAnimationFrame(() => {
        lockInput = false
      })
    })
  }

  input.addEventListener('paste', onPaste)
  input.addEventListener(keyEventName, onKey)

  return () => {
    input.removeEventListener('paste', onPaste)
    input.removeEventListener(keyEventName, onKey)
    input.removeAttribute(MASKED_ATTR)
    for (const name of attrsSetHere) input.removeAttribute(name)
  }
}
