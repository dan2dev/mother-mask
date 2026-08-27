import type { ApplyMaskOptions, MaskResult } from './types'

// ---------------------------------------------------------------------------
// Character classification (no regex — avoids the empty-string pitfall)
// ---------------------------------------------------------------------------

function isDigitChar(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

function isLetterChar(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
}

function isSlotChar(ch: string): boolean {
  return ch === '9' || ch === 'Z' || ch === 'A'
}

function matchesSlot(ch: string, slot: string): boolean {
  if (slot === '9') return isDigitChar(ch)
  if (slot === 'Z') return isLetterChar(ch)
  // slot === 'A' → alphanumeric
  return isDigitChar(ch) || isLetterChar(ch)
}

// ---------------------------------------------------------------------------
// Flat masking (default) — treats the mask as one continuous character
// stream. Best for continuous identifiers (phone numbers, CPF/CNPJ, credit
// cards) where deleting/inserting a digit anywhere is expected to reflow
// every digit after it — this is the classic mother-mask behavior and is
// relied on by the majority of the test suite (paste, backspace, mid-string
// insert, etc).
// ---------------------------------------------------------------------------

/**
 * Apply a single mask string to a value, producing the masked output and
 * a computed caret position.
 *
 * **Caret algorithm**: as the mask consumes characters from `value`, every
 * time a *matching* input character at a position *before* `inputCaret` is
 * written to the output (including any preceding pending literals that were
 * just flushed), the output caret is updated to the current output length.
 * This correctly handles literal insertion, middle-of-string edits, and
 * characters that are skipped because they don't match the current slot.
 */
function applyFlatMask(
  value: string,
  mask: string,
  inputCaret: number,
  eager: boolean,
): MaskResult {
  let output = ''
  let pending = ''
  let valueIdx = 0
  let outputCaret = 0
  let caretResolved = false

  for (let maskIdx = 0; maskIdx < mask.length; maskIdx++) {
    const maskCh = mask[maskIdx]

    if (maskCh !== '9' && maskCh !== 'Z' && maskCh !== 'A') {
      pending += maskCh
      continue
    }

    // Find next value character that matches this slot
    let found = false
    while (valueIdx < value.length) {
      const ch = value[valueIdx++]

      if (matchesSlot(ch, maskCh)) {
        // Flush pending literals then write the matched char
        output += pending + ch
        pending = ''
        found = true

        // Caret tracking: if this consumed char was before the input caret,
        // the output caret is (at least) at the current output length.
        if (!caretResolved) {
          if (valueIdx <= inputCaret) {
            outputCaret = output.length
          } else {
            caretResolved = true
          }
        }
        break
      }
      // Non-matching chars are silently skipped (iterative, no recursion).
    }

    if (!found) break
  }

  // If every matched char was before the input caret (or no chars matched at
  // all past the caret), place the output caret at the end of the output.
  if (!caretResolved) outputCaret = output.length

  // Eager mode: `pending` only survives to here holding the literal(s) that
  // directly follow the slot(s) just filled — see the doc comment on
  // `ApplyMaskOptions.eager`. Reveal it now instead of waiting for the next
  // matching keystroke, and carry the caret past it only if the caret was
  // already sitting at the end of the typed content (never yank it forward
  // during a mid-string edit).
  if (eager && pending) {
    const wasAtEnd = outputCaret === output.length
    output += pending
    if (wasAtEnd) outputCaret = output.length
  }

  return { value: output, caret: outputCaret }
}

// ---------------------------------------------------------------------------
// Segmented masking (default) — treats literal separators as hard boundaries
// between independent fields (e.g. day/month/year in "99/99/9999"). Editing
// one segment never bleeds characters into a neighboring one, so replacing
// the "12" in "25/12/2025" with a shorter or longer value keeps the year
// exactly where it is instead of shifting digits across the "/".
//
// This runs in two passes rather than emitting characters as it scans:
//
//   1. **assign** — decide which mask slot each character of `value` lands in,
//      using the separators still present in `value` as positional anchors.
//   2. **render** — walk the mask and emit the assigned characters plus the
//      literals that are actually justified, tracking the caret as it goes.
//
// Splitting them is what makes characters "stick" to their segment. A single
// emit-as-you-scan pass can only ever look one separator ahead, so a value
// like "015-39" (what the browser leaves behind when you select "012.153.441"
// out of "012.153.441-39" and type "015") had no way to see that the "-"
// pins "39" to the *last* segment — it treated the "-" as noise and repacked
// the digits from the left into "015.39".
// ---------------------------------------------------------------------------

type MaskToken = { kind: 'literal'; text: string } | { kind: 'slots'; chars: string }

/**
 * A mask string pre-chewed into the lookups both passes need.
 *
 * "Run" throughout means one uninterrupted stretch of slot characters — the
 * segment a user thinks of as a single field ("999", "9999", …). Runs are
 * numbered in mask order; token indices index {@link CompiledMask.tokens}.
 */
interface CompiledMask {
  /** Alternating literal / slot-run tokens, in mask order. */
  tokens: MaskToken[]
  /** Slot characters of each run (e.g. `["999", "999", "999", "99"]`). */
  runChars: string[]
  /** Index into a flat, run-concatenated slot array where each run starts. */
  runOffset: number[]
  /** Token index of the literal directly before run `i`, or `-1` at the mask start. */
  literalBeforeRun: number[]
  /** Total slot capacity of runs `i..end`; `capacityFromRun[runCount]` is `0`. */
  capacityFromRun: number[]
  /** For each token, the run it *is* (`-1` for literals). */
  runOfToken: number[]
  /** For each literal token, the run directly before it (`-1` when it opens the mask). */
  runBeforeLiteral: number[]
  /** For each literal token, the run directly after it (`-1` when it closes the mask). */
  runAfterLiteral: number[]
  /** Total number of slots in the mask. */
  totalSlots: number
}

// A bound input re-applies the same (static) mask string on every keystroke,
// so compiling it is pure, repeated work — cache by mask string instead of
// re-walking and re-allocating on every keystroke.
const compiledCache = new Map<string, CompiledMask>()

/**
 * Split a mask into alternating literal and slot-run tokens (e.g. "99/99/9999"
 * → slots"99", literal"/", slots"99", literal"/", slots"9999") and derive the
 * run/literal adjacency both passes rely on.
 */
function compileMask(mask: string): CompiledMask {
  const cached = compiledCache.get(mask)
  if (cached) return cached

  const tokens: MaskToken[] = []
  const runOfToken: number[] = []
  const runChars: string[] = []
  const runToken: number[] = []

  let i = 0
  while (i < mask.length) {
    const start = i
    const wantSlots = isSlotChar(mask[i])
    while (i < mask.length && isSlotChar(mask[i]) === wantSlots) i++
    const text = mask.slice(start, i)
    if (wantSlots) {
      runOfToken.push(runChars.length)
      runToken.push(tokens.length)
      runChars.push(text)
      tokens.push({ kind: 'slots', chars: text })
    } else {
      runOfToken.push(-1)
      tokens.push({ kind: 'literal', text })
    }
  }

  const runCount = runChars.length
  const runOffset: number[] = new Array(runCount)
  const literalBeforeRun: number[] = new Array(runCount)
  const capacityFromRun: number[] = new Array(runCount + 1)
  const runBeforeLiteral: number[] = new Array(tokens.length).fill(-1)
  const runAfterLiteral: number[] = new Array(tokens.length).fill(-1)

  let offset = 0
  for (let r = 0; r < runCount; r++) {
    runOffset[r] = offset
    offset += runChars[r].length
    // Tokens alternate, so the token just before a run is always a literal
    // when it exists at all.
    literalBeforeRun[r] = runToken[r] > 0 ? runToken[r] - 1 : -1
  }

  capacityFromRun[runCount] = 0
  for (let r = runCount - 1; r >= 0; r--) {
    capacityFromRun[r] = capacityFromRun[r + 1] + runChars[r].length
  }

  for (let t = 0; t < tokens.length; t++) {
    if (tokens[t].kind !== 'literal') continue
    runBeforeLiteral[t] = t > 0 ? runOfToken[t - 1] : -1
    runAfterLiteral[t] = t + 1 < tokens.length ? runOfToken[t + 1] : -1
  }

  const compiled: CompiledMask = {
    tokens,
    runChars,
    runOffset,
    literalBeforeRun,
    capacityFromRun,
    runOfToken,
    runBeforeLiteral,
    runAfterLiteral,
    totalSlots: offset,
  }
  compiledCache.set(mask, compiled)
  return compiled
}

/**
 * Text of the separator that introduces run `run`.
 *
 * Tokens alternate, so every run except the very first is preceded by a
 * literal. Both callers only ask about a run they are advancing *into* — never
 * run 0 — so the lookup is always defined.
 */
function separatorBefore(plan: CompiledMask, run: number): string {
  return (plan.tokens[plan.literalBeforeRun[run]] as { text: string }).text
}

/** Count of remaining slot-matchable (digit/letter) characters in `value` from `fromIdx` onward. */
function remainingDataChars(value: string, fromIdx: number): number {
  let count = 0
  for (let i = fromIdx; i < value.length; i++) {
    const ch = value[i]
    if (isDigitChar(ch) || isLetterChar(ch)) count++
  }
  return count
}

/** Where each character of `value` ended up, as produced by {@link assignToSlots}. */
interface Assignment {
  /** Flat, run-concatenated slot array: the character in each slot, or `''` when empty. */
  slotChar: string[]
  /** `value` index each filled slot came from; meaningless where `slotChar` is `''`. */
  slotSource: number[]
  /** How many slots of each run are filled (always a prefix of the run). */
  runFilled: number[]
  /** For each literal token, the `value` index it was consumed from, or `-1` if it wasn't. */
  literalSource: number[]
}

/**
 * Find the segment that a separator sitting at `valueIdx` anchors the rest of
 * the value to, or `-1` when the character is just noise.
 *
 * A separator is only trusted as an anchor when everything still left in
 * `value` actually fits in the slot capacity from that segment onward.
 * Otherwise honoring it would strand data the mask can no longer hold (e.g.
 * pasting into a later segment while an earlier one is still under-filled),
 * so the character is treated as stray noise instead and the current segment
 * takes the slot it needs. Because capacity only shrinks as you move right
 * through the mask, a nearer candidate that can't fit rules out every farther
 * one too — so the search stops at the first literal that matches by text.
 */
function findAnchorRun(
  value: string,
  valueIdx: number,
  plan: CompiledMask,
  fromRun: number,
): number {
  const remaining = remainingDataChars(value, valueIdx)
  for (let run = fromRun + 1; run < plan.runChars.length; run++) {
    if (!value.startsWith(separatorBefore(plan, run), valueIdx)) continue
    return remaining <= plan.capacityFromRun[run] ? run : -1
  }
  return -1
}

/**
 * Pass 1 — place every character of `value` into a mask slot.
 *
 * Walks left to right filling the current run. Characters that don't match
 * the slot they land on are either an *anchor* (a separator that belongs to a
 * later segment, see {@link findAnchorRun} — jump there and keep the segments
 * in between empty) or noise (skip them). A run that fills up completely
 * advances to the next one, swallowing that segment's separator from `value`
 * if it's sitting right there.
 *
 * Within a run, filled slots are always a prefix — the walk never goes
 * backwards, so a run can be partially filled but never has holes.
 */
function assignToSlots(value: string, plan: CompiledMask): Assignment {
  const runCount = plan.runChars.length
  const slotChar: string[] = new Array(plan.totalSlots).fill('')
  const slotSource: number[] = new Array(plan.totalSlots).fill(-1)
  const runFilled: number[] = new Array(runCount).fill(0)
  const literalSource: number[] = new Array(plan.tokens.length).fill(-1)

  let runIdx = 0
  let slotIdx = 0
  let valueIdx = 0

  while (valueIdx < value.length && runIdx < runCount) {
    const chars = plan.runChars[runIdx]
    const ch = value[valueIdx]

    if (matchesSlot(ch, chars[slotIdx])) {
      const flat = plan.runOffset[runIdx] + slotIdx
      slotChar[flat] = ch
      slotSource[flat] = valueIdx
      runFilled[runIdx] = slotIdx + 1
      valueIdx++
      slotIdx++

      if (slotIdx === chars.length) {
        runIdx++
        slotIdx = 0
        // This segment is done: if its separator is the next thing in
        // `value`, consume it here so the following run starts clean.
        if (runIdx < runCount) {
          const text = separatorBefore(plan, runIdx)
          if (value.startsWith(text, valueIdx)) {
            literalSource[plan.literalBeforeRun[runIdx]] = valueIdx
            valueIdx += text.length
          }
        }
      }
      continue
    }

    const anchor = findAnchorRun(value, valueIdx, plan, runIdx)
    if (anchor >= 0) {
      literalSource[plan.literalBeforeRun[anchor]] = valueIdx
      valueIdx += separatorBefore(plan, anchor).length
      runIdx = anchor
      slotIdx = 0
      continue
    }

    valueIdx++ // stray/noise char — skip it
  }

  return { slotChar, slotSource, runFilled, literalSource }
}

/**
 * Decide which literals the rendered value actually shows.
 *
 * A separator earns its place two ways:
 *
 * - **anchor** — the segment right after it holds data, so the separator is
 *   what tells the reader (and the next parse) where that data belongs.
 * - **eager** — the segment right before it is completely filled, so the
 *   separator is revealed before the user types the character that would
 *   normally pull it in. A literal that opens the mask counts as eager too:
 *   there's no segment in front of it to fill. See `ApplyMaskOptions.eager`.
 *
 * Separators around segments that are simply empty are dropped, which is what
 * collapses "015" + skipped middle + "-39" down to `015.-39` rather than
 * padding the gap with every separator in between.
 *
 * The second loop is a round-trip guard. `bind()` feeds the rendered value
 * straight back through this masking on the next keystroke, so a render that
 * doesn't parse back to the same assignment would make characters drift while
 * the user types. Dropping a separator is only safe when it can't be confused
 * for the next visible one: with `99/99/9999` holding "1" and "2025", hiding
 * the first "/" would leave "1/2025", which re-parses as 1 / 20 / 25. So any
 * hidden separator between two filled segments that reads the same as the one
 * introducing the later segment is put back — `1//2025`, which re-parses to
 * exactly what it renders. Masks with distinct separators (dates aside, most
 * of them: CPF, CNPJ, phone numbers) never hit this and stay compact.
 */
function resolveLiteralVisibility(
  plan: CompiledMask,
  assignment: Assignment,
  eager: boolean,
): boolean[] {
  const { tokens, runBeforeLiteral, runAfterLiteral, literalBeforeRun, runChars } = plan
  const { runFilled } = assignment
  const visible: boolean[] = new Array(tokens.length).fill(false)

  for (let t = 0; t < tokens.length; t++) {
    if (tokens[t].kind !== 'literal') continue
    const after = runAfterLiteral[t]
    const before = runBeforeLiteral[t]
    visible[t] =
      (after >= 0 && runFilled[after] > 0) ||
      (eager && (before < 0 || runFilled[before] === runChars[before].length))
  }

  let previousFilledRun = -1
  for (let run = 0; run < runChars.length; run++) {
    if (runFilled[run] === 0) continue
    const litToken = literalBeforeRun[run]
    if (litToken >= 0) {
      const text = (tokens[litToken] as { text: string }).text
      for (let skipped = previousFilledRun + 1; skipped < run; skipped++) {
        const skippedLit = literalBeforeRun[skipped]
        if (skippedLit < 0) continue
        if ((tokens[skippedLit] as { text: string }).text === text) visible[skippedLit] = true
      }
    }
    previousFilledRun = run
  }

  return visible
}

/**
 * Pass 2 — emit the assigned characters and justified literals, tracking the caret.
 *
 * **Caret algorithm**: every emitted character that came from a `value`
 * position *before* `inputCaret` pushes the output caret to the current
 * output length; the first character from at-or-after `inputCaret` freezes
 * it. A literal only carries the caret past itself while the caret is still
 * sitting at the frontier (everything emitted so far is behind it), and then
 * only when the literal isn't standing between the caret and text the user
 * hasn't reached yet: either it was revealed eagerly right after the segment
 * being typed, or it was already in `value` ahead of the caret. That's what
 * puts the caret at `015.|-39` — past the separator the just-completed "015"
 * revealed, but not past the "-" that anchors the untouched "39".
 */
function renderAssignment(
  plan: CompiledMask,
  assignment: Assignment,
  visible: boolean[],
  inputCaret: number,
  eager: boolean,
): MaskResult {
  const { tokens, runChars, runOffset, runBeforeLiteral, runAfterLiteral, runOfToken } = plan
  const { slotChar, slotSource, runFilled } = assignment

  let output = ''
  let outputCaret = 0
  let caretResolved = false

  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t]

    if (token.kind === 'literal') {
      if (!visible[t]) continue
      const before = runBeforeLiteral[t]
      const after = runAfterLiteral[t]
      // Revealed ahead of the user rather than typed by them, *and* nothing
      // waiting on the far side of it — this separator is the frontier of
      // what's been entered, so the caret belongs past it, ready for the next
      // segment. A separator dividing two segments that both already hold
      // text is not a frontier: the caret stays exactly where the browser
      // put it instead of jumping over content the user didn't touch.
      const opensEmptySegment = after < 0 || runFilled[after] === 0
      const revealedEagerly =
        eager && (before < 0 || runFilled[before] === runChars[before].length)
      const source = assignment.literalSource[t]
      const atFrontier = !caretResolved && outputCaret === output.length
      output += token.text
      if (
        atFrontier &&
        ((revealedEagerly && opensEmptySegment) || (source >= 0 && source < inputCaret))
      ) {
        outputCaret = output.length
      }
      continue
    }

    const run = runOfToken[t]
    const offset = runOffset[run]
    for (let s = 0; s < runFilled[run]; s++) {
      output += slotChar[offset + s]
      if (caretResolved) continue
      if (slotSource[offset + s] < inputCaret) outputCaret = output.length
      else caretResolved = true
    }
  }

  return { value: output, caret: outputCaret }
}

/**
 * Same contract as {@link applyFlatMask}, but keeps every character in the
 * segment it belongs to instead of repacking the whole value from the left.
 */
function applySegmentedMask(
  value: string,
  mask: string,
  inputCaret: number,
  eager: boolean,
): MaskResult {
  const plan = compileMask(mask)
  const assignment = assignToSlots(value, plan)
  const visible = resolveLiteralVisibility(plan, assignment, eager)
  return renderAssignment(plan, assignment, visible, inputCaret, eager)
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function applyMask(
  value: string,
  mask: string,
  inputCaret = 0,
  options?: ApplyMaskOptions,
): MaskResult {
  if (!value) return { value: '', caret: 0 }
  const eager = options?.eager !== false
  return options?.segmented === false
    ? applyFlatMask(value, mask, inputCaret, eager)
    : applySegmentedMask(value, mask, inputCaret, eager)
}
