import type { MaskPattern } from './mask'
import { buildMask, getMaxLength } from './mask'

const MASKED_ATTR = 'data-masked'

let cachedIsIos: boolean | undefined

function isIos(): boolean {
  if (cachedIsIos !== undefined) return cachedIsIos
  cachedIsIos =
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/i.test(navigator.userAgent)
  return cachedIsIos
}

/**
 * Bind a mask pattern to an input element.
 *
 * Idempotent — calling `bind()` on an already-bound element has no effect.
 * The element receives a `data-masked` attribute marking it as bound.
 *
 * @param input   - Any `HTMLInputElement` or `Element` that behaves like one.
 * @param mask    - A single pattern string or an ordered array (shortest → longest).
 * @param callback - Optional callback called with the masked value on every change.
 */
export function bind(
  input: HTMLInputElement | Element,
  mask: MaskPattern,
  callback: ((value: string) => void) | null = null,
): void {
  if (input.getAttribute(MASKED_ATTR) !== null) return

  input.setAttribute(MASKED_ATTR, Array.isArray(mask) ? mask.join('|') : mask)
  input.setAttribute('autocomplete', 'off')
  input.setAttribute('autocorrect', 'off')
  input.setAttribute('autocapitalize', 'off')
  input.setAttribute('spellcheck', 'false')
  input.setAttribute('maxlength', String(getMaxLength(mask)))

  let lockInput = false

  input.addEventListener('paste', (e: Event) => {
    const target = e.target as HTMLInputElement
    requestAnimationFrame(() => {
      const m = buildMask(target.value, mask)
      target.value = m.process()
      callback?.(target.value)
    })
  })

  input.addEventListener(isIos() ? 'keyup' : 'keydown', (e: Event) => {
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

      callback?.(target.value)
      requestAnimationFrame(() => {
        lockInput = false
      })
    })
  })
}
