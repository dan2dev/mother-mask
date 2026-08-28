import { test, expect } from '@playwright/test'

/**
 * Regression coverage for the reported bug: typing with the normal Android
 * keyboard did nothing on letter-accepting masks (e.g. the Mercosul plate
 * example, `ZZZ-9Z99`) that don't set `inputmode`.
 *
 * Root cause: Android's on-screen keyboard wraps essentially all typing
 * into a full-QWERTY `<input>` in an IME composition session — for
 * autocorrect/suggestion-strip bookkeeping, not just genuine multi-candidate
 * input (Pinyin, Kana, …) — and only ends that session on a word boundary
 * (space/punctuation) or blur. `bind()` used to defer all formatting until
 * `compositionend`, so typing a space-less value like a plate number left
 * the field completely unmasked for the whole entry. These tests replay
 * that exact sequence — `compositionstart`, a run of composing `input`
 * events with `isComposing: true`, and only a very late (or no)
 * `compositionend` — and assert the mask is applied live, not deferred.
 */

test.describe('Android IME composition wrapping plain-text typing', () => {
  test('Mercosul plate mask formats live while a single un-ended composition session is active', async ({
    page,
  }) => {
    await page.goto('/')

    const snapshots = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('#plate')!
      const snaps: string[] = []

      input.dispatchEvent(new Event('compositionstart', { bubbles: true }))

      for (const ch of 'ABC1234') {
        const start = input.selectionStart ?? input.value.length
        const end = input.selectionEnd ?? start
        input.value = input.value.slice(0, start) + ch + input.value.slice(end)
        input.setSelectionRange(start + 1, start + 1)
        const event = new Event('input', { bubbles: true, cancelable: false })
        Object.defineProperty(event, 'data', { value: ch, configurable: true })
        Object.defineProperty(event, 'inputType', { value: 'insertCompositionText', configurable: true })
        Object.defineProperty(event, 'isComposing', { value: true, configurable: true })
        input.dispatchEvent(event)
        snaps.push(input.value)
      }

      // Deliberately no `compositionend` — this mirrors Android never
      // reaching a word boundary while the user is still typing.
      return snaps
    })

    // The dash must show up the moment the 4th character lands — live,
    // not only once composition eventually ends (which, on Android typing
    // a space-less plate number, may never happen while typing at all).
    // Eager reveal (on by default): the third letter completes the first
    // segment, so the dash appears with it rather than waiting for the digit.
    expect(snapshots[2]).toBe('ABC-')
    expect(snapshots[3]).toBe('ABC-1')
    expect(snapshots[6]).toBe('ABC-1234')

    await expect(page.locator('#plate')).toHaveValue('ABC-1234')
  })

  test('Mercosul alnum mask (ZZZ-9Z99) formats live mid-composition', async ({ page }) => {
    await page.goto('/')

    const snapshots = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('#mercosul')!
      const snaps: string[] = []
      input.dispatchEvent(new Event('compositionstart', { bubbles: true }))

      for (const ch of 'ABC1D23') {
        const start = input.selectionStart ?? input.value.length
        const end = input.selectionEnd ?? start
        input.value = input.value.slice(0, start) + ch + input.value.slice(end)
        input.setSelectionRange(start + 1, start + 1)
        const event = new Event('input', { bubbles: true, cancelable: false })
        Object.defineProperty(event, 'data', { value: ch, configurable: true })
        Object.defineProperty(event, 'inputType', { value: 'insertCompositionText', configurable: true })
        Object.defineProperty(event, 'isComposing', { value: true, configurable: true })
        input.dispatchEvent(event)
        snaps.push(input.value)
      }

      return snaps
    })

    // Eager reveal (on by default): the third letter completes the first
    // segment, so the dash appears with it rather than waiting for the digit.
    expect(snapshots[2]).toBe('ABC-')
    expect(snapshots[3]).toBe('ABC-1')
    expect(snapshots[6]).toBe('ABC-1D23')
    await expect(page.locator('#mercosul')).toHaveValue('ABC-1D23')
  })

  test('a late compositionend (word boundary reached eventually) does not double-format or move the caret', async ({
    page,
  }) => {
    await page.goto('/')
    const field = page.locator('#mercosul')

    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('#mercosul')!
      input.dispatchEvent(new Event('compositionstart', { bubbles: true }))
      for (const ch of 'ABC1D23') {
        const start = input.selectionStart ?? input.value.length
        input.value = input.value.slice(0, start) + ch + input.value.slice(start)
        input.setSelectionRange(start + 1, start + 1)
        const event = new Event('input', { bubbles: true, cancelable: false })
        Object.defineProperty(event, 'data', { value: ch, configurable: true })
        Object.defineProperty(event, 'inputType', { value: 'insertCompositionText', configurable: true })
        Object.defineProperty(event, 'isComposing', { value: true, configurable: true })
        input.dispatchEvent(event)
      }
      input.dispatchEvent(new Event('compositionend', { bubbles: true }))
    })

    await expect(field).toHaveValue('ABC-1D23')
    const caretAtEnd = await field.evaluate((el) => {
      const input = el as HTMLInputElement
      return input.selectionStart === input.value.length
    })
    expect(caretAtEnd).toBe(true)
  })

  test('CNPJ alnum mask formats live through a whole un-ended composition session', async ({ page }) => {
    await page.goto('/')

    const result = await page.evaluate(() => {
      const input = document.createElement('input')
      document.body.appendChild(input)
      window.motherMask.bind(input, 'AA.AAA.AAA/AAAA-99')
      input.dispatchEvent(new Event('compositionstart', { bubbles: true }))

      const snaps: string[] = []
      for (const ch of '1AB2C3D45E6F78') {
        const start = input.selectionStart ?? input.value.length
        input.value = input.value.slice(0, start) + ch + input.value.slice(start)
        input.setSelectionRange(start + 1, start + 1)
        const event = new Event('input', { bubbles: true, cancelable: false })
        Object.defineProperty(event, 'data', { value: ch, configurable: true })
        Object.defineProperty(event, 'inputType', { value: 'insertCompositionText', configurable: true })
        Object.defineProperty(event, 'isComposing', { value: true, configurable: true })
        input.dispatchEvent(event)
        snaps.push(input.value)
      }

      const final = input.value
      input.remove()
      return { snaps, final }
    })

    // Literal separators must already show up mid-session — not only once
    // composition (which never explicitly ends in this test) eventually
    // finishes. If formatting were still deferred, none of the snapshots
    // before the very last character would contain any "." or "-" at all.
    const firstFormattedIndex = result.snaps.findIndex((s) => /[./-]/.test(s))
    expect(firstFormattedIndex).toBeGreaterThan(-1)
    expect(firstFormattedIndex).toBeLessThan(result.snaps.length - 1)
    expect(result.final).toBe('1A.B2C.3D4/5E6F-78')
  })
})

for (const eager of [true, false]) {
  test(`custom Unicode token preserves actual Chromium IME candidates (eager=${eager})`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Native composition injection uses Chromium CDP')
    await page.goto('/')
    await page.evaluate(eager => {
      const input = document.createElement('input')
      input.id = 'unicode-ime'
      document.body.append(input)
      window.motherMask.bind(input, 'L-L', { eager, tokens: { L: /\p{L}/u } })
      input.focus()
    }, eager)
    const input = page.locator('#unicode-ime')
    const cdp = await page.context().newCDPSession(page)
    for (const text of ['n', 'ni', 'nihao']) {
      await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length })
      await expect(input).toHaveValue(text)
      expect(await input.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([text.length, text.length])
    }
    await cdp.send('Input.insertText', { text: '你' })
    const expected = eager ? '你-' : '你'
    await expect(input).toHaveValue(expected)
    expect(await input.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([expected.length, expected.length])
    await page.keyboard.insertText('𐐀')
    await expect(input).toHaveValue('你-𐐀')
    expect(await input.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([4, 4])
    await cdp.detach()
  })
}

test('multi-stage Unicode composition event ordering, cancellation and re-entry', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(() => {
    const input = document.createElement('input')
    document.body.append(input)
    const dispose = window.motherMask.bind(input, 'L-L', { tokens: { L: /\p{L}/u } })
    const states: Array<[string, number | null, number | null]> = []
    const snapshot = () => states.push([input.value, input.selectionStart, input.selectionEnd])
    for (const committed of ['', '你']) {
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
      for (const draft of ['n', 'ni', 'nihao']) {
        input.value = draft
        input.setSelectionRange(0, draft.length)
        input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: draft, isComposing: true }))
        snapshot()
      }
      input.value = committed
      input.setSelectionRange(committed.length, committed.length)
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: committed }))
      snapshot()
      // Some engines deliver a final input after compositionend.
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromComposition', data: committed }))
      snapshot()
    }
    dispose(); input.remove()
    return states
  })
  expect(result).toEqual([
    ['n', 0, 1], ['ni', 0, 2], ['nihao', 0, 5], ['', 0, 0], ['', 0, 0],
    ['n', 0, 1], ['ni', 0, 2], ['nihao', 0, 5], ['你-', 2, 2], ['你-', 2, 2],
  ])
})
