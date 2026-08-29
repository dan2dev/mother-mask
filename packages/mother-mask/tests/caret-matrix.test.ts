import { describe, it, expect, afterEach } from 'vitest'
import { bind, buildMask } from '../src/index'
import type { ApplyMaskOptions, MaskPattern } from '../src/index'
import { restoreSwallowedSeparators } from '../src/bind-shared'
import { PatternCompiler } from '../src/pattern'

// ---------------------------------------------------------------------------
// Exhaustive combinatorial coverage: every caret position, every caret
// selection, every kind of edit (insert / replace-selection / backspace /
// delete), across every mask shape the library supports (flat, segmented,
// array, alphanumeric), typed at every speed the event pipeline can produce.
//
// Rather than hand-writing thousands of expected values, each case is
// cross-checked against `buildMask()` — the exact function `bind()` calls
// internally to decide what to render. For the "insert" family this is a
// fully independent oracle: `bind()`'s insert branch is a direct pass-through
// of `buildMask(...).caret`, so any mismatch means the *wiring* (closures,
// element/position bookkeeping, event handling) is wrong, not the masking
// algorithm. For delete/backspace, `bind()` deliberately nudges the caret
// past a reflowed separator in specific cases — that nudge is re-derived here
// from independently computed before/after lengths rather than copied from
// the implementation, so it stays a meaningful check rather than a tautology.
// ---------------------------------------------------------------------------

interface MaskConfig {
  name: string
  mask: MaskPattern
  /** A fully-typed, correctly-masked value for this mask/config. */
  full: string
  options?: ApplyMaskOptions
  /** Characters exercised at every position: a digit, a letter, and a literal/noise char. */
  chars: string[]
}

const MASKS: MaskConfig[] = [
  { name: 'CPF (999.999.999-99, segmented)', mask: '999.999.999-99', full: '123.456.789-01', chars: ['1', 'a', '#'] },
  {
    name: 'phone array ((99) 9999-9999 | (99) 99999-9999)',
    mask: ['(99) 9999-9999', '(99) 99999-9999'],
    full: '(11) 99988-7766',
    chars: ['1', 'a', '#'],
  },
  { name: 'date (99/99/9999, segmented)', mask: '99/99/9999', full: '25/12/2025', chars: ['1', 'a', '#'] },
  {
    name: 'plate (ZZZ-9999, flat/segmented:false)',
    mask: 'ZZZ-9999',
    full: 'ABC-1234',
    options: { segmented: false },
    chars: ['a', '1', '#'],
  },
  { name: 'mercosul plate (ZZZ-9Z99, segmented)', mask: 'ZZZ-9Z99', full: 'ABC-1D23', chars: ['a', '1', '#'] },
  {
    name: 'CNPJ alnum (AA.AAA.AAA/AAAA-99, segmented)',
    mask: 'AA.AAA.AAA/AAAA-99',
    full: '1A.B2C.3D4/5E6F-78',
    chars: ['1', 'a', '#'],
  },
  { name: 'custom hex', mask: 'HH:HH:HH', full: 'a1:b2:c3', options: { tokens: { H: /[0-9a-f]/i } }, chars: ['a', '1', 'g'] },
  { name: 'transformed identifier', mask: 'UUU-999', full: 'ABC-123', options: { tokens: { U: { match: /[a-z]/i, transform: c => c.toUpperCase() } } }, chars: ['x', '1', '#'] },
  { name: 'transformed flat identifier', mask: 'UUU-999', full: 'ABC-123', options: { segmented: false, tokens: { U: { match: /[a-z]/i, transform: c => c.toUpperCase() } } }, chars: ['x', '1', '#'] },
  { name: 'escaped prefix', mask: '\\A-99.99', full: 'A-12.34', chars: ['1', 'A', '#'] },
  { name: 'Unicode letters', mask: 'LLL-LLL', full: 'ЖλÁ-üøÇ', options: { tokens: { L: /\p{L}/u } }, chars: ['ñ', '1', '#'] },
  { name: 'custom array', mask: ['HH-HH', 'HH-HH-HH'], full: 'ab-cd-ef', options: { tokens: { H: /[0-9a-f]/i } }, chars: ['a', '1', 'g'] },

]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let createdInputs: HTMLInputElement[] = []

afterEach(() => {
  for (const el of createdInputs) el.remove()
  createdInputs = []
})

function makeInput(mask: MaskPattern, initialValue: string, options?: ApplyMaskOptions): HTMLInputElement {
  const input = document.createElement('input')
  input.value = initialValue
  document.body.appendChild(input)
  bind(input, mask, options ?? null)
  createdInputs.push(input)
  return input
}

function dispatchInput(input: HTMLInputElement, opts: { data?: string | null; inputType?: string } = {}): void {
  const event = new Event('input', { bubbles: true, cancelable: false })
  Object.defineProperty(event, 'data', { value: opts.data ?? null, configurable: true })
  Object.defineProperty(event, 'inputType', { value: opts.inputType ?? '', configurable: true })
  Object.defineProperty(event, 'isComposing', { value: false, configurable: true })
  input.dispatchEvent(event)
}

/**
 * The literal text a mask renders before its first slot, and the literal that
 * closes that first field — `["(", ") "]` for `(999) 999-9999`. Parsed
 * straight from the pattern so the oracle below stays independent of the
 * masking implementation it is checking.
 */
function frameLiterals(mask: MaskPattern, options?: ApplyMaskOptions): [string, string] {
  const pattern = Array.isArray(mask) ? mask[0] : mask
  const slotKeys = new Set(['9', 'Z', 'A', ...Object.keys(options?.tokens ?? {})])
  const groups: { slots: boolean; text: string }[] = []
  const points = Array.from(pattern)
  for (let i = 0; i < points.length; i++) {
    let ch = points[i]
    let slots = slotKeys.has(ch)
    if (ch === '\\' && i + 1 < points.length) {
      ch = points[++i]
      slots = false
    }
    const last = groups[groups.length - 1]
    if (last?.slots === slots) last.text += ch
    else groups.push({ slots, text: ch })
  }
  if (!groups.length || groups[0].slots) return ['', '']
  return [groups[0].text, groups[2]?.slots === false ? groups[2].text : '']
}

/**
 * Caret for a deletion that started at position 0 and took the mask's opening
 * literal with it. The render puts that frame back around the now-empty first
 * field, so the caret belongs inside the field rather than outside the mask —
 * deleting "(555)" out of "(555) 123-4567" lands at "(|) 123-4567". Returns
 * `-1` when this edit restored no frame and the plain rules apply.
 */
function restoredFrameCaret(
  cfg: MaskConfig,
  start: number,
  raw: string,
  value: string,
): number {
  if (start !== 0 || value === cfg.full) return -1
  const [lead, divider] = frameLiterals(cfg.mask, cfg.options)
  if (!lead || raw.startsWith(lead) || !value.startsWith(lead + divider)) return -1
  return lead.length
}

/** Fail loudly but compactly: report the count and the first N mismatches. */
function assertNoFailures(failures: string[], total: number): void {
  const preview = failures.slice(0, 20).join('\n')
  expect(failures, `${failures.length}/${total} cases failed:\n${preview}`).toEqual([])
}

/** Merge an explicit eager setting into a mask config's options. */
function withEager(cfg: MaskConfig, eager: boolean): ApplyMaskOptions {
  return { ...cfg.options, eager }
}

// Insert and select+replace are both eager-sensitive (they're the "insert"
// family `bind()` never overrides), so both are swept once with eager on
// (the library default) and once with it explicitly turned off, using
// `buildMask()` under the exact same option as an independent oracle. This
// is what proves eager's tail-reveal and its opt-out both hold at *every*
// caret position/selection, not just the hand-picked cases in eager.test.ts.
const EAGER_SETTINGS = [true, false] as const

// ---------------------------------------------------------------------------
// 1. Insert at every caret position (append, middle, start) with every char
// ---------------------------------------------------------------------------

describe('caret matrix — insert at every position', () => {
  for (const cfg of MASKS) {
    for (const eager of EAGER_SETTINGS) {
      it(`${cfg.name} [eager: ${eager}]`, () => {
        const options = withEager(cfg, eager)
        const failures: string[] = []
        let total = 0

        for (let pos = 0; pos <= cfg.full.length; pos++) {
          for (const ch of cfg.chars) {
            total++
            const input = makeInput(cfg.mask, cfg.full, options)
            const raw = cfg.full.slice(0, pos) + ch + cfg.full.slice(pos)
            input.value = raw
            input.setSelectionRange(pos + 1, pos + 1)
            dispatchInput(input, { data: ch, inputType: 'insertText' })

            const m = buildMask(raw, cfg.mask, pos + 1, options)
            const expectedValue = m.process()
            const expectedCaret = m.caret

            if (input.value !== expectedValue || input.selectionStart !== expectedCaret || input.selectionEnd !== expectedCaret) {
              failures.push(
                `pos=${pos} ch=${JSON.stringify(ch)}: got value=${JSON.stringify(input.value)} caret=${input.selectionStart}, want value=${JSON.stringify(expectedValue)} caret=${expectedCaret}`,
              )
            }
          }
        }

        assertNoFailures(failures, total)
      })
    }
  }
})

// ---------------------------------------------------------------------------
// 2. Select a range, type over it, at every (start, end) pair
// ---------------------------------------------------------------------------

describe('caret matrix — select + replace at every selection range', () => {
  for (const cfg of MASKS) {
    for (const eager of EAGER_SETTINGS) {
      it(`${cfg.name} [eager: ${eager}]`, () => {
        const options = withEager(cfg, eager)
        const failures: string[] = []
        let total = 0
        const len = cfg.full.length
        const compiler = new PatternCompiler(cfg.options?.tokens)
        const isData = (ch: string): boolean => compiler.isData(ch)
        const isStaticMask = !Array.isArray(cfg.mask) && !cfg.options?.resolveMask

        /**
         * Mirrors `bind()`'s select-and-replace rescue (see `bind.ts`): typing
         * over a selection destroys the same dividers a Delete would, so the
         * swallowed ones go back — but only when the plain reformat would
         * otherwise move text the edit never touched.
         */
        const rescueReplace = (raw: string, pos: number, insertedLength: number): string => {
          if (!isStaticMask) return raw
          const removedLength = cfg.full.length - raw.length + insertedLength
          const rescued = restoreSwallowedSeparators(raw, pos, removedLength, cfg.full, isData, insertedLength)
          if (rescued === raw) return raw
          const tail = cfg.full.slice(pos - insertedLength + removedLength)
          return buildMask(raw, cfg.mask, pos, options).process().endsWith(tail) ? raw : rescued
        }

        for (let start = 0; start <= len; start++) {
          for (let end = start + 1; end <= len; end++) {
            for (const ch of cfg.chars) {
              total++
              const input = makeInput(cfg.mask, cfg.full, options)
              const raw = cfg.full.slice(0, start) + ch + cfg.full.slice(end)
              input.value = raw
              input.setSelectionRange(start + 1, start + 1)
              dispatchInput(input, { data: ch, inputType: 'insertText' })

              const m = buildMask(rescueReplace(raw, start + 1, ch.length), cfg.mask, start + 1, options)
              const expectedValue = m.process()
              const expectedCaret = m.caret

              if (input.value !== expectedValue || input.selectionStart !== expectedCaret || input.selectionEnd !== expectedCaret) {
                failures.push(
                  `[${start},${end}) ch=${JSON.stringify(ch)}: got value=${JSON.stringify(input.value)} caret=${input.selectionStart}, want value=${JSON.stringify(expectedValue)} caret=${expectedCaret}`,
                )
              }
            }
          }
        }

        assertNoFailures(failures, total)
      })
    }
  }
})

// ---------------------------------------------------------------------------
// 3. Select a range and delete it (Backspace or Delete), at every pair
// ---------------------------------------------------------------------------

describe('caret matrix — select + delete at every selection range', () => {
  for (const cfg of MASKS) {
    // Delete-family edits are swept at both configured eager settings too —
    // but unlike insert, the *oracle* always computes with eager off (see
    // below), so this also proves the invariant that delete/backspace behave
    // identically no matter how `eager` was configured on `bind()`.
    for (const eager of EAGER_SETTINGS) {
      it(`${cfg.name} [eager: ${eager}]`, () => {
        const options = withEager(cfg, eager)
        const failures: string[] = []
        let total = 0
        const len = cfg.full.length
        const compiler = new PatternCompiler(cfg.options?.tokens)
        const isData = (ch: string): boolean => compiler.isData(ch)
        // Mirrors `isPlainContentDelete` in `bind.ts`: only a static
        // single-pattern mask gets the swallowed-separator rescue, since an
        // array's resolved member can change with the new data count.
        const isPlainContentDelete = !Array.isArray(cfg.mask) && !cfg.options?.resolveMask

        for (let start = 0; start <= len; start++) {
          for (let end = start + 1; end <= len; end++) {
            for (const mode of ['backspace', 'delete'] as const) {
              total++
              const input = makeInput(cfg.mask, cfg.full, options)
              const raw = cfg.full.slice(0, start) + cfg.full.slice(end)
              input.value = raw
              input.setSelectionRange(start, start)
              dispatchInput(input, {
                inputType: mode === 'backspace' ? 'deleteContentBackward' : 'deleteContentForward',
              })

              // Oracle mirrors `bind()`'s own delete-vs-insert tie-break: eager
              // never resurrects a literal the edit just deleted (see
              // `eagerForEdit` in bind.ts), so this is always computed with
              // eager off, regardless of `options.eager`. It also mirrors the
              // swallowed-separator rescue itself (`restoreSwallowedSeparators`
              // in bind-shared.ts): a plain content delete/backspace gets the
              // same pre-restoration `bind()` applies before masking, so the
              // oracle stays independent of `bind()`'s wiring while still
              // reflecting its documented, intentional behavior.
              const formatValue = isPlainContentDelete
                ? restoreSwallowedSeparators(raw, start, end - start, cfg.full, isData)
                : raw
              const m = buildMask(formatValue, cfg.mask, start, { ...options, eager: false })
              const expectedValue = m.process()
              // Backspace cannot cross the untouched suffix: removing extra
              // divider text on the left moves that boundary left as well.
              // Derive it from the surviving suffix, not bind's caret helper.
              // An unchanged prefix wins when shorter arrays merge identical dividers.
              const suffix = cfg.full.slice(end)
              const backwardLimit = !expectedValue.startsWith(cfg.full.slice(0, start)) && expectedValue.endsWith(suffix)
                ? expectedValue.length - suffix.length : start
              // Forward Delete retains its one-position nudge when restoring a literal.
              const framed = restoredFrameCaret(cfg, start, raw, expectedValue)
              const rawCaret =
                mode === 'backspace' ? (framed >= 0 ? framed : Math.min(start, backwardLimit))
                  : cfg.full.length === expectedValue.length ? start + 1 : framed >= 0 ? framed : start
              const expectedCaret = Math.min(rawCaret, expectedValue.length)

              if (input.value !== expectedValue || input.selectionStart !== expectedCaret || input.selectionEnd !== expectedCaret) {
                failures.push(
                  `[${start},${end}) ${mode}: got value=${JSON.stringify(input.value)} caret=${input.selectionStart}, want value=${JSON.stringify(expectedValue)} caret=${expectedCaret}`,
                )
              }
            }
          }
        }

        assertNoFailures(failures, total)
      })
    }
  }
})

// ---------------------------------------------------------------------------
// 4. Plain Backspace / Delete (no selection) at every caret position
// ---------------------------------------------------------------------------

describe('caret matrix — Backspace at every position (no selection)', () => {
  for (const cfg of MASKS) {
    for (const eager of EAGER_SETTINGS) {
      it(`${cfg.name} [eager: ${eager}]`, () => {
        const options = withEager(cfg, eager)
        const failures: string[] = []
        let total = 0

        for (let pos = 1; pos <= cfg.full.length; pos++) {
          total++
          const input = makeInput(cfg.mask, cfg.full, options)
          const raw = cfg.full.slice(0, pos - 1) + cfg.full.slice(pos)
          input.value = raw
          input.setSelectionRange(pos - 1, pos - 1)
          dispatchInput(input, { inputType: 'deleteContentBackward' })

          // eager off — see the comment in the "select + delete" matrix above.
          const m = buildMask(raw, cfg.mask, pos - 1, { ...options, eager: false })
          const expectedValue = m.process()
          const suffix = cfg.full.slice(pos)
          const backwardLimit = !expectedValue.startsWith(cfg.full.slice(0, pos - 1)) && expectedValue.endsWith(suffix)
            ? expectedValue.length - suffix.length : pos - 1
          const expectedCaret = Math.min(pos - 1, backwardLimit, expectedValue.length)

          if (input.value !== expectedValue || input.selectionStart !== expectedCaret || input.selectionEnd !== expectedCaret) {
            failures.push(
              `pos=${pos}: got value=${JSON.stringify(input.value)} caret=${input.selectionStart}, want value=${JSON.stringify(expectedValue)} caret=${expectedCaret}`,
            )
          }
        }

        assertNoFailures(failures, total)
      })
    }
  }
})

describe('caret matrix — Delete-forward at every position (no selection)', () => {
  for (const cfg of MASKS) {
    for (const eager of EAGER_SETTINGS) {
      it(`${cfg.name} [eager: ${eager}]`, () => {
        const options = withEager(cfg, eager)
        const failures: string[] = []
        let total = 0

        for (let pos = 0; pos < cfg.full.length; pos++) {
          total++
          const input = makeInput(cfg.mask, cfg.full, options)
          const raw = cfg.full.slice(0, pos) + cfg.full.slice(pos + 1)
          input.value = raw
          input.setSelectionRange(pos, pos)
          dispatchInput(input, { inputType: 'deleteContentForward' })

          // eager off — see the comment in the "select + delete" matrix above.
          const m = buildMask(raw, cfg.mask, pos, { ...options, eager: false })
          const expectedValue = m.process()
          const rawCaret = cfg.full.length === expectedValue.length ? pos + 1 : pos
          // `setSelectionRange` clamps to the (possibly shorter, reflowed) value length.
          const expectedCaret = Math.min(rawCaret, expectedValue.length)

          if (input.value !== expectedValue || input.selectionStart !== expectedCaret || input.selectionEnd !== expectedCaret) {
            failures.push(
              `pos=${pos}: got value=${JSON.stringify(input.value)} caret=${input.selectionStart}, want value=${JSON.stringify(expectedValue)} caret=${expectedCaret}`,
            )
          }
        }

        assertNoFailures(failures, total)
      })
    }
  }
})

// ---------------------------------------------------------------------------
// 5. Speed: the legacy `keydown` + `requestAnimationFrame` fallback path
//    (used when no real `input` event fires) exercised at every position,
//    at the two extremes jsdom can meaningfully distinguish: a frame flushed
//    after every keystroke ("deliberate" typing) vs. zero frames flushed
//    until the whole burst has landed ("fastest possible" typing).
// ---------------------------------------------------------------------------

async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
}

describe('caret matrix — legacy keydown fallback, fastest-possible burst (zero flush)', () => {
  for (const cfg of MASKS) {
    for (const eager of EAGER_SETTINGS) {
      it(`${cfg.name} [eager: ${eager}]`, async () => {
        const options = withEager(cfg, eager)
        const input = document.createElement('input')
        document.body.appendChild(input)
        createdInputs.push(input)
        bind(input, cfg.mask, options)

        let raw = ''
        for (const ch of cfg.full.replace(/[^a-zA-Z0-9]/g, '')) {
          raw += ch
          input.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }))
          input.value = raw
          input.setSelectionRange(raw.length, raw.length)
          // Deliberately no `flushRafs()` here — every keystroke in this burst
          // lands before the browser gets a single animation frame to react.
        }
        await flushRafs()

        const m = buildMask(raw, cfg.mask, raw.length, options)
        expect(input.value).toBe(m.process())
        expect(input.selectionStart).toBe(m.caret)
      })
    }
  }
})

describe('caret matrix — legacy keydown fallback, deliberate typing (flush every keystroke), every position', () => {
  // Full position sweep on two representative configs (one flat/segmented
  // digit mask, one alphanumeric segmented mask) — running every mask here
  // too would multiply the already-awaited-per-keystroke cost six-fold for
  // marginal extra coverage over the sync `input`-driven matrices above.
  const sampled = MASKS.filter((c) => c.name.startsWith('CPF') || c.name.startsWith('mercosul'))

  for (const cfg of sampled) {
    for (const eager of EAGER_SETTINGS) {
      it(`${cfg.name} [eager: ${eager}]`, async () => {
        const options = withEager(cfg, eager)
        const failures: string[] = []
        let total = 0
        // Drop the last character so the field starts one slot short of full —
        // inserting into an already-full value is correctly blocked by the
        // desktop `keydown` max-length guard (`preventDefault`), which is a
        // deliberate product behavior, not something this speed matrix targets.
        const base = cfg.full.slice(0, -1)

        for (let pos = 0; pos <= base.length; pos++) {
          for (const ch of cfg.chars) {
            total++
            const input = document.createElement('input')
            document.body.appendChild(input)
            bind(input, cfg.mask, options)
            input.value = base
            input.setSelectionRange(pos, pos)

            const raw = base.slice(0, pos) + ch + base.slice(pos)
            input.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }))
            input.value = raw
            input.setSelectionRange(pos + 1, pos + 1)
            await flushRafs()

            const m = buildMask(raw, cfg.mask, pos + 1, options)
            const expectedValue = m.process()
            const expectedCaret = m.caret

            if (input.value !== expectedValue || input.selectionStart !== expectedCaret || input.selectionEnd !== expectedCaret) {
              failures.push(
                `pos=${pos} ch=${JSON.stringify(ch)}: got value=${JSON.stringify(input.value)} caret=${input.selectionStart}, want value=${JSON.stringify(expectedValue)} caret=${expectedCaret}`,
              )
            }
            input.remove()
          }
        }

        assertNoFailures(failures, total)
      })
    }
  }
})
