import { test, expect } from '@playwright/test'

/**
 * Exhaustive, real-browser combinatorial coverage: every caret position,
 * every caret selection, every edit kind (insert / replace-selection /
 * backspace / delete-forward), across every mask shape the library
 * supports. This mirrors `tests/caret-matrix.test.ts` in the library
 * package (which runs the same matrix against jsdom) but executes inside an
 * actual Chromium — so it also exercises real `setSelectionRange` clamping,
 * real `input`/`InputEvent` semantics, and the real event loop instead of a
 * DOM polyfill. Everything runs via a single `page.evaluate` per mask/
 * category so there's no per-case CDP round trip, which is what makes
 * thousands of cases per test practical.
 */

interface MaskConfig {
  name: string
  mask: string | string[]
  full: string
  options?: { segmented?: boolean }
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
  { name: 'plate flat', mask: 'ZZZ-9999', full: 'ABC-1234', options: { segmented: false }, chars: ['a', '1', '#'] },
  { name: 'mercosul plate', mask: 'ZZZ-9Z99', full: 'ABC-1D23', chars: ['a', '1', '#'] },
  { name: 'CNPJ alnum', mask: 'AA.AAA.AAA/AAAA-99', full: '1A.B2C.3D4/5E6F-78', chars: ['1', 'a', '#'] },
]

/** Runs the full insert-at-every-position × selection-replace × delete matrix in-page. */
async function runMatrix(
  page: import('@playwright/test').Page,
  cfg: MaskConfig,
): Promise<{ failures: string[]; total: number }> {
  return page.evaluate((cfg) => {
    const failures: string[] = []
    let total = 0
    const { mask, full, options, chars } = cfg

    function dispatchInput(input: HTMLInputElement, data: string | null, inputType: string): void {
      const event = new Event('input', { bubbles: true, cancelable: false })
      Object.defineProperty(event, 'data', { value: data, configurable: true })
      Object.defineProperty(event, 'inputType', { value: inputType, configurable: true })
      Object.defineProperty(event, 'isComposing', { value: false, configurable: true })
      input.dispatchEvent(event)
    }

    function freshInput(initialValue: string): HTMLInputElement {
      const input = document.createElement('input')
      input.value = initialValue
      document.body.appendChild(input)
      window.motherMask.bind(input, mask, options ?? null)
      return input
    }

    // Insert at every position.
    for (let pos = 0; pos <= full.length; pos++) {
      for (const ch of chars) {
        total++
        const input = freshInput(full)
        const raw = full.slice(0, pos) + ch + full.slice(pos)
        input.value = raw
        input.setSelectionRange(pos + 1, pos + 1)
        dispatchInput(input, ch, 'insertText')

        const m = window.motherMask.buildMask(raw, mask, pos + 1, options)
        const expectedValue = m.process()
        const expectedCaret = m.caret
        if (input.value !== expectedValue || input.selectionStart !== expectedCaret) {
          failures.push(
            `insert pos=${pos} ch=${ch}: got ${JSON.stringify(input.value)}@${input.selectionStart} want ${JSON.stringify(expectedValue)}@${expectedCaret}`,
          )
        }
        input.remove()
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

        const m = window.motherMask.buildMask(raw, mask, start + 1, options)
        const expectedValue = m.process()
        const expectedCaret = m.caret
        if (input.value !== expectedValue || input.selectionStart !== expectedCaret) {
          failures.push(
            `replace [${start},${end}) ch=${ch}: got ${JSON.stringify(input.value)}@${input.selectionStart} want ${JSON.stringify(expectedValue)}@${expectedCaret}`,
          )
        }
        input.remove()
      }
    }

    // Select [start,end) and delete it (Backspace or Delete).
    for (let start = 0; start <= full.length; start++) {
      for (let end = start + 1; end <= full.length; end++) {
        for (const mode of ['backspace', 'delete'] as const) {
          total++
          const input = freshInput(full)
          const raw = full.slice(0, start) + full.slice(end)
          input.value = raw
          input.setSelectionRange(start, start)
          dispatchInput(input, null, mode === 'backspace' ? 'deleteContentBackward' : 'deleteContentForward')

          const m = window.motherMask.buildMask(raw, mask, start, options)
          const expectedValue = m.process()
          const rawCaret = mode === 'backspace' ? start : full.length === expectedValue.length ? start + 1 : start
          const expectedCaret = Math.min(rawCaret, expectedValue.length)
          if (input.value !== expectedValue || input.selectionStart !== expectedCaret) {
            failures.push(
              `${mode} [${start},${end}): got ${JSON.stringify(input.value)}@${input.selectionStart} want ${JSON.stringify(expectedValue)}@${expectedCaret}`,
            )
          }
          input.remove()
        }
      }
    }

    // Plain Backspace / Delete at every position (no selection).
    for (let pos = 1; pos <= full.length; pos++) {
      total++
      const input = freshInput(full)
      const raw = full.slice(0, pos - 1) + full.slice(pos)
      input.value = raw
      input.setSelectionRange(pos - 1, pos - 1)
      dispatchInput(input, null, 'deleteContentBackward')
      const m = window.motherMask.buildMask(raw, mask, pos - 1, options)
      const expectedValue = m.process()
      const expectedCaret = Math.min(pos - 1, expectedValue.length)
      if (input.value !== expectedValue || input.selectionStart !== expectedCaret) {
        failures.push(
          `backspace pos=${pos}: got ${JSON.stringify(input.value)}@${input.selectionStart} want ${JSON.stringify(expectedValue)}@${expectedCaret}`,
        )
      }
      input.remove()
    }

    for (let pos = 0; pos < full.length; pos++) {
      total++
      const input = freshInput(full)
      const raw = full.slice(0, pos) + full.slice(pos + 1)
      input.value = raw
      input.setSelectionRange(pos, pos)
      dispatchInput(input, null, 'deleteContentForward')
      const m = window.motherMask.buildMask(raw, mask, pos, options)
      const expectedValue = m.process()
      const rawCaret = full.length === expectedValue.length ? pos + 1 : pos
      const expectedCaret = Math.min(rawCaret, expectedValue.length)
      if (input.value !== expectedValue || input.selectionStart !== expectedCaret) {
        failures.push(
          `delete pos=${pos}: got ${JSON.stringify(input.value)}@${input.selectionStart} want ${JSON.stringify(expectedValue)}@${expectedCaret}`,
        )
      }
      input.remove()
    }

    return { failures, total }
  }, cfg)
}

for (const cfg of MASKS) {
  test(`caret matrix (real browser) — ${cfg.name}: every position × every selection × insert/replace/delete`, async ({
    page,
  }) => {
    await page.goto('/')
    const { failures, total } = await runMatrix(page, cfg)
    expect(failures, `${failures.length}/${total} cases failed:\n${failures.slice(0, 20).join('\n')}`).toEqual([])
  })
}
