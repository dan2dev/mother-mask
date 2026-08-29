import { applyWithCompiler } from './apply-mask'
import {
  attachBinder,
  createFrameScheduler,
  editStillPending,
  getCaret,
  isAlreadyBound,
  restoreSwallowedSeparators,
  setCaret,
} from './bind-shared'
import { maskMaxLength, PatternCompiler } from './pattern'
import { isIos } from './platform'
import type { BindOptions, MaskPattern, MaskResolver, MaskResult } from './types'

function toBindOptions(
  third: BindOptions | ((value: string) => void) | null | undefined,
): BindOptions {
  if (third == null) return {}
  if (typeof third === 'function') return { onChange: third }
  return third
}

type InputEditKind = 'insert' | 'backspace' | 'delete' | 'unidentified'

/**
 * A deletion can take the mask's opening structure with it, leaving the caret
 * at 0 with nothing in front of it to anchor to — selecting the "(555)" out
 * of "(555) 123-4567" and deleting renders "() 123-4567", where that "(" is
 * structure the mask restored rather than text the user is behind. Only at
 * position 0 is the whole rendered prefix known to be restored like this, so
 * only there does the render's own caret win: the user is editing the emptied
 * field at "(|) 123-4567", not sitting outside it at "|() 123-4567".
 *
 * An edit the mask *fully* undid is the exception. Backspacing the "(" of
 * "(|) 123-4567" deletes nothing the render doesn't put straight back, so
 * holding the caret in place would wedge it there forever. The keystroke
 * still gets to move it, exactly as it does over any other fixed character.
 */
function restoredPrefixCaret(pos: number, masked: MaskResult, baselineValue: string): number {
  return pos === 0 && masked.value !== baselineValue ? masked.caret : pos
}

/**
 * Keep native movement within a retained divider. If formatting changed the
 * prefix, use its source-mapped caret instead of an offset into removed text.
 * Backspace must not advance across an untouched divider or into the next field.
 */
function backwardCaret(rawValue: string, pos: number, masked: MaskResult, baselineValue: string): number {
  if (masked.value.startsWith(rawValue.slice(0, pos))) return restoredPrefixCaret(pos, masked, baselineValue)
  // Overlapping divider text can make a surviving fragment look like the
  // next divider. Stay before unchanged text on the right, even then.
  let tailStart = masked.value.length
  let rawEnd = rawValue.length
  while (rawEnd > pos && tailStart > 0 && rawValue[rawEnd - 1] === masked.value[tailStart - 1]) {
    rawEnd--
    tailStart--
  }
  return Math.min(pos, masked.caret, tailStart)
}

/** Classify a native `InputEvent.inputType` the same way `onKey` classifies `KeyboardEvent.key`. */
function classifyInputType(inputType: string | undefined): InputEditKind {
  if (inputType?.startsWith('delete') && inputType.endsWith('Backward')) return 'backspace'
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
 * Where the caret lands after a reformat, shared by the `input`-event path
 * (`onInput`) and its `keydown`/`keyup` fallback (`onKey`) — both apply the
 * same reasoning once the edit is classified into an {@link InputEditKind},
 * just from differently-shaped signals (`InputEvent.inputType` vs.
 * `KeyboardEvent.key`).
 *
 * - A resolver mask that actually changed the value takes its own
 *   source-mapped caret, since the candidate stream it reflowed can't be
 *   reasoned about positionally like a fixed pattern.
 * - An unidentified edit (unreliable/missing `key`, or a directionless
 *   `inputType` like `deleteByCut`) only trusts the masked caret once the
 *   value visibly grew — otherwise it's likely a no-op or a delete
 *   misreported as unidentified, so the pre-edit position holds, adjusted
 *   for any structure the mask restored in front of it.
 * - A forward Delete that didn't shrink the value (e.g. it landed on a
 *   literal and consumed nothing) leaves the caret one past where the user
 *   pressed it, matching native forward-delete-through-a-literal behavior.
 * - Backspace defers to {@link backwardCaret}'s divider-aware logic.
 * - A plain insert takes the masked caret outright.
 */
function resolveCaretAfterEdit(
  kind: InputEditKind,
  rawValue: string,
  pos: number,
  previousLength: number,
  masked: MaskResult,
  resolveMask: MaskResolver | undefined,
  baselineValue: string,
): number {
  if (resolveMask && masked.value !== rawValue && masked.value !== baselineValue) return masked.caret
  if (kind === 'unidentified') {
    return masked.value.length > previousLength ? masked.caret : restoredPrefixCaret(pos, masked, baselineValue)
  }
  if (kind === 'delete') {
    return previousLength === masked.value.length ? pos + 1 : restoredPrefixCaret(pos, masked, baselineValue)
  }
  if (kind === 'backspace') return backwardCaret(rawValue, pos, masked, baselineValue)
  return masked.caret
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
  if (isAlreadyBound(input)) return () => {}

  const {
    onChange,
    segmented,
    eager,
    tokens,
    resolveMask,
    autocomplete,
    autocorrect,
    autocapitalize,
    spellcheck,
  } = toBindOptions(third)

  const compiler = new PatternCompiler(tokens)
  const format = (value: string, caret: number, editEager = eager) =>
    applyWithCompiler(value, mask, caret, { tokens, resolveMask, segmented, eager: editEager }, compiler)
  const isData = (ch: string): boolean => compiler.isData(ch)
  // Defer composition only when some custom token's alphabet could plausibly
  // accept a genuine candidate-IME script (Pinyin/Kana/Hangul) — where the
  // provisional draft reads nothing like what it commits, so a live reformat
  // would clobber text the IME still expects to revise. A custom token whose
  // alphabet is ASCII/Latin-only (an uppercase-transforming alphanumeric
  // token, say) gets the same live-formatting treatment as the built-ins:
  // Android's autocorrect otherwise wraps plain Latin typing in a
  // composition session that may never fire `compositionend` while the
  // field has no word boundaries to type through, leaving the mask looking
  // completely inert. See `PatternCompiler.hasComposingRisk`.
  const deferComposition = compiler.hasComposingRisk

  // Resolver capacity is unknowable; custom-token IME drafts may exceed even
  // the two-UTF-16-unit-per-slot bound. Enforce those capacities in the engine.
  // Author-supplied maxlength remains an intentional application constraint.
  // The binding's own compiler sizes this, so a custom token gets its own
  // definition (not the built-in one a reused key like "A" would otherwise
  // fall back to, or the literal a non-built-in key would be mistaken for).
  const maxLength = resolveMask || deferComposition ? Infinity : maskMaxLength(mask, compiler)

  let lockInput = false
  let isComposing = false
  let skipNextKeyup = false
  // Baseline the `input`-event path compares against to detect growth/no-op
  // edits (mirrors the role `oldValue` plays in `onKey`, but persisted
  // across calls since `input` fires once per real mutation — see `onInput`).
  let lastMaskedValue = (input as HTMLInputElement).value ?? ''

  const { scheduleFrame, cancelPendingFrames } = createFrameScheduler()

  const onPaste = (e: Event): void => {
    const target = e.target as HTMLInputElement
    const oldValue = target.value
    scheduleFrame(() => {
      if (deferComposition && isComposing) return
      if (editStillPending(target, oldValue)) return
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
    if (editStillPending(target, lastMaskedValue)) return

    const pos = getCaret(target)
    const previousLength = lastMaskedValue.length
    const kind = classifyInputType(inputEvent.inputType)
    const rawValue = target.value
    const isDeleteLike = kind === 'backspace' || kind === 'delete'
    // Only a plain content delete — a selection Backspace/Delete/Cut, or a
    // single collapsed Backspace/Delete — gets the swallowed-separator
    // rescue below. Word/line deletes (`deleteWordBackward`,
    // `deleteSoftLineBackward`, ...) are a deliberate bulk clear —
    // resurrecting structure they removed would contradict `bind()`'s own
    // documented "never resurrect a divider the user just removed" rule, so
    // those are left to reformat the raw value exactly as struck.
    // Array/resolver masks are excluded too: which pattern applies can
    // change with the new, shorter data count, and a literal restored from
    // the old pattern's layout can land at a position the newly-resolved
    // one never had.
    const isStaticMask = !Array.isArray(mask) && !resolveMask
    const isPlainContentDelete =
      isStaticMask &&
      (inputEvent.inputType === 'deleteContentBackward' ||
        inputEvent.inputType === 'deleteContentForward' ||
        inputEvent.inputType === 'deleteByCut')
    // Typing over a selection destroys the same dividers the equivalent
    // Delete would have, so it gets the same rescue. `insertText` is the one
    // insert type that reports what it inserted, which is what makes the edit
    // a splice this can reason about; paste, IME commits and drag-and-drop
    // leave `data` null and stay a plain reformat.
    const insertedText =
      isStaticMask && inputEvent.inputType === 'insertText' && typeof inputEvent.data === 'string'
        ? inputEvent.data : ''
    const editEager = eagerForEdit(eager, isDeleteLike)

    const cutStart = pos - insertedText.length
    const removedLength = previousLength - rawValue.length + insertedText.length

    let formatValue = rawValue
    if (isPlainContentDelete || insertedText) {
      const rescued = restoreSwallowedSeparators(
        rawValue, pos, removedLength, lastMaskedValue, isData, insertedText.length, true,
      )
      if (rescued !== rawValue) {
        // A deletion that destroyed field data puts its dividers back
        // outright: every field it crossed reappears empty with its own
        // boundary intact, which is what keeps "98765-4321" from sliding
        // into an emptied area code.
        const destroyedFieldData = isPlainContentDelete &&
          Array.from(lastMaskedValue.slice(cutStart, cutStart + removedLength)).some(isData)
        // Everything else is the user editing forward — typing over a
        // selection, or peeling a divider off with Backspace — so the divider
        // only goes back when erasing it would re-segment text this edit never
        // touched. That text sits past the cut and the mask already formatted
        // it, so it has to come back out unchanged and at the end. Retyping a
        // CPF over "012.153.441" keeps its "-39" either way, and backspacing
        // the ") " out of "(111) -3333" still erodes down to "(111-3333"; but
        // erasing the second "/" of "13//1986" would read the year as
        // "13/19/86", so that one is put back.
        // Measured from the surviving text's first *data* character: the mask
        // owns how dividers render, and a cut that stopped mid-divider leaves
        // a fragment it may legitimately absorb — deleting the ")" out of
        // "(111) -4444" is still the documented erosion down to "(111-4444",
        // even though the stranded space goes with it. Field characters are
        // the thing that must not move.
        const suffix = lastMaskedValue.slice(cutStart + removedLength)
        let dataStart = 0
        while (dataStart < suffix.length) {
          const ch = String.fromCodePoint(suffix.codePointAt(dataStart)!)
          if (isData(ch)) break
          dataStart += ch.length
        }
        const untouchedTail = suffix.slice(dataStart)
        if (destroyedFieldData || !format(rawValue, pos, editEager).value.endsWith(untouchedTail)) {
          formatValue = rescued
        }
      }
    }
    const m = format(formatValue, pos, editEager)
    target.value = m.value
    setCaret(target, resolveCaretAfterEdit(kind, rawValue, pos, previousLength, m, resolveMask, lastMaskedValue))

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

    // Bailing here (rather than reformatting) matters when the frame fires
    // before the browser has applied this keystroke's default action — see
    // `editStillPending`'s doc comment. The authoritative `input` handler
    // takes over once the edit actually lands; a collapsed caret (every
    // other test/path exercises) is unaffected by this check.
    const kind: InputEditKind = isBackspace ? 'backspace' : isDelete ? 'delete' : isUnidentified ? 'unidentified' : 'insert'
    scheduleFrame(() => {
      if (editStillPending(target, oldValue)) return

      const pos = target.selectionStart ?? 999
      const rawValue = target.value
      const m = format(rawValue, pos, eagerForEdit(eager, isBackspace || isDelete))
      target.value = m.value
      setCaret(target, resolveCaretAfterEdit(kind, rawValue, pos, oldValue.length, m, resolveMask, oldValue))

      lastMaskedValue = target.value
      onChange?.(target.value)
    })
  }

  return attachBinder(
    input,
    Array.isArray(mask) ? mask.join('|') : mask,
    { autocomplete, autocorrect, autocapitalize, spellcheck },
    maxLength,
    [onPaste, onInput, onCompositionStart, onCompositionEnd, onKey],
    cancelPendingFrames,
  )
}
