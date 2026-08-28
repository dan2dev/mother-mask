import { expect, test, type Page } from '@playwright/test'

async function fresh(page: Page, kind: 'upper' | 'card' | 'same' | 'unicode' | 'hex' | 'escaped', eager = true, segmented = true) {
  await page.evaluate(({ kind, eager, segmented }) => {
    const input = document.createElement('input')
    input.id = 'advanced'
    document.body.append(input)
    const options = { eager, segmented }
    if (kind === 'upper') window.motherMask.bind(input, 'UUU-999', { ...options, tokens: { U: { match: /[a-z]/gi, transform: c => c.toUpperCase() } } })
    if (kind === 'hex') window.motherMask.bind(input, 'HH:HH:HH:HH:HH:HH', { ...options, tokens: { H: /[0-9a-f]/iy } })
    if (kind === 'escaped') window.motherMask.bind(input, '\\A-999999', options)
    if (kind === 'unicode') window.motherMask.bind(input, 'L-L', { ...options, tokens: { L: /\p{L}/u } })
    if (kind === 'card') window.motherMask.bind(input, '9999 9999 9999 9999', { ...options, resolveMask: value => value.startsWith('34') || value.startsWith('37') ? '9999 999999 99999' : value.startsWith('62') ? '9999 9999 9999 9999 999' : '9999 9999 9999 9999' })
    if (kind === 'same') window.motherMask.bind(input, '9999', { ...options, resolveMask: value => value.startsWith('1') ? '9-999' : '99-99' })
    input.focus()
  }, { kind, eager, segmented })
}
async function state(page: Page, value: string, start: number, end = start) {
  expect(await page.locator('#advanced').evaluate((input: HTMLInputElement) => ({ value: input.value, start: input.selectionStart, end: input.selectionEnd }))).toEqual({ value, start, end })
}
async function select(page: Page, start: number, end = start) {
  await page.locator('#advanced').evaluate((input: HTMLInputElement, range) => input.setSelectionRange(range.start, range.end), { start, end })
}

for (const segmented of [true, false]) {
  for (const eager of [true, false]) {
    test(`native transformed typing and selection replacement (segmented=${segmented}, eager=${eager})`, async ({ page }) => {
      await page.goto('/')
      await fresh(page, 'upper', eager, segmented)
      const values = ['A', 'AB', eager ? 'ABC-' : 'ABC', 'ABC-1', 'ABC-12', 'ABC-123']
      for (const [i, c] of [...'abc123'].entries()) { await page.keyboard.type(c); await state(page, values[i], values[i].length) }
      await select(page, 1, 2)
      await page.keyboard.type('x')
      await state(page, 'AXC-123', 2)
      await select(page, 3)
      await page.keyboard.press('Backspace')
      await state(page, segmented ? 'AX-123' : 'AX', 2)
      await page.keyboard.press('ControlOrMeta+a')
      await page.keyboard.type('def456')
      await state(page, 'DEF-456', 7)
      await select(page, 0, 4)
      await page.keyboard.insertText('ghi')
      await state(page, 'GHI-456', 3)
    })

    test(`native resolver switching, separators, and growing capacity (segmented=${segmented}, eager=${eager})`, async ({ page }) => {
      await page.goto('/')
      await fresh(page, 'card', eager, segmented)
      await page.keyboard.type('341234567890123')
      await state(page, '3412 345678 90123', 17)
      await select(page, 0, 2)
      await page.keyboard.insertText('51')
      await state(page, '5112 3456 7890 123', 2)
      await select(page, 7)
      await page.keyboard.type('9')
      await state(page, '5112 3495 6789 0123', 8)
      await select(page, 5)
      await page.keyboard.type('#')
      await state(page, '5112 3495 6789 0123', 5)
      await page.keyboard.press('Backspace')
      await state(page, '5112 3495 6789 0123', 4)
      await page.keyboard.press('Delete')
      await state(page, '5112 3495 6789 0123', 5)
      await page.keyboard.press('ControlOrMeta+a')
      await page.keyboard.insertText('6212345678901234567')
      await state(page, '6212 3456 7890 1234 567', 23)
    })

    test(`same-capacity changes on partial values and backwards edits (segmented=${segmented}, eager=${eager})`, async ({ page }) => {
      await page.goto('/')
      await fresh(page, 'same', eager, segmented)
      await page.keyboard.type('12')
      await state(page, '1-2', 3)
      await select(page, 0, 1)
      await page.keyboard.type('2')
      await state(page, eager ? '22-' : '22', 1)
      await page.keyboard.press('Delete')
      await state(page, '2', 1)
      await select(page, 0)
      await page.keyboard.type('1')
      await state(page, '1-2', 1)
    })
  }
}

for (const [kind, raw, expected] of [
  ['hex', 'ga1b2c3d4e5f6', 'a1:b2:c3:d4:e5:f6'],
  ['escaped', '123456', 'A-123456'],
  ['unicode', '𐐀Ж', '𐐀-Ж'],
] as const) {
  test(`native ${kind} typing and invalid paste`, async ({ page }) => {
    await page.goto('/')
    await fresh(page, kind)
    for (const char of raw) await page.keyboard.insertText(char)
    await state(page, expected, expected.length)
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.insertText('#!?')
    await state(page, kind === 'escaped' ? 'A-' : '', kind === 'escaped' ? 2 : 0)
  })
}

test('navigation and untouched selections survive shortcuts and premature frames', async ({ page }) => {
  await page.goto('/')
  await fresh(page, 'upper')
  await page.keyboard.type('abc123')
  await page.keyboard.press('ControlOrMeta+a')
  await state(page, 'ABC-123', 0, 7)
  await page.keyboard.press('ArrowRight')
  await state(page, 'ABC-123', 7)
  await page.keyboard.press('Shift+ArrowLeft')
  await state(page, 'ABC-123', 6, 7)
  await select(page, 1, 5)
  await page.evaluate(async () => {
    const input = document.querySelector<HTMLInputElement>('#advanced')!
    for (const key of ['Home', 'End', 'Tab', 'ArrowLeft', 'ArrowRight']) input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }))
    for (const key of ['a', 'c', 'v', 'x']) input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key, ctrlKey: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'z' }))
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  })
  await state(page, 'ABC-123', 1, 5)
})

// In-page sweeps cover native DOM selections/events without thousands of CDP round trips.
for (const segmented of [true, false]) {
  for (const eager of [true, false]) {
    test(`advanced caret matrix including supplementary characters (segmented=${segmented}, eager=${eager})`, async ({ page }) => {
      await page.goto('/')
      const result = await page.evaluate(({ segmented, eager }) => {
        const { bind, buildMask } = window.motherMask
        const tokens = { H: /[0-9a-f]/gi, U: { match: /[a-z]/i, transform: (c: string) => c.toUpperCase() }, L: /\p{L}/u }
        const cases = [
          { mask: 'HH:HH-HH', full: 'a1:b2-c3', chars: ['f', '#', '10'] },
          { mask: 'UUU-999', full: 'ABC-123', chars: ['x', '#', 'yz12'] },
          { mask: '\\A-99.99', full: 'A-12.34', chars: ['1', '#', '12A'] },
          { mask: 'LL-LL', full: '𐐀λ-Жé', chars: ['𐐀', '#', 'Жλ'] },
          { mask: ['HH-HH', 'HH-HH-HH'], full: 'ab-cd-ef', chars: ['f', '#', '10'] },
        ]
        const failures: string[] = []
        let total = 0
        for (const cfg of cases) {
          const options = { tokens, segmented, eager }
          const positions = [0]
          for (const c of cfg.full) positions.push(positions[positions.length - 1] + c.length)
          for (const start of positions) for (const end of positions.filter(end => end >= start)) {
            for (const kind of ['insertText', 'insertFromPaste', 'deleteContentBackward', 'deleteContentForward']) {
              for (const char of kind.startsWith('delete') ? [''] : cfg.chars) {
                const input = document.createElement('input')
                input.value = cfg.full
                document.body.append(input)
                const dispose = bind(input, cfg.mask, options)
                const raw = cfg.full.slice(0, start) + char + cfg.full.slice(end)
                const pos = start + char.length
                input.value = raw
                input.setSelectionRange(pos, pos)
                input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: kind, data: char }))
                const m = buildMask(raw, cfg.mask, pos, { ...options, eager: kind.startsWith('delete') ? false : eager })
                const value = m.process()
                let caret = kind === 'deleteContentBackward' ? pos : kind === 'deleteContentForward' ? (value.length === cfg.full.length ? pos + 1 : pos) : m.caret
                caret = Math.min(caret, value.length)
                if (caret > 0 && /[\uDC00-\uDFFF]/.test(value[caret] ?? '') && /[\uD800-\uDBFF]/.test(value[caret - 1])) caret--
                total++
                if (input.value !== value || input.selectionStart !== caret || input.selectionEnd !== caret) failures.push(`${cfg.mask} ${kind} [${start},${end}] ${char}: ${input.value}@${input.selectionStart},${input.selectionEnd} != ${value}@${caret}`)
                dispose(); input.remove()
              }
            }
          }
        }
        return { total, failures }
      }, { segmented, eager })
      expect(result.total).toBeGreaterThan(1000)
      expect(result.failures).toEqual([])
    })
  }
}
