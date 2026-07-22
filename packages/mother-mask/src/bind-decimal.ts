import {
  applyDecimalMask,
  applyDecimalMaskReplacingLoneZero,
  applyDecimalMaskUnmergingSeparator,
  resolveDecimalOptions,
  unmaskDecimal,
} from './decimal-mask'
import { isIos } from './platform'
import type { BindDecimalOptions, DecimalMaskOptions, MaskResult } from './types'

const MASKED_ATTR = 'data-masked'

function toBindDecimalOptions(
  second:
    | BindDecimalOptions
    | ((value: string, numericValue: number) => void)
    | null
    | undefined,
): BindDecimalOptions {
  if (second == null) return {}
  if (typeof second === 'function') return { onChange: second }
  return second
}

function isDigitKey(key: string): boolean {
  return key.length === 1 && key >= '0' && key <= '9'
}

/**
 * Bind a decimal/currency mask to an input element.
 *
 * Same contract as {@link bind}: idempotent (marked with `data-masked`),
 * returns a dispose function, and reformats on paste and keyboard-driven
 * changes via `requestAnimationFrame`. Unlike the pattern masks, there is no
 * fixed pattern — the integer part grows and shrinks freely; formatting is
 * driven entirely by `options`.
 *
 * @param input - Any `HTMLInputElement` or `Element` that behaves like one.
 * @param options - `DecimalMaskOptions` plus an optional `onChange`, or pass a callback (legacy) directly.
 */
export function bindDecimal(
  input: HTMLInputElement | Element,
  options?: BindDecimalOptions | null,
): () => void
export function bindDecimal(
  input: HTMLInputElement | Element,
  onChange: ((value: string, numericValue: number) => void) | null,
): () => void
export function bindDecimal(
  input: HTMLInputElement | Element,
  second?: BindDecimalOptions | ((value: string, numericValue: number) => void) | null,
): () => void {
  if (input.getAttribute(MASKED_ATTR) !== null) return () => {}

  const { onChange, ...maskOptions } = toBindDecimalOptions(second)
  const decimalOptions: DecimalMaskOptions = maskOptions
  const { decimalSeparator, decimalPlaces } = resolveDecimalOptions(decimalOptions)

  const attrsSetHere: string[] = []
  const setIfMissing = (name: string, value: string): void => {
    if (!input.hasAttribute(name)) {
      input.setAttribute(name, value)
      attrsSetHere.push(name)
    }
  }

  input.setAttribute(MASKED_ATTR, 'decimal')
  setIfMissing('autocomplete', 'off')
  setIfMissing('autocorrect', 'off')
  setIfMissing('autocapitalize', 'off')
  setIfMissing('spellcheck', 'false')

  let lockInput = false
  const keyEventName = isIos() ? 'keyup' : 'keydown'

  // requestAnimationFrame callbacks scheduled below outlive a single keystroke
  // handler and close over `target` (the input element). If `dispose()` runs
  // before a frame fires — e.g. the field unmounts right after the user types
  // — the uncancelled callback keeps that element (and this closure) alive
  // until the next paint, which can be a very long time on a backgrounded
  // tab. Track every scheduled frame so dispose can cancel what's pending.
  const pendingFrames = new Set<number>()
  const scheduleFrame = (callback: () => void): void => {
    const id = requestAnimationFrame(() => {
      pendingFrames.delete(id)
      callback()
    })
    pendingFrames.add(id)
  }

  const applyResult = (target: HTMLInputElement, m: MaskResult): void => {
    target.value = m.value
    target.setSelectionRange(m.caret, m.caret)
    onChange?.(m.value, unmaskDecimal(m.value, decimalOptions))
  }

  const onPaste = (e: Event): void => {
    const target = e.target as HTMLInputElement
    scheduleFrame(() => {
      applyResult(target, applyDecimalMask(target.value, target.value.length, decimalOptions))
    })
  }

  const onKey = (e: Event): void => {
    const ke = e as KeyboardEvent
    const target = ke.target as HTMLInputElement

    // Older Android WebViews may fire key events without a `key` value.
    if (!(ke as { key?: string }).key) {
      lockInput = true
      scheduleFrame(() => {
        const pos = target.selectionStart ?? target.value.length
        applyResult(target, applyDecimalMask(target.value, pos, decimalOptions))
        scheduleFrame(() => {
          lockInput = false
        })
      })
      return
    }

    if (ke.key === 'Meta') return

    // `lockInput` is only set by the Android WebView path above; block normal
    // key events while that asynchronous path is in flight.
    if (lockInput) {
      ke.preventDefault()
      return
    }

    const isBackspace = ke.key === 'Backspace'
    const isDelete = ke.key === 'Delete'
    const isCharInsert = ke.key.length === 1 && !ke.ctrlKey && !ke.altKey && !ke.metaKey

    // Navigation (arrows, Home/End, Tab, ...), selection, and shortcut keys
    // (Ctrl/Cmd+A, Ctrl/Cmd+C, ...) don't change the text — leave the
    // browser's native caret/selection handling alone instead of recomputing
    // and overwriting it on every keystroke.
    if (!isBackspace && !isDelete && !isCharInsert) return

    // Everything below reads `target.value`/`selectionStart` inside the rAF
    // callback rather than synchronously here, since the browser's native
    // character insertion for this keystroke isn't guaranteed to have landed
    // yet at the point a keydown listener runs — only by the next frame.
    scheduleFrame(() => {
      const pos = target.selectionStart ?? target.value.length

      // Backspace that just deleted the decimal separator merges the
      // integer and fraction digit runs into one continuous stream —
      // restore the boundary instead of treating that as one big integer.
      if (isBackspace) {
        const unmerged = applyDecimalMaskUnmergingSeparator(target.value, decimalOptions)
        if (unmerged) {
          applyResult(target, unmerged)
          return
        }
      }

      // A numeric keypad (or a locale mismatch) may only offer "." or ",".
      // Normalize whichever one the user just typed to the configured
      // `decimalSeparator` so it reliably opens the fraction segment.
      if (
        decimalPlaces > 0 &&
        (ke.key === '.' || ke.key === ',') &&
        ke.key !== decimalSeparator &&
        pos > 0 &&
        target.value[pos - 1] === ke.key
      ) {
        target.value = target.value.slice(0, pos - 1) + decimalSeparator + target.value.slice(pos)
      }

      // Typing a digit into a field whose integer part is still the
      // auto-inserted "0" placeholder replaces that zero instead of
      // combining with it (e.g. "$0.00" + "2" → "$2.00", not "$20.00").
      const replaced = isDigitKey(ke.key)
        ? applyDecimalMaskReplacingLoneZero(target.value, pos, ke.key, decimalOptions)
        : null

      applyResult(target, replaced ?? applyDecimalMask(target.value, pos, decimalOptions))
    })
  }

  input.addEventListener('paste', onPaste)
  input.addEventListener(keyEventName, onKey)

  return () => {
    input.removeEventListener('paste', onPaste)
    input.removeEventListener(keyEventName, onKey)
    input.removeAttribute(MASKED_ATTR)
    for (const name of attrsSetHere) input.removeAttribute(name)
    for (const id of pendingFrames) cancelAnimationFrame(id)
    pendingFrames.clear()
  }
}
