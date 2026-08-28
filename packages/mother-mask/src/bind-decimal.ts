import {
  createFrameScheduler,
  editStillPending,
  getCaret,
  isAlreadyBound,
  MASKED_ATTR,
  releaseOnce,
  setCaret,
  trackAttrs,
} from './bind-shared'
import {
  applyDecimalMask,
  applyDecimalMaskReplacingLoneZero,
  applyDecimalMaskUnmergingSeparator,
  relocateAffixInsertion,
  resolveDecimalOptions,
  unmaskDecimal,
} from './decimal-mask'
import { isIos } from './platform'
import type { BindDecimalOptions, DecimalMaskOptions, MaskResult } from './types'

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

interface DecimalEdit {
  insertedText?: string | null
  insertedAt?: number
  inputType?: string
}

/**
 * Bind a decimal/currency mask to an input element.
 *
 * Same contract as {@link bind}: idempotent (marked with `data-masked`),
 * returns a dispose function, and reformats post-mutation `input` events with
 * a keyboard/paste fallback for older browsers. Unlike the pattern masks,
 * there is no fixed pattern — the integer part grows and shrinks freely;
 * formatting is driven entirely by `options`.
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
  if (isAlreadyBound(input)) return () => {}

  const { onChange, ...maskOptions } = toBindDecimalOptions(second)
  const decimalOptions: DecimalMaskOptions = maskOptions
  const { decimalSeparator, decimalPlaces } = resolveDecimalOptions(decimalOptions)

  // Attributes set here are removed on dispose so a later `bindDecimal()` can re-apply them.
  const { setIfMissing, removeTracked } = trackAttrs(input)

  input.setAttribute(MASKED_ATTR, 'decimal')
  setIfMissing('autocomplete', 'off')
  setIfMissing('autocorrect', 'off')
  setIfMissing('autocapitalize', 'off')
  setIfMissing('spellcheck', 'false')

  let lockInput = false
  let isComposing = false
  let skipNextKeyup = false
  let pendingSeparatorEdit: { text: string; starts: number[] } | null = null
  const keyEventName = isIos() ? 'keyup' : 'keydown'
  const { scheduleFrame, cancelPendingFrames } = createFrameScheduler()

  const applyResult = (target: HTMLInputElement, m: MaskResult): void => {
    target.value = m.value
    setCaret(target, m.caret)
    onChange?.(m.value, unmaskDecimal(m.value, decimalOptions))
  }

  const formatCurrentValue = (target: HTMLInputElement, edit: DecimalEdit = {}): void => {
    let pos = getCaret(target)

    const normalizeSeparator = (text: string, starts: Array<number | undefined>): boolean => {
      if (
        decimalPlaces === 0 ||
        text.length !== 1 ||
        (text !== '.' && text !== ',') ||
        text === decimalSeparator
      ) {
        return false
      }

      for (const start of starts) {
        if (
          start != null &&
          start >= 0 &&
          target.value.slice(start, start + text.length) === text
        ) {
          target.value =
            target.value.slice(0, start) +
            decimalSeparator +
            target.value.slice(start + text.length)
          pos = start + text.length <= pos ? pos + decimalSeparator.length - text.length : pos
          setCaret(target, pos)
          return true
        }
      }

      return false
    }

    if (pendingSeparatorEdit) {
      const { text, starts } = pendingSeparatorEdit
      pendingSeparatorEdit = null
      normalizeSeparator(text, starts)
    }

    // Backspace that just deleted the decimal separator merges the integer and
    // fraction digit runs into one continuous stream. On mobile this can arrive
    // as an `input` event without a reliable keyboard event, so the special case
    // lives in the shared post-mutation formatter.
    if (edit.inputType === 'deleteContentBackward') {
      const unmerged = applyDecimalMaskUnmergingSeparator(target.value, decimalOptions)
      if (unmerged) {
        applyResult(target, unmerged)
        return
      }
    }

    // A numeric keypad (or a locale mismatch) may only offer "." or ",".
    // Normalize whichever one was just inserted to the configured
    // `decimalSeparator` before parsing, so mobile `input`-only edits still open
    // the fraction segment correctly.
    const insertedText = edit.insertedText
    if (insertedText != null) {
      normalizeSeparator(insertedText, [edit.insertedAt, pos - insertedText.length])
    }

    // The prefix and suffix are chrome, not content. A character the browser
    // dropped into them — caret parked at the far left of "$0.00", or out past
    // a suffix — is pulled to the nearest edge of the number, so every caret
    // position that *looks* like "the start of the number" behaves like it.
    // Runs after separator normalization so it moves whatever now occupies
    // that span, not the key the user originally pressed.
    if (insertedText != null && insertedText.length > 0) {
      const relocated = relocateAffixInsertion(
        target.value,
        pos,
        insertedText.length,
        decimalOptions,
      )
      if (relocated) {
        target.value = relocated.value
        pos = relocated.caret
      }
    }

    // Typing a digit into a field whose integer part isn't yet full of real
    // digits extends the real digit stream instead of combining with a padding
    // zero.
    const insertedDigit =
      insertedText != null && insertedText.length === 1 && isDigitKey(insertedText)
        ? insertedText
        : undefined
    const replaced = insertedDigit
      ? applyDecimalMaskReplacingLoneZero(target.value, pos, insertedDigit, decimalOptions)
      : null

    applyResult(target, replaced ?? applyDecimalMask(target.value, pos, decimalOptions))
  }

  const onPaste = (e: Event): void => {
    const target = e.target as HTMLInputElement
    scheduleFrame(() => {
      formatCurrentValue(target)
    })
  }

  // Deliberately does NOT bail out while `isComposing` is true — see the
  // matching comment in `bind.ts`. Android wraps typing in a full-QWERTY
  // text field (e.g. a decimal input without `inputmode="decimal"`) into an
  // IME composition session for autocorrect bookkeeping, not just genuine
  // multi-candidate input, and that composition may never end while the
  // user is still entering a space-less value — so waiting for
  // `compositionend` before formatting made the mask appear broken there.
  const onInput = (e: Event): void => {
    const inputEvent = e as InputEvent
    const target = e.target as HTMLInputElement
    cancelPendingFrames()
    lockInput = false
    pendingSeparatorEdit = null
    skipNextKeyup = true
    formatCurrentValue(target, {
      insertedText: typeof inputEvent.data === 'string' ? inputEvent.data : null,
      inputType: inputEvent.inputType,
    })
  }

  const onCompositionStart = (): void => {
    isComposing = true
    cancelPendingFrames()
    lockInput = false
    pendingSeparatorEdit = null
  }

  const onCompositionEnd = (e: Event): void => {
    isComposing = false
    skipNextKeyup = true
    formatCurrentValue(e.target as HTMLInputElement)
  }

  const onKey = (e: Event): void => {
    const ke = e as KeyboardEvent
    const target = ke.target as HTMLInputElement
    const keyStart = getCaret(target)
    const oldValue = target.value

    if (isComposing) return

    if (keyEventName === 'keyup' && skipNextKeyup) {
      skipNextKeyup = false
      return
    }

    // Older Android WebViews may fire key events without a `key` value.
    if (!(ke as { key?: string }).key) {
      lockInput = true
      scheduleFrame(() => {
        if (editStillPending(target, oldValue)) {
          lockInput = false
          return
        }
        formatCurrentValue(target)
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
    const isUnidentified = ke.key === 'Unidentified'
    if (
      isCharInsert &&
      decimalPlaces !== 0 &&
      (ke.key === '.' || ke.key === ',') &&
      ke.key !== decimalSeparator
    ) {
      pendingSeparatorEdit = { text: ke.key, starts: [keyStart, keyStart - ke.key.length] }
    }

    // Navigation (arrows, Home/End, Tab, ...), selection, and shortcut keys
    // (Ctrl/Cmd+A, Ctrl/Cmd+C, ...) don't change the text — leave the
    // browser's native caret/selection handling alone instead of recomputing
    // and overwriting it on every keystroke.
    if (!isBackspace && !isDelete && !isCharInsert && !isUnidentified) return

    // Everything below reads `target.value`/`selectionStart` inside the rAF
    // callback rather than synchronously here, since the browser's native
    // character insertion for this keystroke isn't guaranteed to have landed
    // yet at the point a keydown listener runs — only by the next frame.
    scheduleFrame(() => {
      // Formatting now would collapse a still-pending native selection via
      // `setCaret` inside `formatCurrentValue` before the edit lands — see
      // `editStillPending`'s doc comment (the same Firefox race fixed in
      // `bind.ts`).
      if (editStillPending(target, oldValue)) return

      formatCurrentValue(target, {
        insertedText: isCharInsert ? ke.key : null,
        insertedAt: isCharInsert ? keyStart : undefined,
        inputType: isBackspace
          ? 'deleteContentBackward'
          : isDelete
            ? 'deleteContentForward'
            : undefined,
      })
    })
  }

  input.addEventListener('paste', onPaste)
  input.addEventListener('input', onInput)
  input.addEventListener('compositionstart', onCompositionStart)
  input.addEventListener('compositionend', onCompositionEnd)
  input.addEventListener(keyEventName, onKey)

  return releaseOnce(() => {
    input.removeEventListener('paste', onPaste)
    input.removeEventListener('input', onInput)
    input.removeEventListener('compositionstart', onCompositionStart)
    input.removeEventListener('compositionend', onCompositionEnd)
    input.removeEventListener(keyEventName, onKey)
    input.removeAttribute(MASKED_ATTR)
    removeTracked()
    cancelPendingFrames()
  })
}
