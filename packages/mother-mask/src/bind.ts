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

function getCaret(target: HTMLInputElement): number {
  try {
    return target.selectionStart ?? target.value.length
  } catch {
    return target.value.length
  }
}

function setCaret(target: HTMLInputElement, caret: number): void {
  try {
    target.setSelectionRange(caret, caret)
  } catch {
    // Some input types (for example type="number") do not support text selection.
  }
}

type InputEditKind = 'insert' | 'backspace' | 'delete' | 'unidentified'

/** Classify a native `InputEvent.inputType` the same way `onKey` classifies `KeyboardEvent.key`. */
function classifyInputType(inputType: string | undefined): InputEditKind {
  if (inputType === 'deleteContentBackward') return 'backspace'
  if (inputType === 'deleteContentForward') return 'delete'
  if (inputType && inputType.startsWith('insert')) return 'insert'
  return 'unidentified'
}

/**
 * Bind a mask pattern to an input element.
 *
 * Idempotent — calling `bind()` on an already-bound element has no effect.
 * The element receives a `data-masked` attribute marking it as bound.
 *
 * Reformats post-mutation `input` events (the reliable, timing-safe signal
 * on every modern browser, including mobile IME/autocorrect) with a
 * `keydown`/`requestAnimationFrame` fallback for older browsers.
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

  const { onChange, segmented } = toBindOptions(third)

  /** Attribute names set by this bind call; removed on dispose so a later `bind()` can re-apply. */
  const attrsSetHere: string[] = []
  const setIfMissing = (name: string, value: string): void => {
    if (!input.hasAttribute(name)) {
      input.setAttribute(name, value)
      attrsSetHere.push(name)
    }
  }

  // Computed once here rather than inside `onKey` — the mask never changes
  // for the lifetime of this binding, and `onKey` is a synchronous, hot,
  // input-blocking path run on every keystroke.
  const maxLength = getMaxLength(mask)

  input.setAttribute(MASKED_ATTR, Array.isArray(mask) ? mask.join('|') : mask)
  setIfMissing('autocomplete', 'off')
  setIfMissing('autocorrect', 'off')
  setIfMissing('autocapitalize', 'off')
  setIfMissing('spellcheck', 'false')
  setIfMissing('maxlength', String(maxLength))

  let lockInput = false
  let isComposing = false
  let skipNextKeyup = false
  // Baseline the `input`-event path compares against to detect growth/no-op
  // edits (mirrors the role `oldValue` plays in `onKey`, but persisted
  // across calls since `input` fires once per real mutation — see `onInput`).
  let lastMaskedValue = (input as HTMLInputElement).value ?? ''

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
  const cancelPendingFrames = (): void => {
    for (const id of pendingFrames) cancelAnimationFrame(id)
    pendingFrames.clear()
  }

  const onPaste = (e: Event): void => {
    const target = e.target as HTMLInputElement
    scheduleFrame(() => {
      const m = buildMask(target.value, mask, 0, { segmented })
      target.value = m.process()
      onChange?.(target.value)
    })
  }

  // `input` fires synchronously, once per real DOM mutation, right after the
  // browser (or IME/autocorrect) has already applied the edit — unlike
  // `keydown` + `requestAnimationFrame`, there's no batching window where
  // several keystrokes can queue up before we read `selectionStart`, which is
  // what let fast typing (especially Android Chrome, where composed/
  // autocorrected characters often arrive with an unreliable or missing
  // `key`) drift the caret. This is now the primary formatting path; `onKey`
  // below stays as a `requestAnimationFrame` fallback for browsers that don't
  // fire `input` reliably.
  //
  // Deliberately does NOT bail out while `isComposing` is true. Android's
  // on-screen keyboard wraps essentially all typing in a full-QWERTY text
  // field into an IME composition session for its own autocorrect/
  // suggestion-strip bookkeeping — not just genuine multi-candidate input
  // (Pinyin, Kana, …). Since a mask's alphabet is always plain ASCII
  // digits/letters (see `matchesSlot`), whatever Android is "composing" is
  // already the final intended character, not a provisional candidate — so
  // reformatting immediately is safe. Waiting for `compositionend` instead
  // (as this used to) meant the mask never visibly applied while typing a
  // space-less value like a plate number, since Android only ends the
  // composition on a word boundary (space/punctuation) or blur, which may
  // never happen mid-entry.
  const onInput = (e: Event): void => {
    const inputEvent = e as InputEvent
    const target = e.target as HTMLInputElement
    cancelPendingFrames()
    lockInput = false
    skipNextKeyup = true

    const pos = getCaret(target)
    const previousLength = lastMaskedValue.length
    const m = buildMask(target.value, mask, pos, { segmented })
    target.value = m.process()

    const kind = classifyInputType(inputEvent.inputType)
    if (kind === 'unidentified') {
      const newPos = target.value.length > previousLength ? m.caret : pos
      setCaret(target, newPos)
    } else if (kind === 'delete') {
      const newPos = previousLength === target.value.length ? pos + 1 : pos
      setCaret(target, newPos)
    } else if (kind === 'backspace') {
      setCaret(target, pos)
    } else {
      setCaret(target, m.caret)
    }

    lastMaskedValue = target.value
    onChange?.(target.value)
  }

  const onCompositionStart = (): void => {
    isComposing = true
    cancelPendingFrames()
    lockInput = false
  }

  const onCompositionEnd = (e: Event): void => {
    isComposing = false
    skipNextKeyup = true

    const target = e.target as HTMLInputElement
    const pos = getCaret(target)
    const m = buildMask(target.value, mask, pos, { segmented })
    target.value = m.process()
    setCaret(target, m.caret)

    lastMaskedValue = target.value
    onChange?.(target.value)
  }

  const onKey = (e: Event): void => {
    const ke = e as KeyboardEvent
    const target = ke.target as HTMLInputElement
    const oldValue = target.value

    if (isComposing) return

    // `input` already handled this keystroke (it fires before `keyup`); skip
    // the redundant iOS `keyup` pass so we don't reformat the value twice.
    if (keyEventName === 'keyup' && skipNextKeyup) {
      skipNextKeyup = false
      return
    }

    // Older Android WebViews may fire key events without a `key` value.
    if (!(ke as { key?: string }).key) {
      lockInput = true
      scheduleFrame(() => {
        const pos = target.selectionStart ?? 999
        const m = buildMask(target.value, mask, pos, { segmented })
        target.value = m.process()
        target.setSelectionRange(m.caret, m.caret)
        scheduleFrame(() => {
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
      if (oldValue.length >= maxLength && !isIos()) {
        ke.preventDefault()
        return
      }
    }

    // `lockInput` is only set by the Android WebView path above; block normal
    // key events while that asynchronous path is in flight.
    if (lockInput) {
      ke.preventDefault()
      return
    }

    scheduleFrame(() => {
      const pos = target.selectionStart ?? 999
      const m = buildMask(target.value, mask, pos, { segmented })
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
    })
  }

  input.addEventListener('paste', onPaste)
  input.addEventListener('input', onInput)
  input.addEventListener('compositionstart', onCompositionStart)
  input.addEventListener('compositionend', onCompositionEnd)
  input.addEventListener(keyEventName, onKey)

  return () => {
    input.removeEventListener('paste', onPaste)
    input.removeEventListener('input', onInput)
    input.removeEventListener('compositionstart', onCompositionStart)
    input.removeEventListener('compositionend', onCompositionEnd)
    input.removeEventListener(keyEventName, onKey)
    input.removeAttribute(MASKED_ATTR)
    for (const name of attrsSetHere) input.removeAttribute(name)
    cancelPendingFrames()
  }
}
