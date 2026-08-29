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

    /**
     * The literal text a mask renders before its first slot, and the literal
     * that closes that first field — `["(", ") "]` for `(999) 999-9999`.
     * Parsed straight from the pattern so the oracle stays independent of the
     * masking implementation it is checking.
     */
    function frameLiterals(pattern: string | string[], tokenKeys: string[] = []): [string, string] {
      const text = Array.isArray(pattern) ? pattern[0] : pattern
      const slotKeys = new Set(['9', 'Z', 'A', ...tokenKeys])
      const groups: { slots: boolean; text: string }[] = []
      const points = Array.from(text)
      for (let i = 0; i < points.length; i++) {
        let ch = points[i]
        let slots = slotKeys.has(ch)
        if (ch === '\\' && i + 1 < points.length) {
          ch = points[++i]
          slots = false
        }
        const last = groups[groups.length - 1]
        if (last && last.slots === slots) last.text += ch
        else groups.push({ slots, text: ch })
      }
      if (!groups.length || groups[0].slots) return ['', '']
      return [groups[0].text, groups[2] && !groups[2].slots ? groups[2].text : '']
    }

    /**
     * Caret for a deletion that started at position 0 and took the mask's
     * opening literal with it. The render puts that frame back around the
     * now-empty first field, so the caret belongs inside the field rather than
     * outside the mask — deleting "(555)" out of "(555) 123-4567" lands at
     * "(|) 123-4567". Returns `-1` when no frame was restored.
     */
    function restoredFrameCaret(
      pattern: string | string[],
      fullValue: string,
      start: number,
      raw: string,
      value: string,
      tokenKeys: string[] = [],
    ): number {
      if (start !== 0 || value === fullValue) return -1
      const [lead, divider] = frameLiterals(pattern, tokenKeys)
      if (!lead || raw.startsWith(lead) || !value.startsWith(lead + divider)) return -1
      return lead.length
    }

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
          const suffix = full.slice(end)
          const backwardLimit = !expectedValue.startsWith(full.slice(0, start)) && expectedValue.endsWith(suffix)
            ? expectedValue.length - suffix.length : start
          const framed = restoredFrameCaret(mask, full, start, raw, expectedValue)
          const rawCaret = mode === 'backspace' ? (framed >= 0 ? framed : Math.min(start, backwardLimit))
            : full.length === expectedValue.length ? start + 1 : framed >= 0 ? framed : start
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
      const suffix = full.slice(pos)
      const backwardLimit = !expectedValue.startsWith(full.slice(0, pos - 1)) && expectedValue.endsWith(suffix)
        ? expectedValue.length - suffix.length : pos - 1
      const expectedCaret = Math.min(pos - 1, backwardLimit, expectedValue.length)
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

async function phoneField(page: Page, eager: boolean, digits = '1112223333') {
  await page.goto('/')
  await page.evaluate(eager => {
    const input = document.createElement('input')
    input.id = 'empty-segment-phone'
    document.body.appendChild(input)
    window.motherMask.bind(input, '(999) 999-9999', { eager })
    input.focus()
  }, eager)
  const field = page.locator('#empty-segment-phone')
  await page.keyboard.type(digits)
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
    test('area code deleted with its closing paren via ' + key + ' keeps the frame (eager=' + eager + ')', async ({ page }) => {
      // The reported case: select "(111)" — the space after it stays out of
      // the selection — and delete. The surviving " " is the tail of ") ",
      // which has to hold "222" in its own segment while the mask restores
      // the frame around the emptied area code.
      const field = await phoneField(page, eager)
      await field.evaluate((input: HTMLInputElement) => input.setSelectionRange(0, 5))
      await page.keyboard.press(key)
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual(['() 222-3333', 1, 1])
      // Retyping an area code refills exactly the field that was emptied.
      await page.keyboard.type('999')
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual(['(999) 222-3333', 4, 4])
    })
  }

  for (const key of ['Backspace', 'Delete', 'ControlOrMeta+x']) {
    test('selecting the area code and its divider, then ' + key + ' (eager=' + eager + ')', async ({ page }) => {
      // Nothing positional survives here, and an empty first field leaves the
      // caret with nothing to sit behind, so the digits pack from the left.
      // Pinned as the boundary of the rule: typing over this same selection
      // does hold the tail in place (see the test below), deleting it cannot.
      const field = await phoneField(page, eager)
      await field.evaluate((input: HTMLInputElement) => input.setSelectionRange(0, 6))
      await page.keyboard.press(key)
      const after = await field.evaluate((input: HTMLInputElement) => input.value)
      expect(after.replace(/\D/g, ''), 'no digit is lost').toBe('2223333')
      expect(after.startsWith('(22'), after).toBe(true)
    })
  }

  test('multi-character dividers of other shapes behave the same (eager=' + eager + ')', async ({ page }) => {
    await page.goto('/')
    const shapes = [
      { mask: '99 - 99', full: '12 - 34', select: 5, expected: '9 - 34' },
      { mask: '99--99', full: '12--34', select: 4, expected: '9--34' },
      { mask: '(999) 999-9999', full: '(555) 123-4567', select: 6, expected: '(9) 123-4567' },
    ]
    for (const [index, shape] of shapes.entries()) {
      const id = `shape-${index}`
      await page.evaluate(({ id, mask, full, eager }) => {
        const input = document.createElement('input')
        input.id = id
        input.value = full
        document.body.appendChild(input)
        window.motherMask.bind(input, mask, { eager })
        input.focus()
      }, { id, mask: shape.mask, full: shape.full, eager })
      const field = page.locator('#' + id)
      await field.evaluate((input: HTMLInputElement, end) => input.setSelectionRange(0, end), shape.select)
      await page.keyboard.type('9')
      expect(await field.evaluate((input: HTMLInputElement) => input.value), shape.mask).toBe(shape.expected)
    }
  })

  test('typing over the selected area code keeps the frame (eager=' + eager + ')', async ({ page }) => {
    const field = await phoneField(page, eager)
    await field.evaluate((input: HTMLInputElement) => input.setSelectionRange(0, 5))
    await page.keyboard.type('9')
    expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
      .toEqual(['(9) 222-3333', 2, 2])
    await page.keyboard.type('87')
    expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
      .toEqual(['(987) 222-3333', 4, 4])
  })

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

  test('backward caret stays before the tail through repeated native Backspaces (eager=' + eager + ')', async ({ page }) => {
    const field = await phoneField(page, eager, '1112224444')
    await field.evaluate((input: HTMLInputElement) => input.setSelectionRange(9, 9))
    const steps: [string, number][] = [
      ['(111) 22-4444', 8], ['(111) 2-4444', 7], ['(111) -4444', 6],
      ['(111-4444', 4], ['(11-4444', 3], ['(1-4444', 2], ['(-4444', 1], ['-4444', 0],
    ]
    for (const [value, caret] of steps) {
      await page.keyboard.press('Backspace')
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual([value, caret, caret])
    }
    await page.keyboard.press('Backspace')
    expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
      .toEqual(['-4444', 0, 0])
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type('5556667777')
    expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
      .toEqual(['(555) 666-7777', 14, 14])
  })

  test('backward caret maps native selections within a collapsed divider (eager=' + eager + ')', async ({ page }) => {
    const field = await phoneField(page, eager)
    for (const range of [[4, 5], [5, 6], [4, 6]]) {
      await field.fill('(111) -4444')
      await field.evaluate((input: HTMLInputElement, range) => input.setSelectionRange(range[0], range[1], 'backward'), range)
      await page.keyboard.press('Backspace')
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual(['(111-4444', 4, 4])
      await page.keyboard.press('Backspace')
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual(['(11-4444', 3, 3])
    }
  })

  test('backward caret preserves native steps inside retained dividers and forward Delete (eager=' + eager + ')', async ({ page }) => {
    const field = await phoneField(page, eager, '1112224444')
    for (const pos of [6, 5]) {
      await field.evaluate((input: HTMLInputElement, pos) => input.setSelectionRange(pos, pos), pos)
      await page.keyboard.press('Backspace')
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual(['(111) 222-4444', pos - 1, pos - 1])
      await page.keyboard.press('Delete')
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual(['(111) 222-4444', pos, pos])
    }
  })

  test('backward caret stays before overlapping dividers at every boundary (eager=' + eager + ')', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(eager => {
      const input = document.createElement('input')
      input.id = 'backward-overlap'
      document.body.appendChild(input)
      window.motherMask.bind(input, '99 :: 99:99', { eager })
    }, eager)
    const field = page.locator('#backward-overlap')
    for (const pos of [3, 4, 5, 6]) {
      await field.fill('11 :: :44')
      await field.evaluate((input: HTMLInputElement, pos) => input.setSelectionRange(pos, pos), pos)
      await page.keyboard.press('Backspace')
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual(['11:44', 2, 2])
      await page.keyboard.press('Backspace')
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual(['1:44', 1, 1])
    }
  })

  test('backward caret maps Unicode source offsets around long dividers (eager=' + eager + ')', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(eager => {
      const input = document.createElement('input')
      input.id = 'backward-unicode'
      input.value = '𐐀λ :: --Жé'
      document.body.appendChild(input)
      window.motherMask.bind(input, 'LL :: LL--LL', { eager, tokens: { L: /\p{L}/u } })
      input.focus()
      input.setSelectionRange(7, 7)
    }, eager)
    const field = page.locator('#backward-unicode')
    for (const [value, caret] of [['𐐀λ--Жé', 3], ['𐐀--Жé', 2], ['--Жé', 0]] as const) {
      await page.keyboard.press('Backspace')
      expect(await field.evaluate((input: HTMLInputElement) => [input.value, input.selectionStart, input.selectionEnd]))
        .toEqual([value, caret, caret])
    }
  })
}
