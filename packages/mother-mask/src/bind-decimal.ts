import {
  attachBinder,
  createFrameScheduler,
  editStillPending,
  getCaret,
  isAlreadyBound,
  setCaret,
} from './bind-shared'
import { isDigitChar } from './chars'
import {
  applyDecimalMask,
  applyDecimalMaskPullingFraction,
  applyDecimalMaskPushingFraction,
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

interface DecimalEdit {
  insertedText?: string | null
  insertedAt?: number
  inputType?: string
}

type BurstKind = 'insert' | 'deleteContentBackward' | 'deleteContentForward'

/**
 * What a burst of same-kind keystrokes did to `oldValue` (as captured at
 * keydown, with the selection `[start, end)` — just a caret when equal) to
 * produce `value`: the run of characters typed over the selection, or how
 * many single-character Backspaces/Deletes followed the selection's own
 * removal. `null` when `value` isn't explained that way (mixed keys, a
 * paste, ...), or when only one keystroke landed — nothing to replay.
 */
function describeBurst(
  value: string,
  oldValue: string,
  start: number,
  end: number,
  kind: BurstKind,
): { run: string; singles: number } | null {
  const selected = end - start
  if (kind === 'insert') {
    const n = value.length - oldValue.length + selected
    if (n <= 1 || !value.startsWith(oldValue.slice(0, start)) || !value.endsWith(oldValue.slice(end))) {
      return null
    }
    return { run: value.slice(start, start + n), singles: 0 }
  }
  const singles = oldValue.length - value.length - selected
  if (singles < 0 || singles + (selected ? 1 : 0) <= 1) return null
  const expected =
    kind === 'deleteContentBackward'
      ? start - singles >= 0 && oldValue.slice(0, start - singles) + oldValue.slice(end)
      : oldValue.slice(0, start) + oldValue.slice(end + singles)
  return value === expected ? { run: '', singles } : null
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

  const {
    onChange,
    autocomplete,
    autocorrect,
    autocapitalize,
    spellcheck,
    ...maskOptions
  } = toBindDecimalOptions(second)
  const decimalOptions: DecimalMaskOptions = maskOptions
  const { decimalSeparator, decimalPlaces } = resolveDecimalOptions(decimalOptions)

  let lockInput = false
  let isComposing = false
  let skipNextKeyup = false
  let pendingSeparatorEdit: { text: string; starts: number[] } | null = null
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

    // With `allowDecimalPush`, a digit deleted from the fraction pulls the
    // number right one place (calculator-style) instead of being zero-padded.
    if (edit.inputType === 'deleteContentBackward' || edit.inputType === 'deleteContentForward') {
      const pulled = applyDecimalMaskPullingFraction(target.value, pos, decimalOptions)
      if (pulled) {
        applyResult(target, pulled)
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
      insertedText != null && insertedText.length === 1 && isDigitChar(insertedText)
        ? insertedText
        : undefined
    // With `allowDecimalPush`, a digit typed into an already-full fraction
    // scrolls the number left one place (calculator-style) instead of being
    // dropped.
    const replaced = insertedDigit
      ? (applyDecimalMaskReplacingLoneZero(target.value, pos, insertedDigit, decimalOptions) ??
        applyDecimalMaskPushingFraction(target.value, pos, insertedDigit, decimalOptions))
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
    let keyEnd = keyStart
    try {
      keyEnd = target.selectionEnd ?? keyStart
    } catch {
      // Same input types `getCaret` guards against.
    }
    const oldValue = target.value

    if (isComposing) return

    if (isIos() && skipNextKeyup) {
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

      // Several keystrokes can land before this frame fires. With
      // `allowDecimalPush` each one matters on its own — a digit overwrites
      // padding, pushes, or inserts depending on the state it finds — so a
      // burst is replayed one character at a time from the pre-burst value,
      // exactly as per-keystroke `input` events would have delivered it.
      // Formatted in one go, the whole burst would read as fraction overflow
      // and be dropped. The frames the later keystrokes scheduled still fire,
      // but find no digit of theirs at the caret and leave the value alone.
      // Deletes get the same treatment: a pulled fraction after each
      // Backspace is not the same as one pull over the whole burst (the
      // separator may have gone in between), so each keystroke is replayed.
      const kind: BurstKind | null = isCharInsert
        ? 'insert'
        : isBackspace
          ? 'deleteContentBackward'
          : isDelete
            ? 'deleteContentForward'
            : null
      const burst =
        kind && decimalOptions.allowDecimalPush
          ? describeBurst(target.value, oldValue, keyStart, keyEnd, kind)
          : null
      if (burst && kind) {
        target.value = oldValue.slice(0, keyStart) + oldValue.slice(keyEnd)
        setCaret(target, keyStart)
        if (kind === 'insert') {
          let at = keyStart
          for (const ch of burst.run) {
            target.value = target.value.slice(0, at) + ch + target.value.slice(at)
            setCaret(target, at + ch.length)
            formatCurrentValue(target, { insertedText: ch, insertedAt: at })
            at = getCaret(target)
          }
          return
        }
        if (keyEnd > keyStart) formatCurrentValue(target, { inputType: kind })
        for (let i = 0; i < burst.singles; i++) {
          const at = getCaret(target)
          if (kind === 'deleteContentBackward') {
            if (at === 0) break
            target.value = target.value.slice(0, at - 1) + target.value.slice(at)
            setCaret(target, at - 1)
          } else {
            target.value = target.value.slice(0, at) + target.value.slice(at + 1)
            setCaret(target, at)
          }
          formatCurrentValue(target, { inputType: kind })
        }
        return
      }

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

  return attachBinder(
    input,
    'decimal',
    { autocomplete, autocorrect, autocapitalize, spellcheck },
    Infinity,
    [onPaste, onInput, onCompositionStart, onCompositionEnd, onKey],
    cancelPendingFrames,
  )
}
