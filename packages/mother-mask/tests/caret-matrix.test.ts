import { describe, it, expect, afterEach } from 'vitest'
import { bind, buildMask } from '../src/index'
import type { ApplyMaskOptions, MaskPattern } from '../src/index'

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

/** Fail loudly but compactly: report the count and the first N mismatches. */
function assertNoFailures(failures: string[], total: number): void {
  const preview = failures.slice(0, 20).join('\n')
  expect(failures, `${failures.length}/${total} cases failed:\n${preview}`).toEqual([])
}

// ---------------------------------------------------------------------------
// 1. Insert at every caret position (append, middle, start) with every char
// ---------------------------------------------------------------------------

describe('caret matrix — insert at every position', () => {
  for (const cfg of MASKS) {
    it(cfg.name, () => {
      const failures: string[] = []
      let total = 0

      for (let pos = 0; pos <= cfg.full.length; pos++) {
        for (const ch of cfg.chars) {
          total++
          const input = makeInput(cfg.mask, cfg.full, cfg.options)
          const raw = cfg.full.slice(0, pos) + ch + cfg.full.slice(pos)
          input.value = raw
          input.setSelectionRange(pos + 1, pos + 1)
          dispatchInput(input, { data: ch, inputType: 'insertText' })

          const m = buildMask(raw, cfg.mask, pos + 1, cfg.options)
          const expectedValue = m.process()
          const expectedCaret = m.caret

          if (input.value !== expectedValue || input.selectionStart !== expectedCaret) {
            failures.push(
              `pos=${pos} ch=${JSON.stringify(ch)}: got value=${JSON.stringify(input.value)} caret=${input.selectionStart}, want value=${JSON.stringify(expectedValue)} caret=${expectedCaret}`,
            )
          }
        }
      }

      assertNoFailures(failures, total)
    })
  }
})

// ---------------------------------------------------------------------------
// 2. Select a range, type over it, at every (start, end) pair
// ---------------------------------------------------------------------------

describe('caret matrix — select + replace at every selection range', () => {
  for (const cfg of MASKS) {
    it(cfg.name, () => {
      const failures: string[] = []
      let total = 0
      const len = cfg.full.length

      for (let start = 0; start <= len; start++) {
        for (let end = start + 1; end <= len; end++) {
          for (const ch of cfg.chars) {
            total++
            const input = makeInput(cfg.mask, cfg.full, cfg.options)
            const raw = cfg.full.slice(0, start) + ch + cfg.full.slice(end)
            input.value = raw
            input.setSelectionRange(start + 1, start + 1)
            dispatchInput(input, { data: ch, inputType: 'insertText' })

            const m = buildMask(raw, cfg.mask, start + 1, cfg.options)
            const expectedValue = m.process()
            const expectedCaret = m.caret

            if (input.value !== expectedValue || input.selectionStart !== expectedCaret) {
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
})

// ---------------------------------------------------------------------------
// 3. Select a range and delete it (Backspace or Delete), at every pair
// ---------------------------------------------------------------------------

describe('caret matrix — select + delete at every selection range', () => {
  for (const cfg of MASKS) {
    it(cfg.name, () => {
      const failures: string[] = []
      let total = 0
      const len = cfg.full.length

      for (let start = 0; start <= len; start++) {
        for (let end = start + 1; end <= len; end++) {
          for (const mode of ['backspace', 'delete'] as const) {
            total++
            const input = makeInput(cfg.mask, cfg.full, cfg.options)
            const raw = cfg.full.slice(0, start) + cfg.full.slice(end)
            input.value = raw
            input.setSelectionRange(start, start)
            dispatchInput(input, {
              inputType: mode === 'backspace' ? 'deleteContentBackward' : 'deleteContentForward',
            })

            const m = buildMask(raw, cfg.mask, start, cfg.options)
            const expectedValue = m.process()
            // Backspace is a direct pass-through of the post-deletion caret
            // (`start`). Delete additionally nudges past a reflowed literal
            // when the masked length is unchanged by the edit — re-derived
            // here from the two independently computed lengths. Either way,
            // `setSelectionRange` clamps to the (possibly shorter, reflowed)
            // value length, same as any real browser.
            const rawCaret =
              mode === 'backspace' ? start : cfg.full.length === expectedValue.length ? start + 1 : start
            const expectedCaret = Math.min(rawCaret, expectedValue.length)

            if (input.value !== expectedValue || input.selectionStart !== expectedCaret) {
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
})

// ---------------------------------------------------------------------------
// 4. Plain Backspace / Delete (no selection) at every caret position
// ---------------------------------------------------------------------------

describe('caret matrix — Backspace at every position (no selection)', () => {
  for (const cfg of MASKS) {
    it(cfg.name, () => {
      const failures: string[] = []
      let total = 0

      for (let pos = 1; pos <= cfg.full.length; pos++) {
        total++
        const input = makeInput(cfg.mask, cfg.full, cfg.options)
        const raw = cfg.full.slice(0, pos - 1) + cfg.full.slice(pos)
        input.value = raw
        input.setSelectionRange(pos - 1, pos - 1)
        dispatchInput(input, { inputType: 'deleteContentBackward' })

        const m = buildMask(raw, cfg.mask, pos - 1, cfg.options)
        const expectedValue = m.process()
        // `setSelectionRange` clamps to the (possibly shorter, reflowed) value length.
        const expectedCaret = Math.min(pos - 1, expectedValue.length)

        if (input.value !== expectedValue || input.selectionStart !== expectedCaret) {
          failures.push(
            `pos=${pos}: got value=${JSON.stringify(input.value)} caret=${input.selectionStart}, want value=${JSON.stringify(expectedValue)} caret=${expectedCaret}`,
          )
        }
      }

      assertNoFailures(failures, total)
    })
  }
})

describe('caret matrix — Delete-forward at every position (no selection)', () => {
  for (const cfg of MASKS) {
    it(cfg.name, () => {
      const failures: string[] = []
      let total = 0

      for (let pos = 0; pos < cfg.full.length; pos++) {
        total++
        const input = makeInput(cfg.mask, cfg.full, cfg.options)
        const raw = cfg.full.slice(0, pos) + cfg.full.slice(pos + 1)
        input.value = raw
        input.setSelectionRange(pos, pos)
        dispatchInput(input, { inputType: 'deleteContentForward' })

        const m = buildMask(raw, cfg.mask, pos, cfg.options)
        const expectedValue = m.process()
        const rawCaret = cfg.full.length === expectedValue.length ? pos + 1 : pos
        // `setSelectionRange` clamps to the (possibly shorter, reflowed) value length.
        const expectedCaret = Math.min(rawCaret, expectedValue.length)

        if (input.value !== expectedValue || input.selectionStart !== expectedCaret) {
          failures.push(
            `pos=${pos}: got value=${JSON.stringify(input.value)} caret=${input.selectionStart}, want value=${JSON.stringify(expectedValue)} caret=${expectedCaret}`,
          )
        }
      }

      assertNoFailures(failures, total)
    })
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
    it(cfg.name, async () => {
      const input = document.createElement('input')
      document.body.appendChild(input)
      createdInputs.push(input)
      bind(input, cfg.mask, cfg.options ?? null)

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

      const m = buildMask(raw, cfg.mask, raw.length, cfg.options)
      expect(input.value).toBe(m.process())
      expect(input.selectionStart).toBe(m.caret)
    })
  }
})

describe('caret matrix — legacy keydown fallback, deliberate typing (flush every keystroke), every position', () => {
  // Full position sweep on two representative configs (one flat/segmented
  // digit mask, one alphanumeric segmented mask) — running every mask here
  // too would multiply the already-awaited-per-keystroke cost six-fold for
  // marginal extra coverage over the sync `input`-driven matrices above.
  const sampled = MASKS.filter((c) => c.name.startsWith('CPF') || c.name.startsWith('mercosul'))

  for (const cfg of sampled) {
    it(cfg.name, async () => {
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
          bind(input, cfg.mask, cfg.options ?? null)
          input.value = base
          input.setSelectionRange(pos, pos)

          const raw = base.slice(0, pos) + ch + base.slice(pos)
          input.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }))
          input.value = raw
          input.setSelectionRange(pos + 1, pos + 1)
          await flushRafs()

          const m = buildMask(raw, cfg.mask, pos + 1, cfg.options)
          const expectedValue = m.process()
          const expectedCaret = m.caret

          if (input.value !== expectedValue || input.selectionStart !== expectedCaret) {
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
})
