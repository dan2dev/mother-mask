import { applyWithCompiler } from './apply-mask'
import { getMaxLength, PatternCompiler } from './pattern'
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
    // DOM selections use UTF-16 offsets; never leave the caret inside a pair.
    if (
      caret > 0 && caret < target.value.length &&
      target.value.charCodeAt(caret) >= 0xdc00 && target.value.charCodeAt(caret) <= 0xdfff &&
      target.value.charCodeAt(caret - 1) >= 0xd800 && target.value.charCodeAt(caret - 1) <= 0xdbff
    ) caret--
    target.setSelectionRange(caret, caret)
  } catch {
    // Some input types (for example type="number") do not support text selection.
  }
}

/** A retained dispose handle must not retain the binding after it has run. */
function releaseOnce(cleanup: (() => void) | undefined): () => void {
  return () => {
    const release = cleanup
    cleanup = undefined
    release?.()
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
 * `eager`, unless this particular edit is a deletion.
 *
 * `applyMask`/`buildMask` are pure functions of `(value, caret)` — they have
 * no memory of *how* the value got there. That's a problem for eager mode
 * specifically: deleting the separator eager just added (e.g. backspacing
 * the "." off "012.") produces the exact same `(value, caret)` — raw digits,
 * caret right where the separator used to be — as the moment right before
 * that separator first appeared. A stateless recompute can't tell those two
 * apart, so eager would immediately re-add the separator the user just
 * deleted, making backspace look like it does nothing.
 *
 * `bind()` is the one layer that *does* know which happened (the DOM event
 * says so), so it's the right place to break the tie: suppress eager for the
 * single recompute that follows a delete-type edit, and let it resume on the
 * next insert. This never removes anything eager wouldn't otherwise have
 * added — it only stops eager from resurrecting a literal the user just
 * removed.
 */
function eagerForEdit(eager: boolean | undefined, isDeleteLike: boolean): boolean | undefined {
  return isDeleteLike ? false : eager
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

  const { onChange, segmented, eager, tokens, resolveMask } = toBindOptions(third)

  const compiler = new PatternCompiler(tokens)
  const format = (value: string, caret: number, editEager = eager) =>
    applyWithCompiler(value, mask, caret, { tokens, resolveMask, segmented, eager: editEager }, compiler)
  // Arbitrary custom predicates cannot be inspected for their alphabet. Defer
  // *all custom-token* compositions, but retain live Android formatting for
  // built-in-only masks. Provisional Pinyin/Kana may be much longer than output.
  const deferComposition = !!tokens && Object.keys(tokens).length > 0

  /** Attribute names set by this bind call; removed on dispose so a later `bind()` can re-apply. */
  const attrsSetHere: string[] = []
  const setIfMissing = (name: string, value: string): void => {
    if (!input.hasAttribute(name)) {
      input.setAttribute(name, value)
      attrsSetHere.push(name)
    }
  }

  // Resolver capacity is unknowable; custom-token IME drafts may exceed even
  // the two-UTF-16-unit-per-slot bound. Enforce those capacities in the engine.
  // Author-supplied maxlength remains an intentional application constraint.
  const maxLength = resolveMask || deferComposition ? Infinity : getMaxLength(mask)

  input.setAttribute(MASKED_ATTR, Array.isArray(mask) ? mask.join('|') : mask)
  setIfMissing('autocomplete', 'off')
  setIfMissing('autocorrect', 'off')
  setIfMissing('autocapitalize', 'off')
  setIfMissing('spellcheck', 'false')
  if (Number.isFinite(maxLength)) setIfMissing('maxlength', String(maxLength))

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
    const oldValue = target.value
    scheduleFrame(() => {
      if (deferComposition && isComposing) return
      if (target.value === oldValue && target.selectionStart !== target.selectionEnd) return
      const m = format(target.value, getCaret(target))
      target.value = m.value
      setCaret(target, m.caret)
      lastMaskedValue = target.value
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
  // Built-ins keep the existing Android autocorrect path. Custom alphabets
  // leave provisional composition text and selection completely untouched.
  const onInput = (e: Event): void => {
    const inputEvent = e as InputEvent
    const target = e.target as HTMLInputElement
    cancelPendingFrames()
    lockInput = false
    skipNextKeyup = true
    if (deferComposition && (isComposing || inputEvent.isComposing)) return
    if (target.value === lastMaskedValue && target.selectionStart !== target.selectionEnd) return

    const pos = getCaret(target)
    const previousLength = lastMaskedValue.length
    const kind = classifyInputType(inputEvent.inputType)
    const rawValue = target.value
    const m = format(rawValue, pos, eagerForEdit(eager, kind === 'backspace' || kind === 'delete'))
    target.value = m.value

    if (resolveMask && m.value !== rawValue && m.value !== lastMaskedValue) {
      setCaret(target, m.caret)
    } else if (kind === 'unidentified') {
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
    const m = format(target.value, pos)
    target.value = m.value
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
        // The browser hasn't applied this keystroke's default action yet —
        // see the comment on the identical check below.
        if (target.value === oldValue && target.selectionStart !== target.selectionEnd) {
          lockInput = false
          return
        }
        const pos = target.selectionStart ?? 999
        // No reliable `key` here, so infer delete-vs-insert from the length
        // delta the browser's already-applied default action left behind.
        const isDeleteLike = target.value.length < oldValue.length
        const m = format(target.value, pos, eagerForEdit(eager, isDeleteLike))
        target.value = m.value
        setCaret(target, m.caret)
        lastMaskedValue = target.value
        scheduleFrame(() => {
          lockInput = false
        })
      })
      return
    }

    if (ke.key === 'Meta') return

    const isBackspace = ke.key === 'Backspace'
    const isDelete = ke.key === 'Delete'
    const isCharInsert = Array.from(ke.key).length === 1 && !ke.ctrlKey && !ke.altKey && !ke.metaKey
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

    // Navigation (arrows, Home/End, Tab, ...), selection, and shortcut keys
    // (Ctrl/Cmd+A, Ctrl/Cmd+C, ...) don't change the text — leave the
    // browser's native caret/selection handling alone instead of recomputing
    // and overwriting it on every keystroke. Without this guard, a key like
    // Ctrl+A schedules a reformat frame that never gets cancelled (select-all
    // fires no `input` event), and that stray frame's `target.value =
    // m.process()` reassignment races the browser's own pending selection —
    // the reported Firefox bug where selecting all and retyping fast
    // occasionally drops the caret to the start instead of replacing the
    // selection.
    if (!isBackspace && !isDelete && !isCharInsert && !isUnidentified) return

    scheduleFrame(() => {
      // The scheduled frame can fire before the browser has actually applied
      // this keystroke's default action (confirmed via real-Firefox
      // tracing: `target.value` is still unchanged here). If the selection
      // is still a real range at that point, it's the range the user had
      // *before* typing — not a post-edit collapsed caret — and the browser
      // still intends to use it to replace-with-the-typed-character. Calling
      // `setSelectionRange` below would collapse that range out from under
      // the pending native edit, so the character gets inserted at the
      // collapsed point instead of replacing the selection (or dropped
      // entirely). Bail and let the authoritative `input` handler take over
      // once the edit actually lands — a collapsed caret (the case every
      // other test/path exercises) is unaffected by this check.
      if (target.value === oldValue && target.selectionStart !== target.selectionEnd) return

      const pos = target.selectionStart ?? 999
      const rawValue = target.value
      const m = format(rawValue, pos, eagerForEdit(eager, isBackspace || isDelete))
      target.value = m.value

      if (resolveMask && m.value !== rawValue && m.value !== oldValue) {
        setCaret(target, m.caret)
      } else if (isUnidentified) {
        const newPos = target.value.length > oldValue.length ? m.caret : pos
        setCaret(target, newPos)
      } else if (isDelete) {
        const newPos = oldValue.length === target.value.length ? pos + 1 : pos
        setCaret(target, newPos)
      } else if (isBackspace) {
        setCaret(target, pos)
      } else if (isCharInsert) {
        setCaret(target, m.caret)
      }

      lastMaskedValue = target.value
      onChange?.(target.value)
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
    for (const name of attrsSetHere) input.removeAttribute(name)
    cancelPendingFrames()
  })
}
