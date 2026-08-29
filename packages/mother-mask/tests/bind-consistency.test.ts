import { describe, it, expect } from 'vitest'
import { bind, buildMask } from '../src/index'
import type { ApplyMaskOptions, MaskPattern } from '../src/index'

// ---------------------------------------------------------------------------
// bind() must land on exactly what the pure masking functions say, for every
// edit position on every mask — insert, select-and-replace, and both flavors
// of delete. This is the invariant that keeps the DOM layer and the pure
// layer from drifting apart as either one changes.
//
// Mirrors e2e/tests/caret-matrix.spec.ts, which runs the same sweep in a real
// Chromium. That suite needs a browser download and is not wired into CI, so
// the sweep also lives here where `make test` actually runs it. jsdom cannot
// reproduce real browser event timing, but this matrix drives the synchronous
// `input`-event path directly, which it models faithfully.
// ---------------------------------------------------------------------------

interface MaskConfig {
  name: string
  mask: MaskPattern
  full: string
  options?: ApplyMaskOptions
  /** One matching character, one of the wrong class, one that matches nothing. */
  chars: string[]
}

const MASKS: MaskConfig[] = [
  { name: 'CPF', mask: '999.999.999-99', full: '123.456.789-01', chars: ['1', 'a', '#'] },
  {
    name: 'phone array',
    mask: ['(99) 9999-9999', '(99) 99999-9999'],
    full: '(11) 99988-7766',
    chars: ['1', 'a', '#'],
  },
  { name: 'date', mask: '99/99/9999', full: '25/12/2025', chars: ['1', 'a', '#'] },
  {
    name: 'plate flat',
    mask: 'ZZZ-9999',
    full: 'ABC-1234',
    options: { segmented: false },
    chars: ['a', '1', '#'],
  },
  { name: 'mercosul plate', mask: 'ZZZ-9Z99', full: 'ABC-1D23', chars: ['a', '1', '#'] },
  { name: 'CNPJ alnum', mask: 'AA.AAA.AAA/AAAA-99', full: '1A.B2C.3D4/5E6F-78', chars: ['1', 'a', '#'] },
  { name: 'custom hex', mask: 'HH:HH:HH', full: 'a1:b2:c3', options: { tokens: { H: /[0-9a-f]/i } }, chars: ['a', '1', 'g'] },
  { name: 'transformed identifier', mask: 'UUU-999', full: 'ABC-123', options: { tokens: { U: { match: /[a-z]/i, transform: c => c.toUpperCase() } } }, chars: ['x', '1', '#'] },
  { name: 'transformed flat identifier', mask: 'UUU-999', full: 'ABC-123', options: { segmented: false, tokens: { U: { match: /[a-z]/i, transform: c => c.toUpperCase() } } }, chars: ['x', '1', '#'] },
  { name: 'escaped prefix', mask: '\\A-99.99', full: 'A-12.34', chars: ['1', 'A', '#'] },
  { name: 'Unicode letters', mask: 'LLL-LLL', full: 'ЖλÁ-üøÇ', options: { tokens: { L: /\p{L}/u } }, chars: ['ñ', '1', '#'] },
  { name: 'custom array', mask: ['HH-HH', 'HH-HH-HH'], full: 'ab-cd-ef', options: { tokens: { H: /[0-9a-f]/i } }, chars: ['a', '1', 'g'] },

]

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

/** Fire the post-mutation `input` event the browser would, with a real `inputType`. */
function dispatchInput(input: HTMLInputElement, data: string | null, inputType: string): void {
  const event = new Event('input', { bubbles: true, cancelable: false })
  Object.defineProperty(event, 'data', { value: data, configurable: true })
  Object.defineProperty(event, 'inputType', { value: inputType, configurable: true })
  Object.defineProperty(event, 'isComposing', { value: false, configurable: true })
  input.dispatchEvent(event)
}

describe('bind() agrees with buildMask() at every edit position', () => {
  for (const cfg of MASKS) {
    it(cfg.name, () => {
      const { mask, full, options, chars } = cfg
      const failures: string[] = []
      let total = 0

      const freshInput = (initialValue: string): HTMLInputElement => {
        const input = document.createElement('input')
        input.value = initialValue
        document.body.appendChild(input)
        bind(input, mask, options ?? null)
        return input
      }

      const check = (label: string, input: HTMLInputElement, value: string, caret: number): void => {
        if (input.value !== value || input.selectionStart !== caret || input.selectionEnd !== caret) {
          failures.push(
            `${label}: got ${JSON.stringify(input.value)}@${input.selectionStart} want ${JSON.stringify(value)}@${caret}`,
          )
        }
        input.remove()
      }

      // `bind()` suppresses eager for delete-type edits so a separator the
      // user just removed is not immediately re-added; the expectation has to
      // be computed the same way.
      const deleteOptions: ApplyMaskOptions = { ...options, eager: false }

      // Insert at every position.
      for (let pos = 0; pos <= full.length; pos++) {
        for (const ch of chars) {
          total++
          const input = freshInput(full)
          const raw = full.slice(0, pos) + ch + full.slice(pos)
          input.value = raw
          input.setSelectionRange(pos + 1, pos + 1)
          dispatchInput(input, ch, 'insertText')

          const m = buildMask(raw, mask, pos + 1, options)
          check(`insert pos=${pos} ch=${ch}`, input, m.process(), m.caret)
        }
      }

      // Select [start,end) and type over it.
      for (let start = 0; start <= full.length; start++) {
        for (let end = start + 1; end <= full.length; end++) {
          const ch = chars[(start + end) % chars.length]
          total++
          const input = freshInput(full)
          const raw = full.slice(0, start) + ch + full.slice(end)
          input.value = raw
          input.setSelectionRange(start + 1, start + 1)
          dispatchInput(input, ch, 'insertText')

          const m = buildMask(raw, mask, start + 1, options)
          check(`replace [${start},${end}) ch=${ch}`, input, m.process(), m.caret)
        }
      }

      // Select [start,end) and delete it.
      for (let start = 0; start <= full.length; start++) {
        for (let end = start + 1; end <= full.length; end++) {
          for (const mode of ['backspace', 'delete'] as const) {
            total++
            const input = freshInput(full)
            const raw = full.slice(0, start) + full.slice(end)
            input.value = raw
            input.setSelectionRange(start, start)
            dispatchInput(
              input,
              null,
              mode === 'backspace' ? 'deleteContentBackward' : 'deleteContentForward',
            )

            const m = buildMask(raw, mask, start, deleteOptions)
            const value = m.process()
            const suffix = full.slice(end)
            const backwardLimit = !value.startsWith(full.slice(0, start)) && value.endsWith(suffix)
              ? value.length - suffix.length : start
            const framed = restoredFrameCaret(cfg, start, raw, value)
            const rawCaret =
              mode === 'backspace' ? (framed >= 0 ? framed : Math.min(start, backwardLimit))
                : full.length === value.length ? start + 1 : framed >= 0 ? framed : start
            check(`${mode} [${start},${end})`, input, value, Math.min(rawCaret, value.length))
          }
        }
      }

      // Plain Backspace at every position.
      for (let pos = 1; pos <= full.length; pos++) {
        total++
        const input = freshInput(full)
        const raw = full.slice(0, pos - 1) + full.slice(pos)
        input.value = raw
        input.setSelectionRange(pos - 1, pos - 1)
        dispatchInput(input, null, 'deleteContentBackward')

        const m = buildMask(raw, mask, pos - 1, deleteOptions)
        const value = m.process()
        const suffix = full.slice(pos)
        const backwardLimit = !value.startsWith(full.slice(0, pos - 1)) && value.endsWith(suffix)
          ? value.length - suffix.length : pos - 1
        check(`backspace pos=${pos}`, input, value, Math.min(pos - 1, backwardLimit, value.length))
      }

      // Plain Delete at every position.
      for (let pos = 0; pos < full.length; pos++) {
        total++
        const input = freshInput(full)
        const raw = full.slice(0, pos) + full.slice(pos + 1)
        input.value = raw
        input.setSelectionRange(pos, pos)
        dispatchInput(input, null, 'deleteContentForward')

        const m = buildMask(raw, mask, pos, deleteOptions)
        const value = m.process()
        const rawCaret = full.length === value.length ? pos + 1 : pos
        check(`delete pos=${pos}`, input, value, Math.min(rawCaret, value.length))
      }

      expect({ cases: total > 100, failures }).toEqual({ cases: true, failures: [] })
    })
  }
})
