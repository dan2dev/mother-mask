// ---------------------------------------------------------------------------
// DOM plumbing shared by `bind()` and `bindDecimal()` — caret access, the
// requestAnimationFrame scheduler both use to read post-mutation state, and
// the attribute/dispose bookkeeping that makes either binder idempotent and
// re-bindable. None of this knows about masking; it's the same regardless of
// which formatter a binder plugs in.
// ---------------------------------------------------------------------------

import { isIos } from './platform'
import type { BindInputAttributes } from './types'

export const MASKED_ATTR = 'data-masked'

/** Apply the binder-managed input attributes, using safe editing defaults. */
export function setBindInputAttributes(
  setIfMissing: (name: string, value: string) => void,
  options: BindInputAttributes,
): void {
  setIfMissing('autocomplete', options.autocomplete ?? 'off')
  setIfMissing('autocorrect', options.autocorrect ?? 'off')
  setIfMissing('autocapitalize', options.autocapitalize ?? 'off')
  setIfMissing('spellcheck', String(options.spellcheck ?? false))
}

/** `bind()`/`bindDecimal()` are idempotent: a second call on the same element is a no-op. */
export function isAlreadyBound(input: Element): boolean {
  return input.getAttribute(MASKED_ATTR) !== null
}

export function getCaret(target: HTMLInputElement): number {
  try {
    return target.selectionStart ?? target.value.length
  } catch {
    return target.value.length
  }
}

export function setCaret(target: HTMLInputElement, caret: number): void {
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
export function releaseOnce(cleanup: () => void): () => void {
  let release: (() => void) | undefined = cleanup
  return () => {
    const run = release
    release = undefined
    run?.()
  }
}

/**
 * The scheduled frame can fire before the browser has actually applied a
 * pending keystroke's default action (confirmed via real-Firefox tracing:
 * `target.value` is still unchanged at that point). If the selection is
 * still a real range then, it's the range the user had *before* typing —
 * not a post-edit collapsed caret — and the browser still intends to use it
 * to replace-with-the-typed-character. Reformatting now would collapse that
 * range out from under the pending native edit; the caller should bail and
 * let the next authoritative event (`input`, or the following frame) take
 * over instead.
 */
export function editStillPending(target: HTMLInputElement, oldValue: string): boolean {
  return target.value === oldValue && target.selectionStart !== target.selectionEnd
}

/**
 * requestAnimationFrame callbacks scheduled by a binder outlive a single
 * keystroke handler and close over the input element. If `dispose()` runs
 * before a frame fires — e.g. the field unmounts right after the user types
 * — an uncancelled callback keeps that element (and its closure) alive until
 * the next paint, which can be a very long time on a backgrounded tab. This
 * tracks every scheduled frame so disposal can cancel what's still pending.
 */
export function createFrameScheduler(): { scheduleFrame: (callback: () => void) => void; cancelPendingFrames: () => void } {
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
  return { scheduleFrame, cancelPendingFrames }
}

/**
 * A selection-delete can take a whole field *and* the separator introducing
 * the next one with it, leaving nothing positional behind for the mask to
 * anchor to: selecting "(11) " (digits, closing paren, and the space) out of
 * "(11) 98765-4321" and deleting hands the engine "98765-4321", which reads
 * exactly like fresh digits for the area code — the untouched "98765" has
 * no way to say it was never touched. A shorter selection stopping at "(11)"
 * leaves the space behind, and the existing anchoring in `assignToSlots`
 * already gets that case right; this only fills the gap where the deletion
 * swallowed one or more separators whole. Widening the selection further —
 * through the "98765" too, out to "(11) 98765-" — swallows both the ") "
 * and the "-": every field the deletion fully crossed reappears empty with
 * its own boundary intact, e.g. "(11) -4321", the same shape three plain
 * Backspaces (never touching the dividers themselves) would have left.
 *
 * `bind()` is the one layer that knows a deletion happened at all — pure
 * `applyMask` sees only the resulting `(value, caret)` and can't tell "the
 * user just deleted through here" from "these are the first digits the user
 * ever typed", which is exactly the ambiguity `eagerForEdit` exists for on
 * the eager side. So this restores, verbatim, every separator span an edit
 * deleted — but only when real data still follows the deletion untouched.
 * Restoring separators when nothing follows would resurrect ones `bind()`
 * is documented to drop for good, like backspacing the eager "." off "012.".
 *
 * A deletion that never touched any data at all is left alone too, whatever
 * its length — that's plain divider erosion, one keystroke (or a selection
 * confined to the divider) peeling back separator text the user is clearly
 * choosing to remove, exactly as backspacing through "(111) " down to
 * "(111-4444" and on to "-4444" is documented to work. Only a deletion that
 * destroys *some* field data is treated as having swallowed a separator by
 * accident rather than on purpose. `allowDividerOnly` lifts that rule for a
 * caller that has separately established the erosion would corrupt something
 * — see `bind()`, where a divider whose removal would re-segment untouched
 * text is put back instead.
 *
 * Restoring a separator only ever reproduces text that was standing exactly
 * there a moment ago, at the exact position it stood — it never invents
 * structure. That is also why it stays safe when the same separator repeats
 * elsewhere in the mask (`"HH:HH:HH"`'s two colons, say): the restored one
 * lands precisely where the deleted one did, so the engine's own capacity
 * check (`assignToSlots`/`findAnchorRun` in apply-mask.ts) still resolves it
 * to the one field it can — the surviving data plus everything after the
 * restored separator has to fit what follows, which pins the split uniquely
 * even with an identical separator later in the string.
 *
 * Typing a character straight over a selection destroys exactly the same
 * dividers the equivalent Delete would have, so `insertedLength` widens this
 * to that case: selecting the `"3/12"` of `"3/12/1986"` and typing `"4"`
 * takes the day, the month, *and* the divider between them, handing the
 * engine `"4/1986"`. On a mask whose separators all read alike there is
 * nothing left in the value to say which field the surviving `"/"` belongs
 * to, so the untouched year breaks apart into `"4/19/86"`. Putting the
 * divider back pins it where it never moved from. The inserted text keeps its
 * place — the separators go in directly behind it, exactly where they stood.
 *
 * `pos`, `removedLength` and `insertedLength` must describe a single splice —
 * `previousValue` with `[pos - insertedLength, pos - insertedLength +
 * removedLength)` replaced by the `insertedLength` characters ending at
 * `pos`, and nothing else changed. Any other shape (IME weirdness, a
 * multi-range edit) fails the checks below and is left untouched.
 */
export function restoreSwallowedSeparators(
  rawValue: string,
  pos: number,
  removedLength: number,
  previousValue: string,
  isData: (char: string) => boolean,
  insertedLength = 0,
  allowDividerOnly = false,
): string {
  if (removedLength <= 0 || insertedLength < 0 || insertedLength > pos) return rawValue
  const cutStart = pos - insertedLength
  const deletedEnd = cutStart + removedLength
  if (deletedEnd > previousValue.length) return rawValue
  if (
    previousValue.slice(0, cutStart) !== rawValue.slice(0, cutStart) ||
    previousValue.slice(deletedEnd) !== rawValue.slice(pos)
  ) return rawValue

  // Nothing left past the cut means every field beyond it was cleared too —
  // that deletion is final, not a swallow (matches backspacing the eager "."
  // off "012." for good, where the cut sits at the very end).
  const tail = previousValue.slice(deletedEnd)
  if (!Array.from(tail).some(isData)) return rawValue

  // `previousValue` is a rendered mask output, so every non-data code point
  // inside the deleted span is a genuine separator the deletion swallowed —
  // never a coincidence. Keep them, in order, and drop the data alongside
  // them that this edit did mean to delete.
  const removed = previousValue.slice(cutStart, deletedEnd)
  if (!allowDividerOnly && !Array.from(removed).some(isData)) return rawValue
  let literals = ''
  for (const ch of removed) if (!isData(ch)) literals += ch
  if (!literals) return rawValue

  return rawValue.slice(0, pos) + literals + rawValue.slice(pos)
}

/** Attributes a binder sets only if absent, so it never clobbers the caller's own and disposal only ever removes what it added. */
export function trackAttrs(input: Element): { setIfMissing: (name: string, value: string) => void; removeTracked: () => void } {
  const attrsSetHere: string[] = []
  const setIfMissing = (name: string, value: string): void => {
    if (!input.hasAttribute(name)) {
      input.setAttribute(name, value)
      attrsSetHere.push(name)
    }
  }
  const removeTracked = (): void => {
    for (const name of attrsSetHere) input.removeAttribute(name)
  }
  return { setIfMissing, removeTracked }
}

/** A binder's handlers in the order their events are attached. The last one listens on `keyup` (iOS) or `keydown` (elsewhere) — see `isIos()`. */
export type BinderHandlers = readonly [
  paste: (e: Event) => void,
  input: (e: Event) => void,
  compositionstart: (e: Event) => void,
  compositionend: (e: Event) => void,
  key: (e: Event) => void,
]

/**
 * Everything a binder does to take — and later release — ownership of an
 * element, in one place: mark it bound (`data-masked` set to `marker`), apply
 * the managed attributes (plus `maxlength` when finite), attach the five
 * listeners, and return the dispose function that reverses each of those
 * steps and cancels any reformat frame still in flight. Keeping attach and
 * detach in a single helper makes the add/remove symmetry impossible to break
 * from a binder — exactly the class of leak `memory.test.ts` guards against.
 */
export function attachBinder(
  input: Element,
  marker: string,
  attributes: BindInputAttributes,
  maxLength: number,
  handlers: BinderHandlers,
  cancelPendingFrames: () => void,
): () => void {
  const { setIfMissing, removeTracked } = trackAttrs(input)
  input.setAttribute(MASKED_ATTR, marker)
  setBindInputAttributes(setIfMissing, attributes)
  if (Number.isFinite(maxLength)) setIfMissing('maxlength', String(maxLength))

  const names = ['paste', 'input', 'compositionstart', 'compositionend', isIos() ? 'keyup' : 'keydown']
  for (let i = 0; i < names.length; i++) input.addEventListener(names[i], handlers[i])

  return releaseOnce(() => {
    for (let i = 0; i < names.length; i++) input.removeEventListener(names[i], handlers[i])
    input.removeAttribute(MASKED_ATTR)
    removeTracked()
    cancelPendingFrames()
  })
}
