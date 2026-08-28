import { test, expect, type Page } from '@playwright/test'

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

          // bind() suppresses eager for delete-type edits, so a separator
          // the user just removed is not immediately re-added — the pure
          // expectation has to be computed the same way.
          const m = window.motherMask.buildMask(raw, mask, start, { ...options, eager: false })
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
      // See the note on the selection-delete branch above.
      const m = window.motherMask.buildMask(raw, mask, pos - 1, { ...options, eager: false })
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
      // See the note on the selection-delete branch above.
      const m = window.motherMask.buildMask(raw, mask, pos, { ...options, eager: false })
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

async function phoneField(page: Page, eager: boolean) {
  await page.goto('/')
  await page.evaluate(eager => {
    const input = document.createElement('input')
    input.id = 'empty-segment-phone'
    document.body.appendChild(input)
    window.motherMask.bind(input, '(999) 999-9999', { eager })
    input.focus()
  }, eager)
  const field = page.locator('#empty-segment-phone')
  await page.keyboard.type('1112223333')
  return field
}

for (const eager of [true, false]) {
  for (const key of ['Backspace', 'Delete']) {
    test('empty phone segment: native ' + key + ' preserves dividers (eager=' + eager + ')', async ({ page }) => {
      const field = await phoneField(page, eager)
      const backward = key === 'Backspace'
      await field.evaluate((input: HTMLInputElement, pos) => input.setSelectionRange(pos, pos), backward ? 9 : 6)
      for (const middle of ['22', '2', '']) {
        await page.keyboard.press(key)
        const caret = 6 + (backward ? middle.length : 0)
        expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
          .toEqual(['(111) ' + middle + '-3333', caret, caret])
      }
      // In particular, the next input must still go into the emptied segment.
      await page.keyboard.type('456')
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual(['(111) 456-3333', 9, 9])
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual(['(111) 456-3333', 9, 9])
    })
  }

  for (const key of ['Backspace', 'Delete', 'ControlOrMeta+x']) {
    test('empty phone segment: native selection ' + key + ' and replacement (eager=' + eager + ')', async ({ page }) => {
      const field = await phoneField(page, eager)
      await field.evaluate((input: HTMLInputElement) => input.setSelectionRange(6, 9))
      await page.keyboard.press(key)
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual(['(111) -3333', 6, 6])
      await page.keyboard.insertText('#!?')
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual(['(111) -3333', 6, 6])
      await page.keyboard.insertText('45')
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual(['(111) 45-3333', 8, 8])
    })
  }

  test('empty phone segment: insertion at every left-divider boundary (eager=' + eager + ')', async ({ page }) => {
    const field = await phoneField(page, eager)
    for (const pos of [4, 5, 6]) {
      await field.fill('(111) -3333')
      await field.evaluate((input: HTMLInputElement, pos) => input.setSelectionRange(pos, pos), pos)
      await page.keyboard.type('4')
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual(['(111) 4-3333', 7, 7])
    }
  })

  test('empty phone segment: leading gaps, trailing deletion and select-all clearing (eager=' + eager + ')', async ({ page }) => {
    const field = await phoneField(page, eager)
    await field.evaluate((input: HTMLInputElement) => input.setSelectionRange(1, 4))
    await page.keyboard.press('Backspace')
    expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
      .toEqual(['() 222-3333', 1, 1])
    await field.evaluate((input: HTMLInputElement) => input.setSelectionRange(3, 6))
    await page.keyboard.press('Delete')
    expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
      .toEqual(['() -3333', 3, 3])
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('Backspace')
    expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
      .toEqual(['', 0, 0])
    await page.keyboard.type('1112223333')
    await field.evaluate((input: HTMLInputElement) => input.setSelectionRange(10, 14))
    await page.keyboard.press('Delete')
    expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
      .toEqual(['(111) 222', 9, 9])
  })
}
