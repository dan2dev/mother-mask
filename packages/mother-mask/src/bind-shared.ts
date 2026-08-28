// ---------------------------------------------------------------------------
// DOM plumbing shared by `bind()` and `bindDecimal()` — caret access, the
// requestAnimationFrame scheduler both use to read post-mutation state, and
// the attribute/dispose bookkeeping that makes either binder idempotent and
// re-bindable. None of this knows about masking; it's the same regardless of
// which formatter a binder plugs in.
// ---------------------------------------------------------------------------

export const MASKED_ATTR = 'data-masked'

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
